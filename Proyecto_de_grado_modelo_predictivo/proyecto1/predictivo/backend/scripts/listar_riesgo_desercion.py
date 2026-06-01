import argparse
import json
import os
import re
import sys
import warnings
from pathlib import Path

# Suprimir advertencias conocidas de pandas/sklearn (compatibilidad DBAPI2 y versiones de modelo)
warnings.filterwarnings("ignore", message=".*SQLAlchemy connectable.*")
warnings.filterwarnings("ignore", message=".*InconsistentVersionWarning.*")
warnings.filterwarnings("ignore", message=".*unpickle estimator.*")

import pandas as pd
import joblib

try:
    import mysql.connector
except ImportError as exc:
    raise SystemExit(
        "Falta mysql-connector-python. Instala dependencias: "
        "python -m pip install --user -r backend/scripts/requirements_predictivo.txt"
    ) from exc

try:
    from dotenv import load_dotenv
except ImportError as exc:
    raise SystemExit(
        "Falta python-dotenv. Instala dependencias: "
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

NUMERIC_COLS = [
    "PROMEDIO_PONDERADO",
    "promReligion",
    "promMatematica",
    "promCarrera",
]


def get_env(name, required=True, default=None):
    value = os.getenv(name, default)
    if required and (value is None or value == ""):
        raise SystemExit(f"Falta variable de entorno: {name}")
    return value


def sanitize_table(name):
    if not re.fullmatch(r"[A-Za-z0-9_]+", name):
        raise SystemExit("Nombre de tabla inválido.")
    return name


def get_periodo_anterior(periodo):
    if not periodo:
        return None
    try:
        anio, sem = periodo.split("-")
        anio = int(anio)
        sem = int(sem)
    except ValueError:
        return None
    if sem == 1:
        return f"{anio - 1}-2"
    return f"{anio}-{sem - 1}"


def pick_col(candidates, col_map):
    for col in candidates:
        key = col.lower()
        if key in col_map:
            return col_map[key]
    return None


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser()
    parser.add_argument("--periodo", default="actual")
    parser.add_argument("--umbral", type=float, default=0.7)
    parser.add_argument("--limite", type=int, default=200)
    parser.add_argument("--facultad", default="")
    parser.add_argument("--programa", default="")
    args = parser.parse_args()

    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    host = get_env("DB_HOST")
    user = get_env("DB_USER")
    password = get_env("DB_PASSWORD")
    database = get_env("DB_NAME")
    port = int(os.getenv("DB_PORT", "3306"))
    table = sanitize_table(os.getenv("PREDICTIVO_TABLE", "predictivo"))

    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=port,
        charset="utf8mb4",
        use_unicode=True,
    )
    cursor = conn.cursor()

    cursor.execute("SELECT MAX(NombrePeriodo) FROM matriculas")
    max_periodo = cursor.fetchone()[0]
    if not max_periodo:
        raise SystemExit("No se encontró el periodo actual en matriculas.")

    if args.periodo == "actual":
        periodo = max_periodo
    elif args.periodo == "anterior":
        periodo = get_periodo_anterior(max_periodo)
    else:
        periodo = args.periodo

    if not periodo:
        raise SystemExit("No se pudo determinar el periodo a consultar.")

    cursor.execute(f"SHOW COLUMNS FROM {table}")
    cols = [row[0] for row in cursor.fetchall()]
    col_map = {c.lower(): c for c in cols}

    feature_map = {}
    for feat in FEATURES:
        actual = col_map.get(feat.lower())
        if not actual:
            raise SystemExit(f"Columna faltante en {table}: {feat}")
        feature_map[feat] = actual

    period_col = pick_col(
        [
            "NombrePeriodo",
            "nombreperiodo",
            "periodo",
            "Periodo",
            "periodo_academico",
            "periodoAcademico",
        ],
        col_map,
    )

    doc_col = pick_col(["documento", "Documento"], col_map)
    codigo_col = pick_col(["codigo", "Codigo"], col_map)

    info_cols = {
        "estudiante": pick_col(["estudiante", "Estudiante", "nombre", "Nombre"], col_map),
        "codigo": codigo_col,
        "programa": pick_col(["programa", "Programa"], col_map),
        "facultad": pick_col(["facultad", "Facultad"], col_map),
        "nivel": pick_col(["nivel", "Nivel"], col_map),
        "documento": doc_col,
    }

    join_key = None
    join_key_m = None
    if doc_col:
        join_key = doc_col
        join_key_m = "documento"
    elif codigo_col:
        join_key = codigo_col
        join_key_m = "codigo"

    # Siempre usar JOIN con matriculas cuando hay join_key, para obtener todas las columnas de matrícula
    usar_join = bool(join_key)

    if period_col and not usar_join:
        select_parts = []
        for feat, actual in feature_map.items():
            select_parts.append(f"`{actual}` AS `{feat}`")
        for key, actual in info_cols.items():
            if actual:
                select_parts.append(f"`{actual}` AS `{key}`")
        select_parts.append(f"`{period_col}` AS `periodo`")
        where_parts = [f"`{period_col}` = %s"]
        params = [periodo]
        if args.facultad and info_cols["facultad"]:
            where_parts.append(f"LOWER(TRIM(`{info_cols['facultad']}`)) = LOWER(TRIM(%s))")
            params.append(args.facultad)
        if args.programa and info_cols["programa"]:
            where_parts.append(f"LOWER(TRIM(`{info_cols['programa']}`)) = LOWER(TRIM(%s))")
            params.append(args.programa)
        query = f"SELECT {', '.join(select_parts)} FROM {table} WHERE " + " AND ".join(where_parts)
        df = pd.read_sql(query, conn, params=params)
    else:
        if not join_key:
            raise SystemExit(
                "No se encontró columna de periodo en predictivo ni una llave de unión (documento/codigo)."
            )

        select_parts = []
        for feat, actual in feature_map.items():
            select_parts.append(f"p.`{actual}` AS `{feat}`")
        select_parts.extend(
            [
                "m.NombrePeriodo AS NombrePeriodo",
                "m.programa AS programa",
                "m.facultad AS facultad",
                "m.estudiante AS estudiante",
                "m.codigo AS codigo",
                "m.EstadoMatricula AS EstadoMatricula",
                "m.nivel AS nivel",
                "m.PERINGRESO AS PERINGRESO",
                "m.EstadoEstudiante AS EstadoEstudiante",
                "m.tipodocumento AS tipodocumento",
                "m.documento AS documento",
                "m.telefonoppal AS telefonoppal",
                "m.celular AS celular",
                "m.correounac AS correounac",
                "m.correootro AS correootro",
                "m.muniprocedencia AS muniprocedencia",
                "m.dptoprocedencia AS dptoprocedencia",
                "m.paisprocedencia AS paisprocedencia",
            ]
        )
        where_parts = ["m.NombrePeriodo = %s"]
        params = [periodo]
        if args.facultad:
            where_parts.append("LOWER(TRIM(m.facultad)) = LOWER(TRIM(%s))")
            params.append(args.facultad)
        if args.programa:
            where_parts.append("LOWER(TRIM(m.programa)) = LOWER(TRIM(%s))")
            params.append(args.programa)

        query = (
            f"SELECT {', '.join(select_parts)} "
            f"FROM {table} p "
            f"JOIN matriculas m ON p.`{join_key}` = m.`{join_key_m}` "
            f"WHERE " + " AND ".join(where_parts)
        )
        df = pd.read_sql(query, conn, params=params)

    conn.close()

    if df.empty:
        print(json.dumps({"periodo": periodo, "umbral": args.umbral, "results": []}))
        return

    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    model_path = Path(__file__).resolve().parents[1] / "models" / "desercion_model.joblib"
    if not model_path.exists():
        raise SystemExit("No se encontró el modelo. Entrena primero.")

    model = joblib.load(model_path)
    probs = model.predict_proba(df[FEATURES])[:, 1]
    df["prob_deserto"] = probs

    df = df[df["prob_deserto"] >= args.umbral]
    df = df.sort_values("prob_deserto", ascending=False)

    # Eliminar duplicados por estudiante (el JOIN con matriculas puede repetir
    # si un estudiante tiene varias matrículas en el mismo período/facultad)
    dedup_col = "documento" if "documento" in df.columns else "codigo"
    df = df.drop_duplicates(subset=[dedup_col], keep="first")

    if args.limite and args.limite > 0:
        df = df.head(args.limite)

    results = []
    for _, row in df.iterrows():
        result = {
            "prob_deserto": float(row.get("prob_deserto")),
            "NombrePeriodo": row.get("NombrePeriodo") or row.get("periodo"),
            "programa": row.get("programa"),
            "facultad": row.get("facultad"),
            "estudiante": row.get("estudiante"),
            "codigo": row.get("codigo"),
            "EstadoMatricula": row.get("EstadoMatricula"),
            "nivel": row.get("nivel"),
            "PERINGRESO": row.get("PERINGRESO"),
            "EstadoEstudiante": row.get("EstadoEstudiante"),
            "tipodocumento": row.get("tipodocumento"),
            "documento": row.get("documento"),
            "telefonoppal": row.get("telefonoppal"),
            "celular": row.get("celular"),
            "correounac": row.get("correounac"),
            "correootro": row.get("correootro"),
            "muniprocedencia": row.get("muniprocedencia"),
            "dptoprocedencia": row.get("dptoprocedencia"),
            "paisprocedencia": row.get("paisprocedencia"),
        }
        results.append(result)

    print(
        json.dumps(
            {"periodo": periodo, "umbral": args.umbral, "results": results},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=os.sys.stderr)
        raise
