"""
Procesa el CSV exportado de SQL Server.

El archivo tiene DOS problemas:
  1. Encoding doblemente corrupto: la cabecera dice UTF-8 pero los bytes
     son en realidad cp1252 -> utf8 (mojibake). Lo corregimos.
  2. Algunos nombres estan entre comillas dobles, otros no. Usamos el
     modulo csv de Python que respeta el text qualifier.

Salida:
  - estudiantes_limpio.csv  -> listo para import-students.js
  - reporte_procesamiento.csv -> filas omitidas y motivo
  - procesamiento_detalle.json -> resumen
"""
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "estudiantes_ingenieria.csv"
CLEAN = ROOT / "estudiantes_limpio.csv"
REPORT = ROOT / "reporte_procesamiento.csv"
DETAIL = ROOT / "procesamiento_detalle.json"

NAME_RE = re.compile(r"^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ .'-]+$")
DOC_RE = re.compile(r"^\d{5,15}$")
INST_RE = re.compile(r"@unac\.edu\.co$", re.IGNORECASE)


def fix_mojibake_bytes(raw_bytes):
    """Repara mojibake UTF-8 -> cp1252 -> UTF-8 a nivel de bytes.

    El patron observado (verificado byte a byte):
      Original UTF-8:  0xC3 0x8D  ('I' con acento en Latin-1)
      Tras cp1252:     0xC3 -> 'A tilde', 0x8D -> caracter de control
      En el archivo:   0xC3 0x8D (los dos bytes tal cual)

    Estrategia: identificar el patron 'letra-con-circonflexo' (A,E,I,O,U)
    en latin-1 (0xC0..0xC3) seguido de 0x80..0xBF (que era el segundo byte
    UTF-8 original) y reconstruir el par UTF-8.
    """
    out = bytearray()
    i = 0
    while i < len(raw_bytes):
        b = raw_bytes[i]
        # 0xC2 o 0xC3 seguido de 0x80..0xBF -> es un caracter UTF-8
        # de 2 bytes que sobrevivio al ciclo corrupto
        if i + 1 < len(raw_bytes) and b in (0xC2, 0xC3) and 0x80 <= raw_bytes[i + 1] <= 0xBF:
            out.append(b)
            out.append(raw_bytes[i + 1])
            i += 2
        else:
            out.append(b)
            i += 1
    return out.decode("utf-8", errors="replace")


def normalize_prog(s):
    if not s:
        return None
    s2 = s.strip().upper()
    s2 = (s2.replace("Í", "I").replace("Ó", "O").replace("É", "E")
            .replace("Á", "A").replace("Ú", "U").replace("Ñ", "N"))
    s2 = re.sub(r"\s+", " ", s2)
    if s2 == "INGENIERIA DE SISTEMAS":
        return "sistemas"
    if s2 == "INGENIERIA INDUSTRIAL":
        return "industrial"
    return None


def main():
    with open(SRC, "rb") as f:
        raw = f.read()
    if raw.startswith(b"\xef\xbb\xbf"):
        raw = raw[3:]
    # Repara el mojibake a nivel de bytes
    text = fix_mojibake_bytes(raw)

    # csv.reader respeta comillas y separadores correctos
    reader = csv.reader(text.splitlines(), skipinitialspace=True)
    rows = list(reader)
    print(f"Filas leidas (incl. posible encabezado): {len(rows)}")

    # Detectar si hay encabezado
    first = rows[0] if rows else []
    is_header = len(first) > 0 and any(
        kw in (first[0] if first else "").lower()
        for kw in ["documento", "cedula", "id"]
    ) or any(
        kw in (first[1] if len(first) > 1 else "").lower()
        for kw in ["nombre", "name"]
    )

    if is_header:
        print("Encabezado detectado, se omite")
        data_rows = rows[1:]
    else:
        data_rows = rows

    parsed = []
    parse_errors = 0
    for parts in data_rows:
        if len(parts) < 4:
            parse_errors += 1
            continue
        doc = parts[0].strip()
        nombre = parts[1].strip()
        email = parts[2].strip()
        programa = parts[3].strip()
        parsed.append({
            "documento": doc,
            "nombre": nombre,
            "email": email,
            "programa_raw": programa,
        })

    print(f"Filas parseadas: {len(parsed)} (errores de parseo: {parse_errors})")

    # Clasificar
    importables = []
    omitidos = {
        "email_null": [],
        "email_no_unac": [],
        "doc_invalido": [],
        "nombre_invalido": [],
        "programa_desconocido": [],
        "cuenta_administrativa": [],
    }

    # Patrones para detectar cuentas que NO son de estudiantes pero estan
    # registradas como correos @unac.edu.co (docentes, admins, etc.).
    # SQL Server TrelEstProg a veces incluye profesores asignados al programa.
    NON_STUDENT_EMAIL_PATTERNS = [
        r"^docente\.",     # docente.loquesea@...
        r"^admin",         # admincampus, admin...
        r"^coord",         # coord...
        r"^decano\.",
        r"^profesor\.",
        r"^rector\.",
        r"^director\.",
        r"^secretaria\.",
    ]
    non_student_re = re.compile("|".join(NON_STUDENT_EMAIL_PATTERNS), re.IGNORECASE)

    for r in parsed:
        if not r["email"] or r["email"].upper() == "NULL" or r["email"].lower() == "null":
            omitidos["email_null"].append(r)
            continue
        if not INST_RE.search(r["email"]):
            omitidos["email_no_unac"].append(r)
            continue
        if non_student_re.match(r["email"]):
            omitidos["cuenta_administrativa"].append(r)
            continue
        if not DOC_RE.match(r["documento"]):
            omitidos["doc_invalido"].append(r)
            continue
        if not NAME_RE.match(r["nombre"]) or len(r["nombre"]) < 3:
            omitidos["nombre_invalido"].append(r)
            continue
        prog = normalize_prog(r["programa_raw"])
        if not prog:
            omitidos["programa_desconocido"].append(r)
            continue
        importables.append({
            "documento": r["documento"],
            "nombre": r["nombre"],
            "email": r["email"].lower(),
            "programa": prog,
            "programa_original": r["programa_raw"],
        })

    # Deduplicar por documento
    seen_docs = set()
    dedup_doc = []
    dup_doc = 0
    for r in importables:
        if r["documento"] in seen_docs:
            dup_doc += 1
            continue
        seen_docs.add(r["documento"])
        dedup_doc.append(r)

    # Deduplicar por email
    seen_emails = set()
    final = []
    dup_email = 0
    for r in dedup_doc:
        if r["email"] in seen_emails:
            dup_email += 1
            continue
        seen_emails.add(r["email"])
        final.append(r)

    # Escribir CSV limpio
    with open(CLEAN, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["documento", "nombre", "email", "programa"])
        w.writeheader()
        for r in final:
            w.writerow({
                "documento": r["documento"],
                "nombre": r["nombre"],
                "email": r["email"],
                "programa": r["programa"],
            })

    # Reporte de omitidos
    with open(REPORT, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["motivo", "documento", "nombre", "email", "programa_raw"])
        for motivo, lista in omitidos.items():
            for r in lista:
                w.writerow([motivo, r["documento"], r["nombre"], r["email"], r["programa_raw"]])

    # Resumen
    print()
    print("=" * 60)
    print("RESUMEN DEL PROCESAMIENTO")
    print("=" * 60)
    print(f"  Total leidas:                  {len(parsed)}")
    for motivo, lista in omitidos.items():
        print(f"  Omitidos ({motivo:22s}): {len(lista)}")
    print(f"  Importables (con email UNAC):  {len(importables)}")
    print(f"  Duplicados por documento:      {dup_doc}")
    print(f"  Duplicados por email:          {dup_email}")
    print(f"  FINAL (a importar):            {len(final)}")
    print()
    print("  Distribucion por programa:")
    for prog, n in Counter(r["programa"] for r in final).most_common():
        print(f"    {prog:12s} {n}")

    # Muestra de los primeros 3 finales
    print()
    print("  Muestra de los 3 primeros finales:")
    for r in final[:3]:
        print(f"    {r['documento']}  {r['nombre'][:35]:35s}  {r['email']:35s}  {r['programa']}")

    with open(DETAIL, "w", encoding="utf-8") as f:
        json.dump({
            "total_leidas": len(parsed),
            "omitidos": {k: len(v) for k, v in omitidos.items()},
            "duplicados_doc": dup_doc,
            "duplicados_email": dup_email,
            "a_importar": len(final),
            "por_programa": dict(Counter(r["programa"] for r in final)),
        }, f, ensure_ascii=False, indent=2)

    print()
    print(f"  CSV limpio:  {CLEAN.name}")
    print(f"  Reporte:     {REPORT.name}")
    print(f"  Detalle:     {DETAIL.name}")


if __name__ == "__main__":
    main()
