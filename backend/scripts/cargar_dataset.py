#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Carga el dataset real (anonimo) desde `base-de-datos-para-proyecto-de-grado-Ing.csv`
a la tabla `dataset_saber_pro_real` de PostgreSQL.

Decisiones de mapeo (acordadas con el equipo):
  - PROMEDIO_INGLES (escala 1-7 del CSV) -> nivel_ingles (A1-C2):
      1 -> A1, 2 -> A2, 3 -> B1, 4 -> B2, 5 -> C1, 6/7 -> C2.
  - ESTRATO: "ESTRATO N" -> entero N.
  - CONDICION_LABORAL: "Si" / "No" -> boolean (acepta acentos y variantes).
  - GENERO: "M" / "F" -> CHAR(1); el resto -> NULL.
  - promedio_ingenieria (no existe en CSV): promedio de
    promedio_programacion y promedio_matematica_estadistica.
  - Campos que el predictor espera pero el CSV NO trae:
      acceso_internet = TRUE, acceso_pc = TRUE,
      horas_estudio_semana = 8, asistencia_pct = 85.
    (Defaults documentados en el repositorio; ver cabecera de la tabla.)

Uso:
  python cargar_dataset_saber_pro.py [--csv PATH] [--limit N] [--dry-run]

Lee credenciales desde backend/.env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).
"""
import argparse
import csv
import os
import re
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

# ----------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------
BACKEND_ENV = Path(__file__).resolve().parent.parent / ".env"
CSV_DEFAULT = Path(__file__).resolve().parents[4] / "base-de-datos-para-proyecto-de-grado-Ing.csv"

# Mapeo escala inglesa 1-7 -> nivel MCER (A1-C2).
INGLES_MAP = {1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1", 6: "C2", 7: "C2"}

# Defaults asumidos para campos que el CSV no trae.
DEFAULT_ACCESO_INTERNET   = True
DEFAULT_ACCESO_PC         = True
DEFAULT_HORAS_ESTUDIO     = 8
DEFAULT_ASISTENCIA_PCT    = 85

# Columnas del CSV que mapean directo a la tabla destino.
CSV_COLS = [
    "SEMESTRE_ACTUAL", "PORCENTAJE_AVANCE",
    "PUNTAJE_GLOBAL_SABER11", "PUNTAJE_MATEMATICAS_SABER11",
    "PUNTAJE_LECTURA_CRITICA_SABER11", "PUNTAJE_INGLES_SABER11",
    "PROMEDIO_INGLES",
    "PARTICIPO_PREPARACION_INSTITUCIONAL",
    "NUMERO_SIMULACROS_REALIZADOS", "PUNTAJE_PROMEDIO_SIMULACROS",
    "AÑO_PRESENTACION_SABER_PRO",
    "PROMEDIO_ACUMULADO", "PROMEDIO_MATERIAS_BASICAS",
    "PROMEDIO_PROGRAMACION", "PROMEDIO_MATEMATICA_ESTADISTICA",
    "CREDITOS_APROBADOS", "ASIGNATURAS_REPROBADAS",
    "ASIGNATURAS_APROBADAS", "NUMERO_ASIGNATURAS_REPETIDAS",
    "ESTRATO", "TIPO_FINANCIACION",
    "CONDICION_LABORAL (¿Trabaja?)",
    "GENERO", "EDAD", "PROCEDENCIA", "CIUDAD_RESIDENCIA_ACTUAL",
]

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def load_env(env_path: Path) -> dict:
    """Lee variables DB_* desde backend/.env sin librerias externas."""
    cfg = {}
    if not env_path.exists():
        return cfg
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg

def to_int(raw, lo=None, hi=None):
    if raw is None or raw == "":
        return None
    try:
        n = int(float(raw))
    except (TypeError, ValueError):
        return None
    if lo is not None and n < lo:
        return None
    if hi is not None and n > hi:
        return None
    return n

def to_num(raw, places=2, lo=None, hi=None):
    if raw is None or raw == "":
        return None
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return None
    if lo is not None and n < lo:
        return None
    if hi is not None and n > hi:
        return None
    return round(n, places)

def to_str(raw, maxlen=None):
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if maxlen and len(s) > maxlen:
        s = s[:maxlen]
    return s

def parse_estrato(raw):
    """'ESTRATO 3' -> 3. Si no matchea, intenta int directo."""
    if not raw:
        return None, None
    s = raw.strip()
    m = re.search(r"(\d+)", s)
    if m:
        return s, int(m.group(1))
    try:
        return s, int(float(s))
    except (TypeError, ValueError):
        return s, None

def parse_bool_yes(raw):
    """Acepta 'Si', 'Sí', 'No', 'Yes', 'No', '1', '0' (case/acento insensitive)."""
    if raw is None:
        return None, None
    s = str(raw).strip().lower()
    # normalizar acentos
    s = s.replace("í", "i").replace("Í", "i")
    if s in ("si", "yes", "true", "1"):
        return raw, True
    if s in ("no", "false", "0"):
        return raw, False
    return raw, None

def parse_genero(raw):
    if not raw:
        return None
    s = str(raw).strip().upper()
    if s in ("M", "F", "O"):
        return s[0]
    return None

def parse_participo(raw):
    """Campo vacio en CSV -> False (no reporto preparacion institucional)."""
    if raw is None or str(raw).strip() == "":
        return False
    s = str(raw).strip().lower().replace("í", "i")
    if s in ("si", "yes", "true", "1"):
        return True
    if s in ("no", "false", "0"):
        return False
    return None

def map_ingles(raw):
    """Devuelve (raw_int, nivel_str)."""
    n = to_int(raw, 0, 7)
    if n is None or n == 0:
        return (None, None)
    return n, INGLES_MAP.get(n)

def derive_promedio_ingenieria(prog, mate):
    """Promedio de los dos campos de ingenieria que trae el CSV."""
    vals = [v for v in (prog, mate) if v is not None]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 2)

# ----------------------------------------------------------------------
# Transform: fila CSV -> tupla para INSERT
# ----------------------------------------------------------------------
def transform_row(fila_idx: int, raw: dict) -> tuple:
    sem  = to_int(raw.get("SEMESTRE_ACTUAL"), 1, 12)
    pav  = to_num(raw.get("PORCENTAJE_AVANCE"), 2, 0, 100)

    s11g = to_int(raw.get("PUNTAJE_GLOBAL_SABER11"), 0, 500)
    s11m = to_num(raw.get("PUNTAJE_MATEMATICAS_SABER11"), 2, 0, 100)
    s11l = to_int(raw.get("PUNTAJE_LECTURA_CRITICA_SABER11"), 0, 100)
    s11i = to_int(raw.get("PUNTAJE_INGLES_SABER11"), 0, 100)

    ing_raw, ing_nivel = map_ingles(raw.get("PROMEDIO_INGLES"))
    participo = parse_participo(raw.get("PARTICIPO_PREPARACION_INSTITUCIONAL"))
    n_simulacros = to_int(raw.get("NUMERO_SIMULACROS_REALIZADOS"), 0, 50)
    p_simulacros = to_num(raw.get("PUNTAJE_PROMEDIO_SIMULACROS"), 2, 0, 300)
    anio_sp = to_int(raw.get("AÑO_PRESENTACION_SABER_PRO"), 2000, 2100)

    pa   = to_num(raw.get("PROMEDIO_ACUMULADO"), 2, 0, 5)
    pbas = to_num(raw.get("PROMEDIO_MATERIAS_BASICAS"), 2, 0, 5)
    pprog = to_num(raw.get("PROMEDIO_PROGRAMACION"), 2, 0, 5)
    pmat  = to_num(raw.get("PROMEDIO_MATEMATICA_ESTADISTICA"), 2, 0, 5)
    ping  = derive_promedio_ingenieria(pprog, pmat)

    cred  = to_int(raw.get("CREDITOS_APROBADOS"), 0, 300)
    repro = to_int(raw.get("ASIGNATURAS_REPROBADAS"), 0, 30)
    apro  = to_int(raw.get("ASIGNATURAS_APROBADAS"), 0, 80)
    rept  = to_int(raw.get("NUMERO_ASIGNATURAS_REPETIDAS"), 0, 30)

    estrato_raw, estrato = parse_estrato(raw.get("ESTRATO"))
    tipo_fin = to_str(raw.get("TIPO_FINANCIACION"))
    cond_raw, trabaja = parse_bool_yes(raw.get("CONDICION_LABORAL (¿Trabaja?)"))
    genero = parse_genero(raw.get("GENERO"))
    edad = to_int(raw.get("EDAD"), 14, 80)
    procedencia = to_str(raw.get("PROCEDENCIA"), 60)
    ciudad = to_str(raw.get("CIUDAD_RESIDENCIA_ACTUAL"), 60)

    return (
        fila_idx,
        sem, pav,
        s11g, s11m, s11l, s11i,
        ing_raw, ing_nivel,
        participo,
        n_simulacros, p_simulacros, anio_sp,
        pa, pbas, pprog, pmat, ping,
        cred, repro, apro, rept,
        estrato_raw, estrato,
        tipo_fin,
        cond_raw, trabaja,
        genero, edad, procedencia, ciudad,
        DEFAULT_ACCESO_INTERNET, DEFAULT_ACCESO_PC,
        DEFAULT_HORAS_ESTUDIO, DEFAULT_ASISTENCIA_PCT,
    )

INSERT_SQL = """
INSERT INTO dataset_saber_pro_real (
    fila_csv,
    semestre_actual, porcentaje_avance,
    puntaje_global_saber11, puntaje_matematicas_saber11,
    puntaje_lectura_critica_saber11, puntaje_ingles_saber11,
    promedio_ingles_raw, promedio_ingles_nivel,
    participo_preparacion,
    numero_simulacros_realizados, puntaje_promedio_simulacros, anio_presentacion_saber_pro,
    promedio_acumulado, promedio_materias_basicas,
    promedio_programacion, promedio_matematica_estadistica, promedio_ingenieria,
    creditos_aprobados, asignaturas_reprobadas,
    asignaturas_aprobadas, numero_asignaturas_repetidas,
    estrato_raw, estrato,
    tipo_financiacion,
    condicion_laboral_raw, trabaja,
    genero, edad, procedencia, ciudad_residencia_actual,
    acceso_internet, acceso_pc,
    horas_estudio_semana, asistencia_pct
) VALUES %s
ON CONFLICT (fila_csv) DO UPDATE SET
    semestre_actual                 = EXCLUDED.semestre_actual,
    porcentaje_avance               = EXCLUDED.porcentaje_avance,
    puntaje_global_saber11          = EXCLUDED.puntaje_global_saber11,
    puntaje_matematicas_saber11     = EXCLUDED.puntaje_matematicas_saber11,
    puntaje_lectura_critica_saber11 = EXCLUDED.puntaje_lectura_critica_saber11,
    puntaje_ingles_saber11          = EXCLUDED.puntaje_ingles_saber11,
    promedio_ingles_raw             = EXCLUDED.promedio_ingles_raw,
    promedio_ingles_nivel           = EXCLUDED.promedio_ingles_nivel,
    participo_preparacion           = EXCLUDED.participo_preparacion,
    numero_simulacros_realizados    = EXCLUDED.numero_simulacros_realizados,
    puntaje_promedio_simulacros     = EXCLUDED.puntaje_promedio_simulacros,
    anio_presentacion_saber_pro     = EXCLUDED.anio_presentacion_saber_pro,
    promedio_acumulado              = EXCLUDED.promedio_acumulado,
    promedio_materias_basicas       = EXCLUDED.promedio_materias_basicas,
    promedio_programacion           = EXCLUDED.promedio_programacion,
    promedio_matematica_estadistica = EXCLUDED.promedio_matematica_estadistica,
    promedio_ingenieria             = EXCLUDED.promedio_ingenieria,
    creditos_aprobados              = EXCLUDED.creditos_aprobados,
    asignaturas_reprobadas          = EXCLUDED.asignaturas_reprobadas,
    asignaturas_aprobadas           = EXCLUDED.asignaturas_aprobadas,
    numero_asignaturas_repetidas    = EXCLUDED.numero_asignaturas_repetidas,
    estrato_raw                     = EXCLUDED.estrato_raw,
    estrato                         = EXCLUDED.estrato,
    tipo_financiacion               = EXCLUDED.tipo_financiacion,
    condicion_laboral_raw           = EXCLUDED.condicion_laboral_raw,
    trabaja                         = EXCLUDED.trabaja,
    genero                          = EXCLUDED.genero,
    edad                            = EXCLUDED.edad,
    procedencia                     = EXCLUDED.procedencia,
    ciudad_residencia_actual        = EXCLUDED.ciudad_residencia_actual,
    acceso_internet                 = EXCLUDED.acceso_internet,
    acceso_pc                       = EXCLUDED.acceso_pc,
    horas_estudio_semana            = EXCLUDED.horas_estudio_semana,
    asistencia_pct                  = EXCLUDED.asistencia_pct
"""

# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default=str(CSV_DEFAULT))
    parser.add_argument("--limit", type=int, default=0, help="Procesar solo N filas (0=todas)")
    parser.add_argument("--dry-run", action="store_true", help="Solo transformar, no escribir")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[error] CSV no encontrado: {csv_path}", file=sys.stderr)
        return 1

    cfg = load_env(BACKEND_ENV)
    if not cfg.get("DB_HOST"):
        print(f"[error] No se pudo leer backend/.env ({BACKEND_ENV})", file=sys.stderr)
        return 2

    conn_kwargs = {
        "host":     cfg.get("DB_HOST", "localhost"),
        "port":     int(cfg.get("DB_PORT", "5432")),
        "dbname":   cfg.get("DB_NAME", "saberpro"),
        "user":     cfg.get("DB_USER", "postgres"),
        "password": cfg.get("DB_PASSWORD", ""),
    }

    print(f"[info] CSV: {csv_path}")
    print(f"[info] Conectando a {conn_kwargs['host']}:{conn_kwargs['port']}/{conn_kwargs['dbname']}")

    rows = []
    skipped = 0
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, raw in enumerate(reader, start=1):
            try:
                rows.append(transform_row(i, raw))
            except Exception as exc:
                skipped += 1
                print(f"[warn] Fila {i} no se pudo transformar: {exc}", file=sys.stderr)
            if args.limit and len(rows) >= args.limit:
                break

    print(f"[info] Filas transformadas: {len(rows)} (omitidas: {skipped})")

    if args.dry_run:
        print("[dry-run] No se escribio nada en la BD.")
        for r in rows[:3]:
            print("  ", r)
        return 0

    conn = psycopg2.connect(**conn_kwargs)
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            execute_values(cur, INSERT_SQL, rows, page_size=200)
        conn.commit()
        print(f"[ok] Insertadas/actualizadas: {len(rows)} filas en dataset_saber_pro_real.")
    except Exception as exc:
        conn.rollback()
        print(f"[error] Fallo la carga: {exc}", file=sys.stderr)
        raise
    finally:
        conn.close()

    return 0

if __name__ == "__main__":
    sys.exit(main())