"""
Entrenamiento del modelo predictor Saber Pro con DATOS REALES.

Fuente: tabla `dataset_saber_pro_real` en PostgreSQL (cargada desde
        base-de-datos-para-proyecto-de-grado-Ing.csv, 736 filas, anonimo).

Target: derivado de `promedio_acumulado`:
        - Bajo  : promedio_acumulado < 3.0
        - Medio : 3.0 <= promedio_acumulado < 4.0
        - Alto  : promedio_acumulado >= 4.0
        (filas con promedio_acumulado NULL o 0 se excluyen).

Modelos entrenados:
  1. LogisticRegression (multinomial, class_weight balanced)
  2. GradientBoostingClassifier (100 arboles, depth 4)

Salidas:
  - trained_models/saberpro_model.pkl
  - models/desercion_metrics.json

Uso:
  cd "ml-training"
  .venv/Scripts/python.exe train_from_real.py
"""

from __future__ import annotations

import json
import os
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import psycopg2
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
TEST_SIZE = 0.2

# Features del dataset real que vamos a usar
NUMERIC_FEATURES = [
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
TARGET_COL = "target"
TARGET_MAPPING = {"Bajo": 0, "Medio": 1, "Alto": 2}
CLASS_NAMES = ["Bajo", "Medio", "Alto"]


# ---------------------------------------------------------------------------
# Conexion y carga
# ---------------------------------------------------------------------------

def load_env_from_backend() -> dict:
    """Lee DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD del .env del backend.

    Estructura esperada (monorepo):
      Modelo-predictivo-Saber-Pro/
        ml-training/train_from_real.py   (este script)
        backend/.env
    """
    candidates = [
        Path(__file__).resolve().parents[1] / "backend" / ".env",
    ]
    env_path = next((p for p in candidates if p.exists()), None)
    if env_path is None:
        raise FileNotFoundError(
            "No encuentro .env del backend. Probé: " + ", ".join(str(p) for p in candidates)
        )
    cfg: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        cfg[key.strip()] = value.strip()
    return cfg


def load_data_from_postgres(cfg: dict) -> pd.DataFrame:
    """Lee dataset_saber_pro_real desde PostgreSQL."""
    print("=" * 60)
    print("CARGANDO DATOS DESDE POSTGRESQL")
    print("=" * 60)
    conn = psycopg2.connect(
        host=cfg["DB_HOST"],
        port=cfg["DB_PORT"],
        dbname=cfg["DB_NAME"],
        user=cfg["DB_USER"],
        password=cfg["DB_PASSWORD"],
    )
    try:
        df = pd.read_sql_query("SELECT * FROM dataset_saber_pro_real", conn)
    finally:
        conn.close()
    print(f"Filas leidas: {len(df)}")
    print(f"Columnas ({len(df.columns)}): {df.columns.tolist()}")
    return df


# ---------------------------------------------------------------------------
# Target y features
# ---------------------------------------------------------------------------

def build_target(df: pd.DataFrame) -> pd.Series:
    """Deriva target categorico desde promedio_acumulado. NA para excluir.

    Excluimos promedio_acumulado = 0 (placeholders: sem-1 sin notas) ademas
    de NULL. Estos 109 registros no representan desempeno academico real.
    """
    promedio = pd.to_numeric(df["promedio_acumulado"], errors="coerce")
    target = pd.Series(pd.NA, index=df.index, dtype="object")
    valid = promedio.notna() & (promedio > 0)
    target[valid & (promedio < 3.0)] = "Bajo"
    target[valid & (promedio >= 3.0) & (promedio < 4.0)] = "Medio"
    target[valid & (promedio >= 4.0)] = "Alto"
    return target


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    """Devuelve solo las features que el modelo usara."""
    cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    return df[cols].copy()


# ---------------------------------------------------------------------------
# Preprocesamiento
# ---------------------------------------------------------------------------

def build_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_pipeline = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


# ---------------------------------------------------------------------------
# Entrenamiento y evaluacion
# ---------------------------------------------------------------------------

def train_and_evaluate(X: pd.DataFrame, y: pd.Series) -> dict:
    print("\n" + "=" * 60)
    print("DIVISION TRAIN/TEST")
    print("=" * 60)
    print(f"Total muestras: {len(X)}")
    print(f"Distribucion target:\n{y.value_counts().to_string()}\n")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")

    preprocessor = build_preprocessor()

    candidates = {
        "LogisticRegression": Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(
                max_iter=2000,
                class_weight="balanced",
                random_state=RANDOM_STATE,
            )),
        ]),
        "GradientBoostingClassifier": Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=4,
                random_state=RANDOM_STATE,
            )),
        ]),
    }

    print("\n" + "=" * 60)
    print("ENTRENAMIENTO Y EVALUACION")
    print("=" * 60)

    results: dict = {}
    fitted: dict = {}
    for name, pipeline in candidates.items():
        print(f"\n--- {name} ---")
        pipeline.fit(X_train, y_train)
        fitted[name] = pipeline

        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)
        y_test_int = y_test.map(TARGET_MAPPING)
        y_pred_int = pd.Series(y_pred).map(TARGET_MAPPING).to_numpy()
        # pipeline.classes_ viene en el orden en que el modelo aprendio las clases.
        # Mapeamos a TARGET_MAPPING (Bajo=0, Medio=1, Alto=2) para que las
        # columnas de y_proba_int correspondan a Bajo/Medio/Alto en ese orden.
        y_proba_int = np.zeros((len(y_test), 3))
        for i, label in enumerate(pipeline.classes_):
            y_proba_int[:, TARGET_MAPPING[label]] = y_proba[:, i]

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
        rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
        cm = confusion_matrix(y_test, y_pred, labels=CLASS_NAMES)
        report = classification_report(
            y_test, y_pred, labels=CLASS_NAMES, output_dict=True, zero_division=0,
        )

        # ROC AUC OvR weighted (usando el orden fijo de clases)
        try:
            roc_auc_ovr = roc_auc_score(
                y_test_int, y_proba_int,
                multi_class="ovr", average="weighted", labels=[0, 1, 2],
            )
        except ValueError:
            roc_auc_ovr = float("nan")

        print(f"  Accuracy : {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall   : {rec:.4f}")
        print(f"  F1       : {f1:.4f}")
        print(f"  ROC AUC  : {roc_auc_ovr:.4f}")
        print(f"  CM:\n{cm}")

        results[name] = {
            "accuracy": float(acc),
            "precision_weighted": float(prec),
            "recall_weighted": float(rec),
            "f1_weighted": float(f1),
            "confusion_matrix": cm.tolist(),
            "classification_report": report,
            "roc_auc_ovr_weighted": float(roc_auc_ovr) if not np.isnan(roc_auc_ovr) else None,
        }

    best_name = max(results, key=lambda k: results[k]["accuracy"])
    print("\n" + "=" * 60)
    print(f"MEJOR MODELO: {best_name} (accuracy={results[best_name]['accuracy']:.4f})")
    print("=" * 60)

    # Para analyze_results.py: tambien guardamos las predicciones del test
    best_pipeline = fitted[best_name]
    y_test_pred = best_pipeline.predict(X_test)
    y_test_proba = best_pipeline.predict_proba(X_test)
    test_predictions = {
        "y_test": y_test.astype(str).tolist(),
        "y_pred": [str(p) for p in y_test_pred],
        "y_proba": y_test_proba.tolist(),
        "classes": list(best_pipeline.classes_),
    }

    return {
        "results": results,
        "best_model_name": best_name,
        "best_pipeline": best_pipeline,
        "test_predictions": test_predictions,
    }


# ---------------------------------------------------------------------------
# Persistencia
# ---------------------------------------------------------------------------

def save_outputs(
    out: dict,
    metrics_path: Path,
    model_path: Path,
    n_total: int,
    n_used: int,
) -> None:
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    metrics = {
        "model_version": "real-data-v1",
        "source": "dataset_saber_pro_real (PostgreSQL)",
        "rows_total": n_total,
        "rows_used": n_used,
        "target_derivation": {
            "from_column": "promedio_acumulado",
            "Bajo": "< 3.0",
            "Medio": "3.0 <= x < 4.0",
            "Alto": ">= 4.0",
            "excluded": "NULL o = 0",
        },
        "features": {
            "numeric": NUMERIC_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
        },
        "best_model": out["best_model_name"],
        "best_model_metrics": out["results"][out["best_model_name"]],
        "all_models": out["results"],
        "test_predictions": out["test_predictions"],
    }
    metrics_path.write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"\nMetricas guardadas en: {metrics_path}")

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(out["best_pipeline"], model_path)
    print(f"Modelo guardado en: {model_path}")
    print(f"Tamano: {model_path.stat().st_size / 1024:.2f} KB")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    base_dir = Path(__file__).resolve().parent
    model_path = base_dir / "trained_models" / "saberpro_model.pkl"
    metrics_path = base_dir / "models" / "desercion_metrics.json"

    print("=" * 60)
    print("SISTEMA PREDICTOR SABER PRO - ENTRENAMIENTO (DATOS REALES)")
    print("=" * 60)
    print(f"Fecha: {pd.Timestamp.now().isoformat()}")
    print(f"Random state: {RANDOM_STATE}")

    cfg = load_env_from_backend()
    df = load_data_from_postgres(cfg)
    n_total = len(df)

    df = df.copy()
    df[TARGET_COL] = build_target(df)
    before_drop = len(df)
    df = df[df[TARGET_COL].notna()].reset_index(drop=True)
    n_used = len(df)
    print(f"\nFilas excluidas (target invalido): {before_drop - n_used}")
    print(f"Filas usadas para entrenamiento: {n_used}")

    X = select_features(df)
    y = df[TARGET_COL]

    out = train_and_evaluate(X, y)
    save_outputs(out, metrics_path, model_path, n_total, n_used)

    # Persistir muestra de background para SHAP. TreeExplainer en modo
    # 'interventional' la usa para estimar la varianza de las contribuciones.
    # Tomamos 50 filas del set de entrenamiento (no del test) con semilla fija
    # para que el background sea reproducible entre reentrenos.
    background_dir = base_dir / "data"
    background_dir.mkdir(parents=True, exist_ok=True)
    background_path = background_dir / "background_sample.pkl"
    X_train_bg, _, _, _ = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y,
    )
    bg = X_train_bg.sample(n=min(50, len(X_train_bg)), random_state=RANDOM_STATE)
    joblib.dump(bg, background_path)
    print(f"Background SHAP (muestra {len(bg)} filas) guardado en: {background_path}")

    print("\n" + "=" * 60)
    print("ENTRENAMIENTO COMPLETADO")
    print("=" * 60)
    bm = out["results"][out["best_model_name"]]
    print(f"Mejor modelo : {out['best_model_name']}")
    print(f"Accuracy     : {bm['accuracy']:.4f}")
    print(f"F1 weighted  : {bm['f1_weighted']:.4f}")
    print(f"ROC AUC OvR  : {bm['roc_auc_ovr_weighted']}")


if __name__ == "__main__":
    main()
