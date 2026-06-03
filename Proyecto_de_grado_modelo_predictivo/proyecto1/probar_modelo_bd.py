"""
Carga bd.xlsx, mapea columnas al esquema que espera el modelo de desercion
y predice sobre todas las filas.
"""
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "bd.xlsx"
MODEL = ROOT / "predictivo" / "backend" / "models" / "desercion_model.joblib"

FEATURES = [
    "MUNIPROCEDENCIA",
    "GENERO",
    "Sisben",
    "PROMEDIO_PONDERADO",
    "promReligion",
    "promMatematica",
    "promCarrera",
]

# Mapeo de columnas del Excel a las features del modelo
COL_MAP = {
    "MUNICIO": "MUNIPROCEDENCIA",
    "GENERO": "GENERO",
    "SISBEN": "Sisben",
    "PROMEDIO_GENERAL": "PROMEDIO_PONDERADO",
    "RELG": "promReligion",
    "MAT": "promMatematica",
    "PROG": "promCarrera",
}

# Columnas extra para el reporte (contexto)
REPORT_COLS = [
    "PERIODO", "PROGRAMA", "CARNET", "GENERO",
    "MUNICIO", "SISBEN", "ESTRATO", "DESERCION",
    "PROMEDIO_GENERAL", "RELG", "MAT", "PROG",
]


def main():
    df = pd.read_excel(XLSX, sheet_name=0)
    print(f"Excel cargado: {len(df)} filas, {df.shape[1]} columnas\n")

    # Renombrar
    df = df.rename(columns=COL_MAP)

    faltantes = [c for c in FEATURES if c not in df.columns]
    if faltantes:
        print("ERROR: faltan columnas tras renombrar:", faltantes)
        sys.exit(1)

    # Limpiar filas sin features clave
    df_clean = df.dropna(subset=FEATURES).reset_index(drop=True)
    print(f"Filas con features completas: {len(df_clean)} / {len(df)}\n")

    # Cargar modelo
    model = joblib.load(MODEL)
    print(f"Modelo cargado: {type(model).__name__}\n")

    X = df_clean[FEATURES]
    preds = model.predict(X)
    probs = model.predict_proba(X)[:, 1]

    df_clean["pred_deserta"] = preds.astype(int)
    df_clean["prob_deserta"] = probs

    # Distribucion
    print("=== DISTRIBUCION DE PREDICCIONES ===")
    vc = pd.Series(preds).value_counts().sort_index()
    for k, v in vc.items():
        label = "DESERTA" if k == 1 else "NO DESERTA"
        pct = v / len(preds) * 100
        print(f"  {label} ({k}): {v} ({pct:.1f}%)")

    # Promedio de probabilidad
    print(f"\n  Probabilidad media de desercion: {probs.mean():.3f}")
    print(f"  Probabilidad minima: {probs.min():.3f}")
    print(f"  Probabilidad maxima: {probs.max():.3f}\n")

    # Cruzar con la columna DESERCION original (si existe)
    if "DESERCION" in df_clean.columns:
        print("=== COMPARACION PREDICCION vs COLUMNA 'DESERCION' DEL EXCEL ===")
        real = df_clean["DESERCION"].astype(int)
        pred = df_clean["pred_deserta"].astype(int)
        tp = int(((real == 1) & (pred == 1)).sum())
        tn = int(((real == 0) & (pred == 0)).sum())
        fp = int(((real == 0) & (pred == 1)).sum())
        fn = int(((real == 1) & (pred == 0)).sum())
        acc = (tp + tn) / max(1, len(real))
        print(f"  TP={tp}  TN={tn}  FP={fp}  FN={fn}")
        print(f"  Accuracy sobre el Excel: {acc*100:.1f}%\n")

    # Ejemplos
    print("=== 5 CASOS CON MAYOR PROBABILIDAD DE DESERCION ===")
    top = df_clean.sort_values("prob_deserta", ascending=False).head(5)
    cols_show = [c for c in REPORT_COLS if c in top.columns] + ["pred_deserta", "prob_deserta"]
    print(top[cols_show].to_string(index=False))

    print("\n=== 5 CASOS CON MENOR PROBABILIDAD DE DESERCION ===")
    bot = df_clean.sort_values("prob_deserta", ascending=True).head(5)
    print(bot[cols_show].to_string(index=False))

    # Guardar detalle a JSON
    out = ROOT / "resultados_prediccion_bd.json"
    detalle = df_clean[cols_show].to_dict(orient="records")
    out.write_text(json.dumps({
        "total_filas": int(len(df)),
        "filas_predichas": int(len(df_clean)),
        "distribucion": {("DESERTA" if k == 1 else "NO_DESERTA"): int(v) for k, v in vc.items()},
        "prob_media": float(probs.mean()),
        "detalle": detalle,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDetalle guardado en: {out}")


if __name__ == "__main__":
    main()
