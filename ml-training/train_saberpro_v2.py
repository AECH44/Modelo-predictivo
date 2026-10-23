"""
Entrenamiento del modelo v2: PUNTUAJON SABER PRO estimado a partir de la
trayectoria academica universitaria.

DIFERENCIA CON LA VERSION 1 (train_from_real.py)
-------------------------------------------------
La v1 NO predecía un puntaje: predecía una BANDA (Bajo/Medio/Alto) derivada
del propio `promedio_acumulado` del estudiante, y el `puntaje_estimado` que
veia la interfaz era un remapeo de la probabilidad (ver
backend/src/predictor.js:probabilidadToScore). Eso hacia que:

  a) las metricas (accuracy 0.849 / AUC 0.957) midieran que tan bien se
     recuperaba un umbral sobre un promedio que las propias features
     reconstruyen, y no la capacidad de predecir un examen;
  b) el puntaje mostrado en pantalla no significara nada.

La v2 predice PUNTUAJES REALES de examen:

  target global = LA SUMA DE LAS TRES AREAS (matematicas + lectura critica +
                  ingles), que es la escala del Saber Pro: 0-300.

  NO se usa la columna `puntaje_global_saber11` del CSV. Esa columna esta en
  OTRA escala (un indice ponderado que llega a 409, con la relacion
  global ~ 1.46 * suma_areas + 29.8) y no es el puntaje del Saber Pro. Usarla
  como target hacia que el modelo predijera por encima de 300 y no tuviera
  nada que ver con el examen que se presenta al final de la carrera.

  Las tres areas si estan en su escala natural de 0-100 cada una.

  MUESTRAS = las filas con las TRES areas presentes (> 0) y con historial
  academico (`promedio_acumulado > 0`): 455 filas. Un 0 en un area puede
  ser un "no presento" (125 filas no tienen ninguna area), asi que se exige
  que las tres tengan dato.

Sobre el Saber Pro vs Saber 11: la cohorte no tiene todavia puntajes de
Saber Pro (es una prediccion). El unico examen con puntaje real en el
dataset es el Saber 11, que comparte con el Saber Pro la misma estructura y
los mismos dominios (matematicas, lectura critica, ingles). El modelo se
entrena en ese examen real y la prediccion se expresa en la escala del Saber
Pro (0-300), asumiendo que el comportamiento en la prueba es transferible.
Esa suposicion es la limitacion principal del modelo y se documenta en el
JSON de metricas.

Salidas:
  - trained_models/saberpro_model_v2.pkl
  - models/saberpro_v2_metrics.json
  - data/background_sample_v2.pkl (para SHAP)

Uso:
  cd ml-training
  ../ml-service/.venv/Scripts/python.exe train_saberpro_v2.py
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import psycopg2
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import (
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
N_SPLITS = 5
N_REPEATS = 3
MODEL_VERSION = "saberpro-v2"

# ---------------------------------------------------------------------------
# Features
#
# La lista debe coincidir EXACTAMENTE con lo que el backend envia al
# servicio (backend/src/predictor.js:profileToMlFeatures) y con lo que
# `student_profiles` tiene. Si se agrega o quita una feature aqui, hay que
# tocarla en los tres lados.
#
# `promedio_acumulado` SI entra: en la v1 quedaba fuera porque el target era
# una funcion deterministica de el (fuga). Ahora el target es un puntaje de
# examen, asi que el promedio acumulado es la feature mas informativa y
# legitima (r = 0.33 con el puntaje real).
# ---------------------------------------------------------------------------
NUMERIC_FEATURES = [
    "promedio_acumulado",
    "promedio_materias_basicas",
    "promedio_ingenieria",
    "promedio_programacion",
    "promedio_matematica_estadistica",
    "asignaturas_reprobadas",
    "porcentaje_avance",
    "semestre_actual",
    "estrato",
    "creditos_aprobados",
    "asignaturas_aprobadas",
    "edad",
]
CATEGORICAL_FEATURES = ["genero", "promedio_ingles_nivel"]

# Las tres areas del Saber 11/Saber Pro (escala 0-100 cada una).
AREA_TARGETS = {
    "matematicas": "puntaje_matematicas_saber11",
    "lectura_critica": "puntaje_lectura_critica_saber11",
    "ingles": "puntaje_ingles_saber11",
}
# El puntaje global del Saber Pro es la SUMA de las tres areas: 0-300.
#
# OJO: la columna `puntaje_global_saber11` del CSV NO se usa. Esta en otra
# escala (indice ponderado, llega a 409) y usarla como target producia
# predicciones por encima de 300, sin relacion con el examen que se presenta
# al final de la carrera.
GLOBAL_TARGET_CSV = "puntaje_global_saber11"
ESCALA_GLOBAL_MAX = 300


# ---------------------------------------------------------------------------
# Conexion y carga
# ---------------------------------------------------------------------------

def load_env_from_backend() -> dict:
    """Lee DB_* del .env del backend."""
    candidates = [Path(__file__).resolve().parents[1] / "backend" / ".env"]
    env_path = next((p for p in candidates if p.exists()), None)
    if env_path is None:
        raise FileNotFoundError(
            "No encuentro .env del backend. Probé: " + ", ".join(str(p) for p in candidates)
        )
    cfg: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        cfg[key.strip()] = value.strip()
    return cfg


def load_data_from_postgres(cfg: dict) -> pd.DataFrame:
    print("=" * 62)
    print("CARGANDO DATOS DESDE POSTGRESQL")
    print("=" * 62)
    conn = psycopg2.connect(
        host=cfg["DB_HOST"], port=cfg["DB_PORT"], dbname=cfg["DB_NAME"],
        user=cfg["DB_USER"], password=cfg["DB_PASSWORD"],
    )
    try:
        df = pd.read_sql_query("SELECT * FROM dataset_saber_pro_real", conn)
    finally:
        conn.close()
    print(f"Filas leidas: {len(df)}")
    return df


# ---------------------------------------------------------------------------
# Preparacion
# ---------------------------------------------------------------------------

def prepare(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """Filtra a quienes tienen resultado de examen completo y separa X de los targets."""
    total = len(df)
    stats = {"filas_totales": total}

    # Las tres areas deben tener dato (> 0). Un 0 puede ser "no presento":
    # 125 filas del dataset no tienen ninguna area y 214 tienen areas
    # incompletas, asi que no sirven como target.
    areas_num = {
        nombre: pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        for nombre, col in AREA_TARGETS.items()
    }
    con_areas = (
        (areas_num["matematicas"] > 0)
        & (areas_num["lectura_critica"] > 0)
        & (areas_num["ingles"] > 0)
    )
    stats["con_las_3_areas"] = int(con_areas.sum())
    stats["sin_areas_completas"] = total - int(con_areas.sum())

    usable = df[con_areas].copy()

    # Sin historial academico no hay nada que predecir (primer semestre).
    con_historial = pd.to_numeric(usable["promedio_acumulado"], errors="coerce").fillna(0) > 0
    stats["con_historial_academico"] = int(con_historial.sum())
    stats["excluidas_sin_historial"] = stats["con_las_3_areas"] - int(con_historial.sum())
    usable = usable[con_historial].copy()

    cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    X = usable[cols].copy()
    for c in NUMERIC_FEATURES:
        X[c] = pd.to_numeric(X[c], errors="coerce")
    X["genero"] = X["genero"].astype("object")
    X["promedio_ingles_nivel"] = X["promedio_ingles_nivel"].astype("object")

    y = pd.DataFrame(index=usable.index)
    suma = pd.Series(0.0, index=usable.index)
    for nombre, col in AREA_TARGETS.items():
        valores = pd.to_numeric(usable[col], errors="coerce").fillna(0.0)
        y[nombre] = valores
        suma += valores
    # El global del Saber Pro es la suma de las tres areas (escala 0-300).
    y["global"] = suma

    # Dato de contexto: como se relaciona la columna del CSV con la suma.
    csv_global = pd.to_numeric(usable[GLOBAL_TARGET_CSV], errors="coerce").fillna(0.0)
    if csv_global.notna().any():
        stats["csv_global_relacion_con_suma"] = {
            "corr": float(np.corrcoef(csv_global, suma)[0, 1]),
            "nota": (
                "La columna puntaje_global_saber11 del CSV esta en otra escala "
                "(indice ponderado ~1.46x la suma + 29.8, max 409). NO se usa "
                "como target: el Saber Pro se puntua sobre 300."
            ),
        }

    return X.reset_index(drop=True), y.reset_index(drop=True), stats


# ---------------------------------------------------------------------------
# Preprocesamiento y modelos
# ---------------------------------------------------------------------------

def build_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", numeric_pipeline, NUMERIC_FEATURES),
        ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
    ], remainder="drop")


def build_candidates() -> dict:
    """Modelos candidatos para regresion. Se comparan por MAE en CV.

    Configuracion elegida tras la busqueda de `experimento_v2.py`
    (RandomForest con max_depth=6 y min_samples_leaf=10 gana; las features
    derivadas NO aportan y se descartaron para no anadir complejidad).
    """
    return {
        "RandomForestRegressor": Pipeline([
            ("preprocessor", build_preprocessor()),
            ("model", RandomForestRegressor(
                n_estimators=600, max_depth=6, min_samples_leaf=10,
                n_jobs=-1, random_state=RANDOM_STATE,
            )),
        ]),
        "RandomForestProfundo": Pipeline([
            ("preprocessor", build_preprocessor()),
            ("model", RandomForestRegressor(
                n_estimators=400, max_depth=8, min_samples_leaf=5,
                n_jobs=-1, random_state=RANDOM_STATE,
            )),
        ]),
        "ExtraTreesRegressor": Pipeline([
            ("preprocessor", build_preprocessor()),
            ("model", ExtraTreesRegressor(
                n_estimators=600, max_depth=10, min_samples_leaf=5,
                n_jobs=-1, random_state=RANDOM_STATE,
            )),
        ]),
        "GradientBoostingRegressor": Pipeline([
            ("preprocessor", build_preprocessor()),
            ("model", GradientBoostingRegressor(
                n_estimators=300, learning_rate=0.05, max_depth=3,
                subsample=0.9, random_state=RANDOM_STATE,
            )),
        ]),
        "Ridge": Pipeline([
            ("preprocessor", build_preprocessor()),
            ("model", Ridge(alpha=10.0, random_state=RANDOM_STATE)),
        ]),
        "DummyMedia": Pipeline([
            ("preprocessor", build_preprocessor()),
            ("model", DummyRegressor(strategy="mean")),
        ]),
    }


# ---------------------------------------------------------------------------
# Evaluacion
# ---------------------------------------------------------------------------

def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
    }


def evaluate_candidate(template, X, y, n_splits=N_SPLITS, n_repeats=N_REPEATS,
                       random_state=RANDOM_STATE) -> tuple[dict, np.ndarray]:
    """CV repetida K-Fold hecha a mano.

    `cross_val_predict` no admite RepeatedKFold (exige particiones), asi que
    se recorre cada repeat por separado. Se reporta la media de las metricas
    entre repeats con su desviacion, que es mas honesto que un unico split.
    """
    y_arr = np.asarray(y)
    X_arr = X.reset_index(drop=True)
    repeat_metrics: list[dict] = []
    oof_per_repeat: list[np.ndarray] = []

    for r in range(n_repeats):
        kf = KFold(n_splits=n_splits, shuffle=True, random_state=random_state + r)
        oof = np.zeros(len(y_arr), dtype=float)
        for train_idx, test_idx in kf.split(X_arr):
            pipeline = clone(template)
            pipeline.fit(X_arr.iloc[train_idx], y_arr[train_idx])
            oof[test_idx] = pipeline.predict(X_arr.iloc[test_idx])
        repeat_metrics.append(metrics(y_arr, oof))
        oof_per_repeat.append(oof)

    agg = {k: float(np.mean([m[k] for m in repeat_metrics])) for k in repeat_metrics[0]}
    agg["mae_std"] = float(np.std([m["mae"] for m in repeat_metrics]))
    agg["rmse_std"] = float(np.std([m["rmse"] for m in repeat_metrics]))
    agg["mae_por_repeat"] = [round(m["mae"], 3) for m in repeat_metrics]
    oof_mean = np.mean(oof_per_repeat, axis=0)
    return agg, oof_mean


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    model_path = base_dir / "trained_models" / "saberpro_model_v2.pkl"
    metrics_path = base_dir / "models" / "saberpro_v2_metrics.json"

    print("=" * 62)
    print("MODELO SABER PRO v2 - PUNTUAJE REAL (REGRESION)")
    print("=" * 62)
    print(f"Fecha: {pd.Timestamp.now().isoformat()}")
    print(f"Random state: {RANDOM_STATE} | CV: RepeatedKFold({N_SPLITS} x {N_REPEATS})")

    cfg = load_env_from_backend()
    df = load_data_from_postgres(cfg)
    X, y, stats = prepare(df)

    print("\n" + "=" * 62)
    print("MUESTRA")
    print("=" * 62)
    for k, v in stats.items():
        print(f"  {k:32s} {v}")
    print(f"\n  Filas de entrenamiento: {len(X)}")
    print("\n  Distribucion de los targets:")
    for col in list(AREA_TARGETS) + ["global"]:
        s = y[col]
        print(f"    {col:18s} n={len(s):4d} media={s.mean():7.2f} "
              f"mediana={s.median():7.2f} min={s.min():6.1f} max={s.max():6.1f}")

    cv = None  # la CV repetida se hace dentro de evaluate_candidate

    # -----------------------------------------------------------------------
    # 1) Modelo por area + global, comparando candidatos por MAE.
    # -----------------------------------------------------------------------
    candidates = build_candidates()
    results: dict[str, dict] = {}
    oof_predictions: dict[str, dict[str, np.ndarray]] = {}

    for target_col in list(AREA_TARGETS) + ["global"]:
        print("\n" + "=" * 62)
        print(f"TARGET: {target_col}")
        print("=" * 62)
        results[target_col] = {}
        oof_predictions[target_col] = {}
        y_series = y[target_col]

        for name in candidates:
            m, pred = evaluate_candidate(candidates[name], X, y_series)
            results[target_col][name] = m
            oof_predictions[target_col][name] = pred
            print(f"  {name:28s} MAE={m['mae']:7.2f}  RMSE={m['rmse']:7.2f}  "
                  f"R2={m['r2']:6.3f}  (MAE std {m['mae_std']:.2f})")

        best = min(results[target_col], key=lambda k: results[target_col][k]["mae"])
        base = results[target_col]["DummyMedia"]
        print(f"  --> mejor: {best} (MAE {results[target_col][best]['mae']:.2f} "
              f"vs linea base {base['mae']:.2f}, "
              f"mejora {100 * (1 - results[target_col][best]['mae'] / base['mae']):.1f}%)")

    # -----------------------------------------------------------------------
    # 2) El puntaje global: directo vs derivado de las areas.
    #
    # El Saber Pro se puntua sumando las tres areas (0-300). Hay tres formas
    # de obtener el global y se comparan:
    #
    #   a) la suma simple de las areas predichas (coherente con lo que ve el
    #      estudiante: mat + lect + ingl = el total que se muestra);
    #   b) una formula lineal ajustada sobre esa suma (corrige la regresion
    #      a la media de los modelos de area, pero el total ya no coincide
    #      con la suma de las areas mostradas);
    #   c) un modelo entrenado directo sobre el total.
    #
    # Se elige (a) salvo que sea claramente peor: la coherencia de lo que se
    # muestra al estudiante vale mas que una decima de punto de MAE.
    # -----------------------------------------------------------------------
    print("\n" + "=" * 62)
    print("PUNTAJE GLOBAL: suma simple vs formula ajustada vs modelo directo")
    print("=" * 62)
    best_por_area = {
        t: min(results[t], key=lambda k: results[t][k]["mae"]) for t in AREA_TARGETS
    }
    suma_areas = sum(oof_predictions[t][best_por_area[t]] for t in AREA_TARGETS)
    y_global = y["global"].to_numpy()

    m_suma = metrics(y_global, suma_areas)
    coef = np.polyfit(suma_areas, y_global, 1)
    m_derivado = metrics(y_global, coef[0] * suma_areas + coef[1])
    best_global = min(results["global"], key=lambda k: results["global"][k]["mae"])
    m_directo = results["global"][best_global]

    print(f"  Suma de las areas:        MAE={m_suma['mae']:6.2f} RMSE={m_suma['rmse']:6.2f} R2={m_suma['r2']:6.3f}")
    print(f"  Formula ajustada ({coef[0]:.3f}x + {coef[1]:.1f}): MAE={m_derivado['mae']:6.2f} RMSE={m_derivado['rmse']:6.2f} R2={m_derivado['r2']:6.3f}")
    print(f"  Modelo directo ({best_global}): MAE={m_directo['mae']:6.2f} RMSE={m_directo['rmse']:6.2f} R2={m_directo['r2']:6.3f}")

    mejor_mae = min(m_suma["mae"], m_derivado["mae"], m_directo["mae"])
    if m_suma["mae"] <= mejor_mae * 1.05:
        modo_global = "suma_de_areas"
        print("  --> se usa la SUMA de las areas (coherente con lo que ve el estudiante)")
    elif m_derivado["mae"] <= mejor_mae * 1.05:
        modo_global = "derivado_de_areas"
        print("  --> se usa la FORMULA ajustada sobre la suma de las areas")
    else:
        modo_global = "modelo_directo"
        print("  --> se usa el modelo DIRECTO del global")

    # -----------------------------------------------------------------------
    # 2b) Umbrales de banda sobre el puntaje global (escala 0-300).
    # -----------------------------------------------------------------------
    # La banda (bajo/medio/alto) deja de ser el target: pasa a ser una capa de
    # comunicacion sobre el puntaje. Los umbrales se toman de la distribucion
    # observada en la cohorte (percentiles 30 y 70), para que el corte sea
    # reproducible y no una constante inventada.
    p30 = float(y["global"].quantile(0.30))
    p70 = float(y["global"].quantile(0.70))
    print("\n" + "=" * 62)
    print("BANDAS sobre el puntaje global (escala Saber Pro 0-300)")
    print("=" * 62)
    print(f"  bajo : global < {p30:.1f}   (percentil 30 de la cohorte)")
    print(f"  medio: {p30:.1f} <= global < {p70:.1f}")
    print(f"  alto : global >= {p70:.1f}  (percentil 70)")
    print(f"  distribucion resultante: "
          f"bajo={(y['global'] < p30).sum()} / "
          f"medio={((y['global'] >= p30) & (y['global'] < p70)).sum()} / "
          f"alto={(y['global'] >= p70).sum()}")
    print(f"  el target global es la SUMA de las 3 areas (0-300); "
          f"maximo observado en la muestra: {y['global'].max():.0f}")

    # El global ES la suma de las areas: no hay formula que ajustar. Se
    # documenta la relacion con la columna del CSV solo como contexto.
    coef_real = np.polyfit(
        (y["matematicas"] + y["lectura_critica"] + y["ingles"]).to_numpy(),
        y["global"].to_numpy(), 1,
    )
    r2_real = float(np.corrcoef(
        (y["matematicas"] + y["lectura_critica"] + y["ingles"]).to_numpy(),
        y["global"].to_numpy(),
    )[0, 1] ** 2)
    print(f"  (control) suma_areas vs target: pendiente={coef_real[0]:.4f} "
          f"intercepto={coef_real[1]:.2f} R2={r2_real:.3f} -> deben ser 1.0 y 0.0")

    # -----------------------------------------------------------------------
    # 3) Ajuste final con todos los datos.
    # -----------------------------------------------------------------------
    print("\n" + "=" * 62)
    print("AJUSTE FINAL")
    print("=" * 62)
    fitted = {}
    for target_col in list(AREA_TARGETS):
        best = min(results[target_col], key=lambda k: results[target_col][k]["mae"])
        # IMPORTANTE: `clone` y no reutilizar el objeto de `candidates`. Sin
        # esto, dos targets que ganen con el mismo algoritmo (o el global con
        # una de las areas) comparten la MISMA instancia de Pipeline: el
        # ultimo fit sobrescribe al anterior y el artefacto guardado guarda
        # un unico modelo para varias columnas.
        pipeline = clone(candidates[best])
        pipeline.fit(X, y[target_col])
        fitted[target_col] = {"pipeline": pipeline, "model_name": best}
        print(f"  {target_col:18s} <- {best}")

    if modo_global == "modelo_directo":
        pipeline = clone(candidates[best_global])
        pipeline.fit(X, y["global"])
        fitted["global"] = {"pipeline": pipeline, "model_name": best_global}
        print(f"  {'global':18s} <- {best_global}")

    # -----------------------------------------------------------------------
    # 4) Diagnostico de residuos por edad (la muestra tiene sesgo de edad).
    # -----------------------------------------------------------------------
    print("\n" + "=" * 62)
    print("DIAGNOSTICO: residuo por edad (sesgo de seleccion de la muestra)")
    print("=" * 62)
    pred_global = oof_predictions["global"][min(
        results["global"], key=lambda k: results["global"][k]["mae"])]
    resid = y["global"].to_numpy() - pred_global
    diag = []
    for lo, hi in [(0, 22), (22, 25), (25, 30), (30, 100)]:
        mask = (X["edad"] >= lo) & (X["edad"] < hi)
        if mask.sum() == 0:
            continue
        fila = {
            "rango_edad": f"[{lo},{hi})",
            "n": int(mask.sum()),
            "mae_global": float(np.mean(np.abs(resid[mask]))),
            "residuo_medio": float(np.mean(resid[mask])),
            "error_medio_pct": float(
                100 * np.mean((pred_global[mask] - y["global"].to_numpy()[mask])
                              / np.maximum(y["global"].to_numpy()[mask], 1))
            ),
        }
        diag.append(fila)
        print(f"  {fila['rango_edad']:>10s}  n={fila['n']:3d}  MAE={fila['mae_global']:6.2f}  "
              f"residuo medio={fila['residuo_medio']:7.2f}  error medio={fila['error_medio_pct']:6.2f}%")

    edad_min = float(X["edad"].min())
    edad_max = float(X["edad"].max())

    # -----------------------------------------------------------------------
    # 5) Persistencia.
    # -----------------------------------------------------------------------
    # -----------------------------------------------------------------------
    # 5b) Verificacion del artefacto antes de guardarlo.
    #
    # Cada target debe tener su propia instancia de Pipeline y cada area debe
    # predecir dentro del rango observado de su target. Esta comprobacion
    # existe porque un bug anterior (reutilizar el mismo objeto Pipeline para
    # varios targets) dejo guardado un unico modelo bajo varias claves: el
    # modelo de matematicas devolvia el puntaje global y lectura e ingles
    # devolvian exactamente el mismo numero.
    # -----------------------------------------------------------------------
    print("\n" + "=" * 62)
    print("VERIFICACION DEL ARTEFACTO")
    print("=" * 62)
    ids_pipeline = {}
    for clave, info in fitted.items():
        ids_pipeline[clave] = id(info["pipeline"])
    if len(set(ids_pipeline.values())) != len(ids_pipeline):
        raise RuntimeError(
            f"Dos targets comparten la misma instancia de Pipeline: {ids_pipeline}. "
            "Se debe usar clone() en cada ajuste."
        )
    print(f"  {len(ids_pipeline)} pipelines distintos: OK")

    muestra = X.head(3)
    for target_col in list(AREA_TARGETS):
        pred = fitted[target_col]["pipeline"].predict(muestra)
        lo = float(y[target_col].min())
        hi = float(y[target_col].max())
        if pred.min() < lo - 1e-6 or pred.max() > hi + 1e-6:
            raise RuntimeError(
                f"El modelo de '{target_col}' predice fuera del rango observado "
                f"[{lo}, {hi}]: {pred.tolist()}"
            )
        print(f"  {target_col:18s} pred={np.round(pred, 1).tolist()} (rango target [{lo}, {hi}]) OK")

    pred_global_chk = None
    if "global" in fitted:
        pred_global_chk = fitted["global"]["pipeline"].predict(muestra)
    else:
        # Modo "suma de areas": el global se reconstruye en el servicio.
        pred_global_chk = sum(
            fitted[t]["pipeline"].predict(muestra) for t in AREA_TARGETS
        )
    lo_g = float(y["global"].min())
    hi_g = float(y["global"].max())
    if pred_global_chk.min() < lo_g - 1e-6 or pred_global_chk.max() > hi_g + 1e-6:
        raise RuntimeError(
            f"El modelo global predice fuera del rango observado [{lo_g}, {hi_g}]: "
            f"{pred_global_chk.tolist()}"
        )
    if pred_global_chk.max() > ESCALA_GLOBAL_MAX + 1e-6:
        raise RuntimeError(
            f"El global predicho ({pred_global_chk.max():.1f}) supera la escala "
            f"del Saber Pro ({ESCALA_GLOBAL_MAX})."
        )
    print(f"  {'global':18s} pred={np.round(pred_global_chk, 1).tolist()} "
          f"(rango target [{lo_g}, {hi_g}], escala Saber Pro 0-{ESCALA_GLOBAL_MAX}) OK")

    # Coherencia: si el global se muestra como la suma de las areas, deben
    # coincidir. Es lo que el estudiante va a ver en pantalla.
    if modo_global == "suma_de_areas":
        for i in range(len(muestra)):
            suma = sum(fitted[t]["pipeline"].predict(muestra.iloc[[i]])[0]
                       for t in AREA_TARGETS)
            if abs(suma - pred_global_chk[i]) > 1e-6:
                raise RuntimeError("El global no coincide con la suma de las areas.")

    model_path.parent.mkdir(parents=True, exist_ok=True)
    # Margen de error empirico del global (MAE en CV): se usa como intervalo de
    # prediccion en el servicio, porque el modelo NO da un intervalo nativo.
    mae_global = results["global"][min(results["global"], key=lambda k: results["global"][k]["mae"])]["mae"]

    artefacto = {
        "model_version": MODEL_VERSION,
        "tipo": "regresion_multisalida_areas",
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "areas": {k: v["pipeline"] for k, v in fitted.items() if k != "global"},
        "area_models": {k: v["model_name"] for k, v in fitted.items() if k != "global"},
        "global_modo": modo_global,
        "global_formula_ajustada": {"a": float(coef[0]), "b": float(coef[1])},
        "global_formula_predichas": {"a": float(coef[0]), "b": float(coef[1])},
        "escala_global_max": ESCALA_GLOBAL_MAX,
        "global_pipeline": fitted.get("global", {}).get("pipeline"),
        "global_model_name": fitted.get("global", {}).get("model_name"),
        "bandas": {"bajo_max": p30, "medio_max": p70},
        "margen_error_global": float(mae_global),
        "entrenado_en": pd.Timestamp.now().isoformat(),
        "n_entrenamiento": int(len(X)),
        "edad_entrenamiento": {"min": edad_min, "max": edad_max},
        "nota_metodologica": (
            "El target es el puntaje real del Saber 11 expresado en la escala del "
            "Saber Pro (suma de las tres areas, 0-300): el Saber 11 es el "
            "antecedente directo del Saber Pro, con los mismos tres dominios. "
            "No hay puntajes de Saber Pro en la cohorte porque el examen aun no "
            "se ha presentado: es una prediccion a futuro, y se supone que el "
            "desempeno en la prueba es transferible."
        ),
    }
    joblib.dump(artefacto, model_path)
    print(f"\nModelo guardado en: {model_path} ({model_path.stat().st_size / 1024:.2f} KB)")

    metricas = {
        "model_version": MODEL_VERSION,
        "tipo": "regresion (puntaje real de examen)",
        "source": "dataset_saber_pro_real (PostgreSQL)",
        "target": {
            "areas": AREA_TARGETS,
            "global": "suma de las tres areas (matematicas + lectura_critica + ingles)",
            "escala": "areas 0-100 cada una; global 0-300 (escala del Saber Pro)",
            "filtro": "las 3 areas con dato (> 0) y promedio_acumulado > 0",
            "columna_del_csv_no_usada": {
                "columna": GLOBAL_TARGET_CSV,
                "motivo": (
                    "Esta en otra escala: es un indice ponderado (~1.46 * suma_areas + 29.8, "
                    "max 409) y no el puntaje del Saber Pro (0-300). Usarla como target "
                    "hacia predicciones por encima de 300."
                ),
            },
        },
        "muestra": stats,
        "features": {"numeric": NUMERIC_FEATURES, "categorical": CATEGORICAL_FEATURES},
        "cv": {"splits": N_SPLITS, "repeats": N_REPEATS, "random_state": RANDOM_STATE},
        "resultados_por_target": results,
        "global_derivado_de_areas": {
            "formula": {"a": float(coef[0]), "b": float(coef[1])},
            **m_derivado,
        },
        "global_suma_simple_de_areas": m_suma,
        "global_formula_sobre_areas_reales": {
            "a": float(coef_real[0]), "b": float(coef_real[1]), "r2": r2_real,
            "nota": "Control: debe dar 1.0 y 0.0 (el target ES la suma de las areas).",
        },
        "bandas_puntaje_global": {
            "bajo_max": p30, "medio_max": p70,
            "criterio": "percentiles 30 y 70 de la distribucion de quienes presentaron",
        },
        "margen_error_global_mae": float(mae_global),
        "modo_global": modo_global,
        "diagnostico_residuos_por_edad": diag,
        "edad_entrenamiento": {"min": edad_min, "max": edad_max},
        "nota_metodologica": artefacto["nota_metodologica"],
        "advertencias": [
            "La muestra de entrenamiento (quienes presentaron el examen) tiene "
            f"edad media {float(X['edad'].mean()):.1f} y rango [{edad_min:.0f}, {edad_max:.0f}]; "
            "las predicciones para estudiantes fuera de ese rango son extrapolaciones.",
            "El R2 del global es bajo: la trayectoria academica explica solo una parte "
            "del rendimiento en el examen. El modelo NO debe leerse como un pronostico "
            "determinista del puntaje.",
            "El puntaje estimado es una expectativa; debe mostrarse con su margen de error.",
            "La escala es la del Saber Pro (0-300): el global es la suma de las tres "
            "areas. La columna puntaje_global_saber11 del CSV esta en otra escala y "
            "NO se uso como target.",
        ],
    }
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.write_text(json.dumps(metricas, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Metricas guardadas en: {metrics_path}")

    # Background para SHAP (regresion: TreeExplainer si funciona con multiclass?).
    bg_dir = base_dir / "data"
    bg_dir.mkdir(parents=True, exist_ok=True)
    bg_path = bg_dir / "background_sample_v2.pkl"
    joblib.dump(X.sample(n=min(50, len(X)), random_state=RANDOM_STATE), bg_path)
    print(f"Background SHAP guardado en: {bg_path}")

    print("\n" + "=" * 62)
    print("ENTRENAMIENTO v2 COMPLETADO")
    print("=" * 62)
    for target_col in list(AREA_TARGETS) + ["global"]:
        best = min(results[target_col], key=lambda k: results[target_col][k]["mae"])
        m = results[target_col][best]
        base = results[target_col]["DummyMedia"]["mae"]
        print(f"  {target_col:18s} {best:26s} MAE={m['mae']:6.2f} RMSE={m['rmse']:6.2f} "
              f"R2={m['r2']:6.3f} (linea base MAE={base:.2f})")


if __name__ == "__main__":
    main()
