"""
Experimento: buscar la mejor configuracion para el modelo v2 (puntaje real).

Compara:
  - juegos de features (base / base+derivadas / sin ingles)
  - algoritmos con busqueda de hiperparametros

No guarda nada: solo imprime resultados. Sirve para decidir la configuracion
final que se bakea en train_saberpro_v2.py.
"""
from __future__ import annotations

import itertools
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import (
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from train_saberpro_v2 import (  # noqa: E402
    NUMERIC_FEATURES, CATEGORICAL_FEATURES, load_env_from_backend,
    load_data_from_postgres, prepare,
)

RANDOM_STATE = 42
N_SPLITS, N_REPEATS = 5, 3


def add_engineered(X: pd.DataFrame) -> pd.DataFrame:
    """Features derivadas, todas calculables desde `student_profiles`."""
    X = X.copy()
    aprob = X["asignaturas_aprobadas"].fillna(0).clip(lower=1)
    sem = X["semestre_actual"].fillna(1).clip(lower=1)
    X["tasa_reprobadas"] = X["asignaturas_reprobadas"] / aprob
    X["creditos_por_semestre"] = X["creditos_aprobados"] / sem
    X["brecha_ingenieria_basicas"] = (
        X["promedio_ingenieria"] - X["promedio_materias_basicas"]
    )
    X["avance_esperado"] = X["porcentaje_avance"] - sem * 10.0
    X["promedio_ponderado"] = (
        X["promedio_acumulado"] * 0.5
        + X["promedio_ingenieria"] * 0.3
        + X["promedio_materias_basicas"] * 0.2
    )
    return X


ENGINEERED = [
    "tasa_reprobadas", "creditos_por_semestre", "brecha_ingenieria_basicas",
    "avance_esperado", "promedio_ponderado",
]


def preprocessor(num_cols, cat_cols):
    return ColumnTransformer([
        ("num", Pipeline([("imputer", SimpleImputer(strategy="median")),
                          ("scaler", StandardScaler())]), num_cols),
        ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")),
                          ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]),
         cat_cols),
    ], remainder="drop")


def cv_eval(template, X, y, n_splits=N_SPLITS, n_repeats=N_REPEATS):
    y = np.asarray(y)
    maes, rmses, r2s = [], [], []
    for r in range(n_repeats):
        kf = KFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE + r)
        oof = np.zeros(len(y))
        for tr, te in kf.split(X):
            p = clone(template)
            p.fit(X.iloc[tr], y[tr])
            oof[te] = p.predict(X.iloc[te])
        maes.append(mean_absolute_error(y, oof))
        rmses.append(np.sqrt(mean_squared_error(y, oof)))
        r2s.append(r2_score(y, oof))
    return float(np.mean(maes)), float(np.mean(rmses)), float(np.mean(r2s))


def main():
    cfg = load_env_from_backend()
    df = load_data_from_postgres(cfg)
    X, y, stats = prepare(df)
    X = add_engineered(X)

    y_global = y["global"].to_numpy()

    feature_sets = {
        "base13": (NUMERIC_FEATURES, CATEGORICAL_FEATURES),
        "base+derivadas": (NUMERIC_FEATURES + ENGINEERED, CATEGORICAL_FEATURES),
        "base+derivadas-sin_ingles": (
            NUMERIC_FEATURES + ENGINEERED,
            [c for c in CATEGORICAL_FEATURES if c != "promedio_ingles_nivel"],
        ),
    }

    print("\n" + "=" * 78)
    print("BUSQUEDA DE CONFIGURACION (target = global)")
    print("=" * 78)

    results = []
    for fs_name, (num, cat) in feature_sets.items():
        Xs = X[num + cat]
        pre = preprocessor(num, cat)
        configs = {
            "RF d8_leaf5": Pipeline([("p", pre), ("m", RandomForestRegressor(
                n_estimators=400, max_depth=8, min_samples_leaf=5, n_jobs=-1,
                random_state=RANDOM_STATE))]),
            "RF d6_leaf10": Pipeline([("p", pre), ("m", RandomForestRegressor(
                n_estimators=600, max_depth=6, min_samples_leaf=10, n_jobs=-1,
                random_state=RANDOM_STATE))]),
            "RF dNone_leaf5": Pipeline([("p", pre), ("m", RandomForestRegressor(
                n_estimators=600, max_depth=None, min_samples_leaf=5, n_jobs=-1,
                random_state=RANDOM_STATE))]),
            "ExtraTrees d10": Pipeline([("p", pre), ("m", ExtraTreesRegressor(
                n_estimators=600, max_depth=10, min_samples_leaf=5, n_jobs=-1,
                random_state=RANDOM_STATE))]),
            "GBR d3_lr05": Pipeline([("p", pre), ("m", GradientBoostingRegressor(
                n_estimators=400, learning_rate=0.05, max_depth=3, subsample=0.9,
                random_state=RANDOM_STATE))]),
            "HistGBR": Pipeline([("p", pre), ("m", HistGradientBoostingRegressor(
                max_iter=300, learning_rate=0.05, max_depth=3, l2_regularization=1.0,
                random_state=RANDOM_STATE))]),
            "Ridge a10": Pipeline([("p", pre), ("m", Ridge(alpha=10.0))]),
            "Dummy": Pipeline([("p", pre), ("m", DummyRegressor(strategy="mean"))]),
        }
        for cfg_name, template in configs.items():
            mae, rmse, r2 = cv_eval(template, Xs, y_global)
            results.append((mae, rmse, r2, fs_name, cfg_name))
            print(f"  {fs_name:26s} {cfg_name:20s} MAE={mae:7.2f} RMSE={rmse:7.2f} R2={r2:6.3f}")

    results.sort()
    print("\n" + "=" * 78)
    print("TOP 8")
    print("=" * 78)
    for mae, rmse, r2, fs, cfg_name in results[:8]:
        print(f"  MAE={mae:7.2f} RMSE={rmse:7.2f} R2={r2:6.3f}  {fs} / {cfg_name}")

    best_fs, best_cfg = results[0][3], results[0][4]
    print(f"\nMEJOR: {best_fs} / {best_cfg}")

    # La misma configuracion, aplicada a cada area.
    num, cat = feature_sets[best_fs]
    print("\n" + "=" * 78)
    print(f"CONFIG FINAL ({best_fs} / {best_cfg}) por target")
    print("=" * 78)
    pre = preprocessor(num, cat)
    if best_cfg.startswith("RF d8"):
        model = RandomForestRegressor(n_estimators=400, max_depth=8, min_samples_leaf=5,
                                      n_jobs=-1, random_state=RANDOM_STATE)
    elif best_cfg.startswith("RF d6"):
        model = RandomForestRegressor(n_estimators=600, max_depth=6, min_samples_leaf=10,
                                      n_jobs=-1, random_state=RANDOM_STATE)
    elif best_cfg.startswith("RF dNone"):
        model = RandomForestRegressor(n_estimators=600, max_depth=None, min_samples_leaf=5,
                                      n_jobs=-1, random_state=RANDOM_STATE)
    elif best_cfg.startswith("ExtraTrees"):
        model = ExtraTreesRegressor(n_estimators=600, max_depth=10, min_samples_leaf=5,
                                    n_jobs=-1, random_state=RANDOM_STATE)
    elif best_cfg.startswith("GBR"):
        model = GradientBoostingRegressor(n_estimators=400, learning_rate=0.05, max_depth=3,
                                          subsample=0.9, random_state=RANDOM_STATE)
    elif best_cfg.startswith("Hist"):
        model = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.05, max_depth=3,
                                              l2_regularization=1.0, random_state=RANDOM_STATE)
    elif best_cfg.startswith("Ridge"):
        model = Ridge(alpha=10.0)
    else:
        model = DummyRegressor(strategy="mean")

    Xs = X[num + cat]
    for target in ["matematicas", "lectura_critica", "ingles", "global"]:
        template = Pipeline([("p", pre), ("m", model)])
        mae, rmse, r2 = cv_eval(template, Xs, y[target].to_numpy())
        print(f"  {target:18s} MAE={mae:7.2f} RMSE={rmse:7.2f} R2={r2:6.3f}")

    print(f"\nNUMERIC_FEATURES final = {num}")
    print(f"CATEGORICAL_FEATURES final = {cat}")


if __name__ == "__main__":
    main()
