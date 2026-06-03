"""
ETL: carga datos reales de los 559 estudiantes importados desde SQL Server
(192.168.4.6) hacia la tabla `student_profiles` de PostgreSQL.

Campos que SÍ se cargan (de SQL Server):
  - genero             (TblTercero.chrSexo: M/F)
  - edad               (calculado de TblTercero.DtmFecNac)
  - estrato            (TblTercero.ChrTerEstrato; 0 -> NULL)
  - ciudad             (TblTercero.IntMuniProcId -> Central.TblMuni.ChrMuniNomCorto)
  - semestre           (MAX(TblEstudNivPA.intNivNum) del estudiante)

Campos que NO se cargan (no hay datos en SQL Server actual):
  - promedio_acumulado, promedio_basicas, promedio_ingenieria
  - num_reprobadas, pct_creditos
  - acceso_internet, acceso_pc, trabaja
  - horas_estudio_semana, nivel_ingles, simulacros_realizados
  - asistencia_pct

Perfil se marca completed = true para que el estudiante NO vea el formulario
de onboarding (los 6 campos que tenemos son reales; el resto quedan NULL y
el predictor usa fallbacks neutros).

Uso:
  python scripts_sqlserver/etl_datos_reales.py [--dry-run] [--reset]
"""
import argparse
import os
import sys
from datetime import date

import pyodbc
import psycopg2
import psycopg2.extras


# ============================================================
# CONFIGURACIÓN
# ============================================================

SQLSERVER_CONN = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=192.168.4.6,1433;"
    "UID=DESARROLLO;"
    "PWD=desarrollo$2009;"
    "TrustServerCertificate=yes;Encrypt=no;Connection Timeout=30;"
)

POSTGRES_CONN = dict(
    host="localhost",
    port=5432,
    dbname="saberpro",
    user="postgres",
    password="modelopredictivo",
)

# Años bisiestos se manejan con dateutil-less: división de años * 365.25 funciona
# bien para edades adultas (off-by-one < 0.5 año).
def calc_edad(fecha_nac):
    if not fecha_nac:
        return None
    try:
        today = date.today()
        yrs = today.year - fecha_nac.year - (
            (today.month, today.day) < (fecha_nac.month, fecha_nac.day)
        )
        if 14 <= yrs <= 80:
            return yrs
        return None
    except Exception:
        return None


def normalizar_estrato(v):
    """TblTercero.ChrTerEstrato viene como VARCHAR; valores válidos 1-6."""
    if v is None:
        return None
    s = str(v).strip()
    if not s or s == "0":
        return None
    try:
        n = int(s)
        if 1 <= n <= 6:
            return n
    except (ValueError, TypeError):
        pass
    return None


def normalizar_genero(v):
    if v is None:
        return None
    s = str(v).strip().upper()
    if s in ("M", "F", "O"):
        return s
    return None


# ============================================================
# EXTRACCIÓN
# ============================================================

def obtener_documentos_importados(pg_cur):
    """Lee (id, documento) de PostgreSQL forzando documento a str.
    Si psycopg2 lo infiere como int (BIGINT OID), los documentos largos
    (>= 11 dígitos) desbordan la columna VARCHAR(20) de TblTercero.ChrTerNumId.
    """
    pg_cur.execute(
        "SELECT id, documento::text FROM usuarios "
        "WHERE role='estudiante' AND is_active=true ORDER BY documento"
    )
    return pg_cur.fetchall()  # [(user_id, documento_str), ...]


def extraer_datos_sqlserver(documentos):
    """Devuelve dict{documento: {genero, edad, estrato, ciudad, semestre}}.

    `documentos` puede ser:
      - lista de strings (ej: ['1000003910', '1000287789', ...])
      - lista de tuplas (user_id, documento) — como devuelve obtener_documentos_importados
    """
    if not documentos:
        return {}

    conn = pyodbc.connect(SQLSERVER_CONN + ";DATABASE=ViceAcad", autocommit=True)
    cur = conn.cursor()

    # Si llegan tuplas (user_id, documento), sacar el documento (segundo elem).
    # Si llegan strings, usar tal cual.
    docs = tuple(d if isinstance(d, str) else d[1] for d in documentos)
    resultado = {}

    # Batch por chunks de 200 para no superar el límite de IN
    def chunks(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i:i + n]

    # 1) Datos personales y demograficos
    for chunk in chunks(docs, 200):
        placeholders = ",".join("?" * len(chunk))
        cur.execute(
            f"""
            SELECT t.ChrTerNumId,
                   t.chrSexo,
                   t.DtmFecNac,
                   t.ChrTerEstrato,
                   ISNULL(m.ChrMuniNomCorto, NULL) AS ciudad_proc
            FROM Contabilidad.DBO.TblTercero t
            LEFT JOIN Central.DBO.TblMuni m
                   ON m.IdsMuniId = NULLIF(t.IntMuniProcId, 0)
            WHERE t.ChrTerNumId IN ({placeholders})
            """,
            chunk,
        )
        cols = [c[0] for c in cur.description]
        for row in cur.fetchall():
            rec = dict(zip(cols, row))
            doc = rec["ChrTerNumId"]
            resultado[doc] = {
                "genero": normalizar_genero(rec["chrSexo"]),
                "edad": calc_edad(rec["DtmFecNac"]),
                "estrato": normalizar_estrato(rec["ChrTerEstrato"]),
                "ciudad": (str(rec["ciudad_proc"]).strip()
                           if rec["ciudad_proc"] else None),
                "semestre": None,
            }

    # 2) Semestre (MAX intNivNum no cancelado)
    for chunk in chunks(docs, 200):
        placeholders = ",".join("?" * len(chunk))
        cur.execute(
            f"""
            SELECT t.ChrTerNumId, MAX(enpa.intNivNum) AS semestre
            FROM Contabilidad.DBO.TblTercero t
            INNER JOIN TrelEstProg ep ON ep.IntTerEstudId = t.IdsTerceroId
            INNER JOIN TblEstudNivPA enpa ON enpa.IntEstProgId = ep.IdsEstProgId
            WHERE t.ChrTerNumId IN ({placeholders})
              AND (enpa.blnENPACancel IS NULL OR enpa.blnENPACancel = 0)
            GROUP BY t.ChrTerNumId
            """,
            chunk,
        )
        for doc, sem in cur.fetchall():
            if doc in resultado and sem:
                try:
                    s = int(sem)
                    if 1 <= s <= 12:
                        resultado[doc]["semestre"] = s
                except (ValueError, TypeError):
                    pass

    conn.close()
    return resultado


# ============================================================
# CARGA
# ============================================================

UPSERT_SQL = """
INSERT INTO student_profiles (
    user_id, genero, edad, estrato, ciudad, semestre,
    completed, updated_at
) VALUES (
    %(user_id)s, %(genero)s, %(edad)s, %(estrato)s, %(ciudad)s, %(semestre)s,
    true, NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    genero    = EXCLUDED.genero,
    edad      = EXCLUDED.edad,
    estrato   = EXCLUDED.estrato,
    ciudad    = EXCLUDED.ciudad,
    semestre  = EXCLUDED.semestre,
    completed = true,
    updated_at = NOW()
"""


def cargar_a_postgres(usuarios_pg, datos_sqlserver, dry_run=False, reset=False):
    """
    usuarios_pg     : lista [(user_id, documento)]
    datos_sqlserver : dict{documento: {genero, edad, estrato, ciudad, semestre}}
    """
    pg = psycopg2.connect(**POSTGRES_CONN)
    pg.autocommit = False
    cur = pg.cursor()

    if reset and not dry_run:
        cur.execute(
            "DELETE FROM student_profiles WHERE user_id = ANY(%s)",
            ([u[0] for u in usuarios_pg],),
        )
        print(f"  [reset] {cur.rowcount} perfiles eliminados antes de cargar.")

    if not dry_run:
        # Limpiar predicciones para forzar recálculo
        cur.execute(
            "DELETE FROM predictions WHERE user_id = ANY(%s)",
            ([u[0] for u in usuarios_pg],),
        )
        print(f"  [reset] {cur.rowcount} predicciones eliminadas (se regeneran).")

    insertados, sin_datos, sin_match = 0, 0, 0
    for user_id, doc in usuarios_pg:
        data = datos_sqlserver.get(doc)
        if data is None:
            sin_match += 1
            continue
        # Si no tiene ningún campo real, no insertamos nada (no aporta)
        if not any(data.values()):
            sin_datos += 1
            continue

        params = {"user_id": user_id, **data}
        if dry_run:
            print(f"  [dry-run] user_id={user_id} doc={doc} -> {data}")
        else:
            cur.execute(UPSERT_SQL, params)
            insertados += 1

    if not dry_run:
        pg.commit()
    cur.close()
    pg.close()
    return insertados, sin_datos, sin_match


# ============================================================
# MAIN
# ============================================================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="No escribe en PostgreSQL, solo muestra lo que haría.")
    ap.add_argument("--reset", action="store_true",
                    help="Borra perfiles/predicciones previas antes de cargar.")
    args = ap.parse_args()

    print("=" * 60)
    print("ETL: SQL Server 192.168.4.6 -> PostgreSQL (saberpro)")
    print("=" * 60)

    pg = psycopg2.connect(**POSTGRES_CONN)
    pg_cur = pg.cursor()
    usuarios_pg = obtener_documentos_importados(pg_cur)
    pg_cur.close()
    pg.close()
    print(f"  Estudiantes importados: {len(usuarios_pg)}")

    print("\n  Extrayendo datos de SQL Server...")
    datos = extraer_datos_sqlserver([u[1] for u in usuarios_pg])
    print(f"  Estudiantes con datos en SQL Server: {len(datos)}")

    print(f"\n  {'(DRY RUN) ' if args.dry_run else ''}Cargando a PostgreSQL...")
    insertados, sin_datos, sin_match = cargar_a_postgres(
        usuarios_pg, datos, dry_run=args.dry_run, reset=args.reset
    )

    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"  Insertados/actualizados: {insertados}")
    print(f"  Sin match en SQL Server: {sin_match}")
    print(f"  Sin datos útiles:        {sin_datos}")
    print()
    print("  Campos cargados (NULL si no hay dato):")
    print("    - genero, edad, estrato, ciudad, semestre")
    print("  Campos NO cargados (quedan NULL en BD):")
    print("    - promedio_*, num_reprobadas, pct_creditos,")
    print("      acceso_internet/pc/trabaja, horas_estudio,")
    print("      nivel_ingles, simulacros, asistencia")
    print()
    if not args.dry_run:
        print("  [OK] Perfiles marcados completed=true")
        print("  [OK] Predicciones se regeneran al primer GET del estudiante")
    print("=" * 60)


if __name__ == "__main__":
    main()
