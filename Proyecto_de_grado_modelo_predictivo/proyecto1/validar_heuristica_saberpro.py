"""
Validacion cuantitativa del predictor HEURISTICO de Saber Pro.

Como no hay ground truth, validamos:
  1. Consistencia: mismo input -> mismo output (1000 perfiles)
  2. Distribucion de clases: que los umbrales produzcan clases balanceadas
  3. Estabilidad: pequena perturbacion al input no deberia cambiar la clase
  4. Baseline ML: entrena un RandomForest sobre (perfil -> clase) generada por
     la propia heuristica, midiendo accuracy/precision/recall/f1 con CV 5-fold.
     Esto nos dice: 'si el problema es aprendible desde estos features, que tan
     bien lo aprende un modelo estandar'.
"""
import json
import random
from pathlib import Path
from statistics import mean, stdev

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, f1_score)
from sklearn.model_selection import StratifiedKFold, cross_val_predict

# --- Reproduccion EXACTA del predictor.js en Python ---
ENGLISH_BONUS = {"A1": 2, "A2": 6, "B1": 12, "B2": 20, "C1": 26, "C2": 30}


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def num(v, fallback):
    try:
        f = float(v)
        return f if np.isfinite(f) else fallback
    except (TypeError, ValueError):
        return fallback


def compute_prediction(p):
    promedio = num(p.get("promedio_acumulado"), 3.0)
    basicas = num(p.get("promedio_basicas"), promedio)
    ingenieria = num(p.get("promedio_ingenieria"), promedio)
    reprobadas = clamp(num(p.get("num_reprobadas"), 0), 0, 20)
    pct_creditos = clamp(num(p.get("pct_creditos"), 50), 0, 100)
    semestre = clamp(num(p.get("semestre"), 5), 1, 12)
    estrato = clamp(num(p.get("estrato"), 3), 1, 6)
    horas = clamp(num(p.get("horas_estudio_semana"), 6), 0, 40)
    simulacros = clamp(num(p.get("simulacros_realizados"), 0), 0, 20)
    asistencia = clamp(num(p.get("asistencia_pct"), 70), 0, 100)
    ingles = ENGLISH_BONUS.get(p.get("nivel_ingles"), 8)
    internet = 1 if p.get("acceso_internet") else 0
    pc = 1 if p.get("acceso_pc") else 0
    trabaja = 1 if p.get("trabaja") else 0

    score = 90
    score += promedio * 22
    score += basicas * 6
    score += ingenieria * 6
    score += (pct_creditos / 100) * 18
    score += (asistencia / 100) * 16
    score += min(horas, 25) * 0.9
    score += min(simulacros, 10) * 1.4
    score += ingles
    score += (estrato - 3) * 1.2
    score += internet * 3
    score += pc * 3
    score -= trabaja * 4
    score -= reprobadas * 5
    score += (semestre - 5) * 1.2

    puntaje = round(clamp(score, 0, 300))

    if puntaje < 180:
        clase = "bajo"
    elif puntaje >= 240:
        clase = "alto"
    else:
        clase = "medio"
    return puntaje, clase


# --- Generador de perfiles aleatorios realistas ---
def gen_perfil(rng):
    return {
        "promedio_acumulado": round(rng.uniform(2.0, 5.0), 2),
        "promedio_basicas": round(rng.uniform(2.0, 5.0), 2),
        "promedio_ingenieria": round(rng.uniform(2.0, 5.0), 2),
        "num_reprobadas": rng.randint(0, 8),
        "pct_creditos": rng.randint(15, 100),
        "semestre": rng.randint(1, 12),
        "estrato": rng.randint(1, 6),
        "acceso_internet": rng.random() < 0.85,
        "acceso_pc": rng.random() < 0.7,
        "trabaja": rng.random() < 0.3,
        "horas_estudio_semana": rng.randint(0, 35),
        "nivel_ingles": rng.choice(list(ENGLISH_BONUS.keys())),
        "simulacros_realizados": rng.randint(0, 12),
        "asistencia_pct": rng.randint(40, 100),
    }


def featurize(p):
    """Convierte perfil a vector numerico para ML."""
    return [
        p["promedio_acumulado"],
        p["promedio_basicas"],
        p["promedio_ingenieria"],
        p["num_reprobadas"],
        p["pct_creditos"],
        p["semestre"],
        p["estrato"],
        1 if p["acceso_internet"] else 0,
        1 if p["acceso_pc"] else 0,
        1 if p["trabaja"] else 0,
        p["horas_estudio_semana"],
        ENGLISH_BONUS.get(p["nivel_ingles"], 8),
        p["simulacros_realizados"],
        p["asistencia_pct"],
    ]


def main():
    rng = random.Random(42)
    np_rng = np.random.default_rng(42)
    N = 1000

    perfiles = [gen_perfil(rng) for _ in range(N)]
    puntajes, clases = zip(*[compute_prediction(p) for p in perfiles])

    # --- 1) Distribucion de puntajes y clases ---
    print("=" * 60)
    print(f"  N = {N} perfiles sinteticos")
    print("=" * 60)

    s = pd.Series(clases)
    dist = s.value_counts(normalize=True).round(4) * 100
    print("\n[1] Distribucion de clases (umbrales <180 / 180-239 / >=240):")
    for c in ["bajo", "medio", "alto"]:
        n = s.value_counts().get(c, 0)
        print(f"    {c:6s}: {n:4d} ({dist.get(c, 0):5.2f}%)")

    print(f"\n  Puntaje: min={min(puntajes)} max={max(puntajes)} "
          f"mean={mean(puntajes):.1f} stdev={stdev(puntajes):.1f}")

    print("\n  Histograma de puntajes (rangos de 30):")
    for lo in range(0, 301, 30):
        hi = lo + 30
        n = sum(1 for p in puntajes if lo <= p < hi)
        barra = "#" * (n // 5)
        print(f"    {lo:3d}-{hi-1:3d}: {n:4d} {barra}")

    # --- 2) Consistencia: mismo input -> mismo output ---
    print("\n[2] Consistencia (determinismo):")
    inconsistencias = 0
    for p in perfiles:
        p1, c1 = compute_prediction(p)
        p2, c2 = compute_prediction(p)
        if p1 != p2 or c1 != c2:
            inconsistencias += 1
    print(f"    Perfiles con resultados distintos en 2 corridas: {inconsistencias} / {N}")

    # --- 3) Estabilidad: perturbacion pequena no deberia cambiar la clase ---
    print("\n[3] Estabilidad ante perturbaciones pequenas (jitter ~1% en numericos):")
    cambios_clase = 0
    cambios_grandes = 0  # bajo<->alto
    for p in perfiles:
        c0 = compute_prediction(p)[1]
        p2 = dict(p)
        for k in ["promedio_acumulado", "promedio_basicas", "promedio_ingenieria",
                  "pct_creditos", "asistencia_pct", "horas_estudio_semana"]:
            v = p2[k]
            if isinstance(v, (int, float)):
                p2[k] = v + np_rng.normal(0, 0.01 * (5 if k.startswith("prom") else 100))
        c1 = compute_prediction(p2)[1]
        if c0 != c1:
            cambios_clase += 1
            if {c0, c1} == {"bajo", "alto"}:
                cambios_grandes += 1
    print(f"    Clases que cambiaron: {cambios_clase} / {N} ({cambios_clase/N*100:.1f}%)")
    print(f"    Cambios drasticos bajo<->alto: {cambios_grandes} / {N}")

    # --- 4) Baseline ML: RF cross-validado sobre (perfil -> clase heuristica) ---
    print("\n[4] Baseline ML — RandomForestClassifier con CV 5-fold estratificado")
    print("    (target = la clase que ASIGNA la propia heuristica)")
    X = np.array([featurize(p) for p in perfiles])
    y = np.array(clases)

    rf = RandomForestClassifier(
        n_estimators=200, max_depth=12, random_state=42, n_jobs=-1
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    y_pred = cross_val_predict(rf, X, y, cv=cv, n_jobs=-1)

    acc = accuracy_score(y, y_pred)
    macro_f1 = f1_score(y, y_pred, average="macro")
    weighted_f1 = f1_score(y, y_pred, average="weighted")
    print(f"\n    Accuracy CV:   {acc:.4f}  ({acc*100:.2f}%)")
    print(f"    Macro F1 CV:  {macro_f1:.4f}")
    print(f"    Weighted F1:  {weighted_f1:.4f}")
    print("\n    Classification report (CV out-of-fold):")
    print(classification_report(y, y_pred, digits=4, zero_division=0))
    print("    Matriz de confusion (filas=real, cols=pred):")
    cm = confusion_matrix(y, y_pred, labels=["bajo", "medio", "alto"])
    print("              bajo  medio  alto")
    for i, row in enumerate(cm):
        print(f"      {['bajo','medio','alto'][i]:6s}  " + "  ".join(f"{v:4d}" for v in row))

    # --- 5) Importancia de features (entrenado en todo el set) ---
    rf.fit(X, y)
    feature_names = ["prom_acum", "prom_bas", "prom_ing", "reprob", "pct_cred",
                     "semestre", "estrato", "internet", "pc", "trabaja",
                     "horas", "ingles", "simulacros", "asist"]
    imp = sorted(zip(feature_names, rf.feature_importances_), key=lambda x: -x[1])
    print("\n[5] Importancia de features (Random Forest entrenado en todo el set):")
    for name, score in imp:
        print(f"    {name:12s} {score:.4f}  {'#' * int(score*100)}")

    # Guardar perfiles y etiquetas para auditoria
    out = Path(__file__).parent / "dataset_sintetico_saberpro.csv"
    df = pd.DataFrame(perfiles)
    df["puntaje"] = puntajes
    df["clase"] = clases
    df.to_csv(out, index=False, encoding="utf-8")
    print(f"\nDataset exportado a: {out}")


if __name__ == "__main__":
    main()
