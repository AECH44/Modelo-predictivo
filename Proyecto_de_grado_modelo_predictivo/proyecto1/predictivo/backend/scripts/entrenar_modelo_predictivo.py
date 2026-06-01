import json
import os
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", message=".*SQLAlchemy connectable.*")

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from dotenv import load_dotenv
except ImportError as exc:
    raise SystemExit(
        "Falta python-dotenv. Instala dependencias: "
        "python -m pip install --user -r backend/scripts/requirements_predictivo.txt"
    ) from exc

try:
    import mysql.connector
except ImportError as exc:
    raise SystemExit(
        "Falta mysql-connector-python. Instala dependencias: "
        "python -m pip install --user -r backend/scripts/requirements_predictivo.txt"
    ) from exc

try:
    import joblib
except ImportError as exc:
    raise SystemExit(
        "Falta joblib. Instala dependencias: "
        "python -m pip install --user -r backend/scripts/requirements_predictivo.txt"
    ) from exc


FEATURES = [
    "MUNIPROCEDENCIA",
    "GENERO",
    "Sisben",
    "PROMEDIO_PONDERADO",
    "promReligion",
    "promMatematica",
    "promCarrera",
]
TARGET = "deserto"


def normalize_deserto(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return 1 if value >= 1 else 0
    text = str(value).strip().lower()
    if text in {"1", "si", "sí", "s", "true", "t", "deserto", "desertor", "yes", "y"}:
        return 1
    if text in {"0", "no", "false", "f"}:
        return 0
    return None


def get_env(name, required=True, default=None):
    value = os.getenv(name, default)
    if required and (value is None or value == ""):
        raise SystemExit(f"Falta variable de entorno: {name}")
    return value


def load_data():
    host = get_env("DB_HOST")
    user = get_env("DB_USER")
    password = get_env("DB_PASSWORD")
    database = get_env("DB_NAME")
    port = int(os.getenv("DB_PORT", "3306"))
    table = os.getenv("PREDICTIVO_TABLE", "predictivo")

    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=port,
    )

    cols = ", ".join(FEATURES + [TARGET])
    query = f"SELECT {cols} FROM {table}"
    df = pd.read_sql(query, conn)
    conn.close()

    return df


def build_model(categorical_cols, numeric_cols):
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", categorical_pipeline, categorical_cols),
            ("num", numeric_pipeline, numeric_cols),
        ]
    )

    model = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        n_jobs=None,
    )

    return Pipeline(steps=[("preprocess", preprocessor), ("model", model)])


def main():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    df = load_data()

    df[TARGET] = df[TARGET].apply(normalize_deserto)
    df = df.dropna(subset=[TARGET])

    for col in FEATURES:
        if col not in df.columns:
            raise SystemExit(f"Columna faltante en datos: {col}")

    numeric_cols = [
        "PROMEDIO_PONDERADO",
        "promReligion",
        "promMatematica",
        "promCarrera",
    ]
    categorical_cols = ["MUNIPROCEDENCIA", "GENERO", "Sisben"]

    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    X = df[FEATURES]
    y = df[TARGET].astype(int)

    if y.nunique() < 2:
        raise SystemExit("La variable deserto solo tiene una clase. No se puede entrenar.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = build_model(categorical_cols, numeric_cols)
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()
    auc = roc_auc_score(y_test, y_proba)

    out_dir = Path(__file__).resolve().parents[1] / "models"
    out_dir.mkdir(exist_ok=True)

    model_path = out_dir / "desercion_model.joblib"
    metrics_path = out_dir / "desercion_metrics.json"

    joblib.dump(pipeline, model_path)
    with metrics_path.open("w", encoding="utf-8") as f:
        json.dump({"report": report, "confusion_matrix": cm, "roc_auc": auc}, f, indent=2)

    print(f"Modelo guardado en: {model_path}")
    print(f"Metricas guardadas en: {metrics_path}")
    print(f"ROC AUC: {auc:.4f}")


if __name__ == "__main__":
    main()
