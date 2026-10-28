#!/usr/bin/env python3
"""
Graficos del analisis del modelo v2 (`saberpro-v2`).

El v2 es una REGRESION: predice el puntaje real del Saber Pro (escala 0-300)
como la suma de las tres areas del examen. Los graficos del v1 (clasificador
de bandas) quedaron obsoletos y ya no se usan.

Este script NO entrena el modelo definitivo: usa el artefacto ya entrenado
(`trained_models/saberpro_model_v2.pkl`) y la MISMA muestra con la que se
entreno, importando las funciones de `train_saberpro_v2.py`.

IMPORTANTE (metodologia): todas las metricas que se muestran en los graficos
son OUT-OF-FOLD, calculadas con KFold(5, shuffle, random_state=42) sobre
estos mismos datos. Medir sobre los datos con los que se entreno (in-sample)
daria un R2 de 0.57 en vez de 0.29 y graficaria un modelo bastante mejor de
lo que es: los graficos tienen que ser comparables con las metricas del
panel de analisis, que salen de la validacion cruzada.

Uso:
    python analyze_v2_results.py

Salida: 6 PNG en `analysis/`.
"""
from __future__ import annotations

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import psycopg2
from sklearn.base import clone
from sklearn.model_selection import KFold

# Las funciones de preparacion se importan del script de entrenamiento para
# garantizar que la muestra es identica a la de entrenamiento.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from train_saberpro_v2 import (  # noqa: E402
    AREA_TARGETS,
    load_data_from_postgres,
    load_env_from_backend,
    prepare,
)

# ---------------------------------------------------------------------------
# Rutas y paleta
# ---------------------------------------------------------------------------
BASE = Path(__file__).resolve().parent
ANALYSIS_DIR = BASE / "analysis"
MODEL_PATH = BASE / "trained_models" / "saberpro_model_v2.pkl"

AZUL = "#295884"
CIAN = "#5d9cec"
VERDE = "#37bc9b"
AMBAR = "#f6bb42"
ROJO = "#da4453"
GRIS = "#7c8794"

AREA_COLOR = {
    "matematicas": AZUL,
    "lectura_critica": VERDE,
    "ingles": AMBAR,
}
AREA_LABEL = {
    "matematicas": "Matemáticas",
    "lectura_critica": "Lectura crítica",
    "ingles": "Inglés",
}

N_SPLITS = 5
RANDOM_STATE = 42


def estilo(ax) -> None:
    """Acabado comun de los ejes: sin bordes arriba/derecha, rejilla suave."""
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#d8e0ea")
    ax.spines["bottom"].set_color("#d8e0ea")
    ax.grid(axis="y", color="#e6ecf3", linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(colors="#4a5568", labelsize=9)


# ---------------------------------------------------------------------------
# Datos
# ---------------------------------------------------------------------------
def cargar_datos():
    cfg = load_env_from_backend()
    df = load_data_from_postgres(cfg)
    X, y, stats = prepare(df)
    artefacto = joblib.load(MODEL_PATH)
    return cfg, X, y, stats, artefacto


def metricas(y_real: np.ndarray, y_pred: np.ndarray) -> dict:
    resid = y_real - y_pred
    mae = float(np.mean(np.abs(resid)))
    rmse = float(np.sqrt(np.mean(resid**2)))
    ss_res = float(np.sum(resid**2))
    ss_tot = float(np.sum((y_real - y_real.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    return {"mae": mae, "rmse": rmse, "r2": r2}


def bandas_de(puntajes: np.ndarray, bajo_max: float, medio_max: float) -> np.ndarray:
    return np.where(
        puntajes < bajo_max, "Bajo", np.where(puntajes < medio_max, "Medio", "Alto")
    )


# ---------------------------------------------------------------------------
# Predicciones out-of-fold
# ---------------------------------------------------------------------------
def predicciones_oof(X: pd.DataFrame, y: pd.DataFrame, artefacto: dict):
    """Predicciones fuera de muestra con KFold.

    Devuelve las predicciones del global y de cada area (una por fila), los
    modelos ajustados de cada fold y los indices de train/test de cada fold.
    """
    areas_pipeline = artefacto.get("areas") or {}
    kf = KFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)

    oof_global = np.zeros(len(X))
    oof_areas = {nombre: np.zeros(len(X)) for nombre in areas_pipeline}
    modelos_por_fold = []
    indices_fold = []

    for train_idx, test_idx in kf.split(X):
        X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
        modelos = {}
        total = np.zeros(len(test_idx))
        for nombre, pipeline in areas_pipeline.items():
            modelo = clone(pipeline)
            modelo.fit(X_tr, y[nombre].iloc[train_idx].to_numpy())
            modelos[nombre] = modelo
            valores = np.clip(np.asarray(modelo.predict(X_te), dtype=float), 0.0, 100.0)
            oof_areas[nombre][test_idx] = valores
            total += valores
        oof_global[test_idx] = np.clip(total, 0.0, 300.0)
        modelos_por_fold.append(modelos)
        indices_fold.append((train_idx, test_idx))

    return oof_global, oof_areas, modelos_por_fold, indices_fold


def importancia_permutacion(X, y_global, oof_global, modelos_por_fold, indices_fold):
    """Cuanto MAE sube al barajar cada variable (evaluado fuera de muestra).

    Para cada fold se mide el MAE sobre el fold de prueba con las variables
    intactas y despues con cada variable barajada. La importancia es el
    promedio de los aumentos de MAE entre folds.
    """
    rng = np.random.default_rng(RANDOM_STATE)
    areas_por_fold = [
        list(modelos.keys()) for modelos in modelos_por_fold
    ]

    # MAE base de cada fold (prediccion out-of-fold ya calculada).
    mae_base_fold = [
        float(np.mean(np.abs(y_global[test_idx] - oof_global[test_idx])))
        for _, test_idx in indices_fold
    ]

    resultados = []
    for columna in X.columns:
        aumentos = []
        for i, (train_idx, test_idx) in enumerate(indices_fold):
            modelos = modelos_por_fold[i]
            X_te = X.iloc[test_idx].copy()
            y_real = y_global[test_idx]

            total = np.zeros(len(test_idx))
            for nombre in areas_por_fold[i]:
                total += np.clip(
                    np.asarray(modelos[nombre].predict(X_te), dtype=float), 0.0, 100.0
                )
            mae_base = float(np.mean(np.abs(y_real - np.clip(total, 0.0, 300.0))))

            # Se baraja la variable y se vuelve a predecir el fold de prueba.
            X_perm = X_te.copy()
            X_perm[columna] = rng.permutation(X_perm[columna].to_numpy())
            total_perm = np.zeros(len(test_idx))
            for nombre in areas_por_fold[i]:
                total_perm += np.clip(
                    np.asarray(modelos[nombre].predict(X_perm), dtype=float), 0.0, 100.0
                )
            mae_perm = float(np.mean(np.abs(y_real - np.clip(total_perm, 0.0, 300.0))))
            aumentos.append(mae_perm - mae_base)

        resultados.append((columna, float(np.mean(aumentos))))
    return resultados


# ---------------------------------------------------------------------------
# Graficos
# ---------------------------------------------------------------------------
def grafico_predicho_vs_real(y_real, y_pred, m, salida: Path):
    fig, ax = plt.subplots(figsize=(9, 6))
    estilo(ax)
    ax.scatter(
        y_real, y_pred, s=26, alpha=0.45, color=CIAN,
        edgecolors="white", linewidths=0.5,
    )
    lim_min = float(min(y_real.min(), y_pred.min())) - 5
    lim_max = float(max(y_real.max(), y_pred.max())) + 5
    ax.plot([lim_min, lim_max], [lim_min, lim_max], linestyle="--", color=AZUL,
            linewidth=1.6, label="Predicción perfecta (y = x)")
    ax.set_xlim(lim_min, lim_max)
    ax.set_ylim(lim_min, lim_max)
    ax.set_xlabel("Puntaje real observado (Saber Pro, 0-300)", fontsize=10)
    ax.set_ylabel("Puntaje predicho (0-300)", fontsize=10)
    ax.set_title(
        f"Puntaje predicho vs real (out-of-fold)\n"
        f"MAE {m['mae']:.2f} · RMSE {m['rmse']:.2f} · R² {m['r2']:.3f}",
        fontsize=13, fontweight="bold", color="#212f3d", pad=12,
    )
    ax.legend(frameon=False, fontsize=9, loc="upper left")
    fig.tight_layout()
    fig.savefig(salida, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def grafico_residuos(y_real, y_pred, m, salida: Path):
    resid = y_real - y_pred
    fig, ax = plt.subplots(figsize=(9, 5.5))
    estilo(ax)
    ax.axhline(0, color=AZUL, linewidth=1.5, linestyle="--")
    ax.scatter(y_pred, resid, s=26, alpha=0.45, color=VERDE,
               edgecolors="white", linewidths=0.5)
    ax.set_xlabel("Puntaje predicho (0-300)", fontsize=10)
    ax.set_ylabel("Residuo (real − predicho)", fontsize=10)
    ax.set_title(
        f"Residuales del modelo (out-of-fold) — MAE {m['mae']:.2f} puntos",
        fontsize=13, fontweight="bold", color="#212f3d", pad=12,
    )
    ax.text(
        0.99, 0.03,
        "Por encima de 0 el modelo subestimó el puntaje; por debajo, lo sobreestimó",
        transform=ax.transAxes, ha="right", fontsize=8.5, color=GRIS,
    )
    fig.tight_layout()
    fig.savefig(salida, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def grafico_errores_por_area(y, oof_areas, m_global, salida: Path):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.8))
    for ax in (ax1, ax2):
        estilo(ax)

    nombres, maes, colores = [], [], []
    for nombre in AREA_TARGETS:
        if nombre not in oof_areas:
            continue
        nombres.append(AREA_LABEL[nombre])
        maes.append(metricas(y[nombre].to_numpy(), oof_areas[nombre])["mae"])
        colores.append(AREA_COLOR[nombre])

    barras = ax1.bar(nombres, maes, color=colores, width=0.6)
    for barra, valor in zip(barras, maes):
        ax1.text(barra.get_x() + barra.get_width() / 2, valor + 0.08, f"{valor:.2f}",
                 ha="center", fontsize=9.5, fontweight="bold", color="#334155")
    ax1.set_ylabel("MAE (puntos sobre 100)", fontsize=10)
    ax1.set_title("Error por área del examen", fontsize=12, fontweight="bold",
                  color="#212f3d", pad=10)
    ax1.set_ylim(0, max(maes) * 1.28)

    barra = ax2.bar(["Global\n(suma de las áreas)"], [m_global["mae"]],
                     color=AZUL, width=0.4)
    ax2.text(barra[0].get_x() + barra[0].get_width() / 2, m_global["mae"] + 0.35,
             f"{m_global['mae']:.2f}", ha="center", fontsize=10.5,
             fontweight="bold", color="#334155")
    ax2.set_ylabel("MAE (puntos sobre 300)", fontsize=10)
    ax2.set_title("Error del puntaje global", fontsize=12, fontweight="bold",
                  color="#212f3d", pad=10)
    ax2.set_ylim(0, m_global["mae"] * 1.3)
    ax2.text(
        0.5, -0.26,
        "Ojo: el global se puntúa sobre 300 y las áreas sobre 100.\n"
        "Por eso van en dos paneles con escalas distintas.",
        transform=ax2.transAxes, ha="center", fontsize=8.5, color=ROJO,
    )

    fig.tight_layout()
    fig.savefig(salida, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def grafico_importancia(importancia, salida: Path):
    orden = sorted(importancia, key=lambda par: par[1])
    nombres = [par[0] for par in orden]
    valores = [par[1] for par in orden]
    colores = [ROJO if v > 0 else VERDE for v in valores]

    fig, ax = plt.subplots(figsize=(10, 6))
    estilo(ax)
    barras = ax.barh(nombres, valores, color=colores, height=0.65)
    ax.axvline(0, color="#334155", linewidth=1.1)
    escala = max(abs(min(valores)), abs(max(valores))) or 1
    for barra, valor in zip(barras, valores):
        ax.text(
            valor + (0.02 * escala if valor >= 0 else -0.02 * escala),
            barra.get_y() + barra.get_height() / 2,
            f"{valor:+.2f}",
            va="center", ha="left" if valor >= 0 else "right",
            fontsize=8.5, color="#334155",
        )
    ax.set_xlabel("Aumento del MAE al barajar la variable (puntos sobre 300)",
                  fontsize=10)
    ax.set_title(
        "Importancia de las variables (importancia por permutación, out-of-fold)",
        fontsize=12.5, fontweight="bold", color="#212f3d", pad=12,
    )
    ax.grid(axis="x", color="#e6ecf3", linewidth=0.8)
    ax.grid(axis="y", visible=False)
    ax.set_xlim(min(min(valores) - 0.25 * escala, -0.1),
                max(max(valores) + 0.25 * escala, 0.1))
    fig.tight_layout()
    fig.savefig(salida, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def grafico_bandas(y_global, cfg, bajo_max, medio_max, salida: Path):
    observada = bandas_de(np.asarray(y_global, dtype=float), bajo_max, medio_max)
    conteo_obs = {b: int((observada == b).sum()) for b in ("Bajo", "Medio", "Alto")}

    conn = psycopg2.connect(
        host=cfg["DB_HOST"], port=cfg["DB_PORT"], dbname=cfg["DB_NAME"],
        user=cfg["DB_USER"], password=cfg["DB_PASSWORD"],
    )
    try:
        cur = conn.cursor()
        cur.execute("SELECT clase, COUNT(*) FROM predictions GROUP BY clase")
        conteo_pred = {str(k).capitalize(): int(v) for k, v in cur.fetchall()}
    finally:
        conn.close()
    for banda in ("Bajo", "Medio", "Alto"):
        conteo_pred.setdefault(banda, 0)

    etiquetas = ["Bajo", "Medio", "Alto"]
    obs = [conteo_obs[b] for b in etiquetas]
    pred = [conteo_pred[b] for b in etiquetas]
    total_obs = max(sum(obs), 1)
    total_pred = max(sum(pred), 1)

    x = np.arange(len(etiquetas))
    ancho = 0.36
    fig, ax = plt.subplots(figsize=(9.5, 5.5))
    estilo(ax)
    barras_obs = ax.bar(x - ancho / 2, obs, ancho,
                        label="Observada (examen real)", color=AZUL)
    barras_pred = ax.bar(x + ancho / 2, pred, ancho,
                         label="Predicha (cohorte)", color=CIAN)
    maximo = max(obs + pred) or 1
    for barras, total in ((barras_obs, total_obs), (barras_pred, total_pred)):
        for barra in barras:
            valor = barra.get_height()
            ax.text(
                barra.get_x() + barra.get_width() / 2,
                valor + maximo * 0.015,
                f"{valor}\n({valor / total * 100:.0f}%)",
                ha="center", fontsize=8.5, color="#334155",
            )
    ax.set_xticks(x)
    ax.set_xticklabels(etiquetas)
    ax.set_ylabel("Estudiantes", fontsize=10)
    ax.set_title(
        f"Distribución por banda — cortes en {bajo_max:g} y {medio_max:g} puntos",
        fontsize=13, fontweight="bold", color="#212f3d", pad=12,
    )
    ax.legend(frameon=False, fontsize=9)
    ax.set_ylim(0, maximo * 1.25)
    fig.tight_layout()
    fig.savefig(salida, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def grafico_error_por_edad(X, y_global, oof_global, salida: Path):
    resid = np.abs(np.asarray(y_global, dtype=float) - oof_global)
    edad = pd.to_numeric(X["edad"], errors="coerce").to_numpy()
    rangos = [(0, 22), (22, 25), (25, 30), (30, 200)]
    etiquetas, maes, conteos = [], [], []
    for low, high in rangos:
        mask = (edad >= low) & (edad < high)
        if not mask.any():
            continue
        etiquetas.append(f"[{low}, {high})" if high < 200 else f"≥ {low}")
        maes.append(float(resid[mask].mean()))
        conteos.append(int(mask.sum()))

    fig, ax = plt.subplots(figsize=(9, 5))
    estilo(ax)
    barras = ax.bar(etiquetas, maes, color=AZUL, width=0.55)
    for barra, valor, n in zip(barras, maes, conteos):
        ax.text(barra.get_x() + barra.get_width() / 2, valor + 0.25,
                f"{valor:.2f}\n(n={n})", ha="center", fontsize=9,
                fontweight="bold", color="#334155")
    ax.set_xlabel("Rango de edad (años)", fontsize=10)
    ax.set_ylabel("MAE (puntos sobre 300)", fontsize=10)
    ax.set_title("Error del modelo por rango de edad (out-of-fold)",
                 fontsize=13, fontweight="bold", color="#212f3d", pad=12)
    ax.set_ylim(0, max(maes) * 1.32)
    fig.tight_layout()
    fig.savefig(salida, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 62)
    print("ANÁLISIS GRÁFICO DEL MODELO v2 (saberpro-v2)")
    print("=" * 62)

    cfg, X, y, stats, artefacto = cargar_datos()
    oof_global, oof_areas, modelos_por_fold, indices_fold = predicciones_oof(
        X, y, artefacto
    )
    y_global = y["global"].to_numpy()
    m_global = metricas(y_global, oof_global)
    print(f"Muestra: {len(X)} filas | MAE {m_global['mae']:.2f} | "
          f"RMSE {m_global['rmse']:.2f} | R² {m_global['r2']:.3f}  (out-of-fold)")

    bandas = artefacto.get("bandas") or {"bajo_max": 155.0, "medio_max": 184.0}
    bajo_max = float(bandas["bajo_max"])
    medio_max = float(bandas["medio_max"])

    print("Calculando importancia por permutación...")
    importancia = importancia_permutacion(
        X, y_global, oof_global, modelos_por_fold, indices_fold
    )

    salidas = [
        ("v2_predicho_vs_real.png",
         lambda p: grafico_predicho_vs_real(y_global, oof_global, m_global, p)),
        ("v2_residuos.png",
         lambda p: grafico_residuos(y_global, oof_global, m_global, p)),
        ("v2_errores_por_area.png",
         lambda p: grafico_errores_por_area(y, oof_areas, m_global, p)),
        ("v2_importance_variables.png",
         lambda p: grafico_importancia(importancia, p)),
        ("v2_distribucion_bandas.png",
         lambda p: grafico_bandas(y_global, cfg, bajo_max, medio_max, p)),
        ("v2_error_por_edad.png",
         lambda p: grafico_error_por_edad(X, y_global, oof_global, p)),
    ]

    print("-" * 62)
    for nombre, fn in salidas:
        destino = ANALYSIS_DIR / nombre
        fn(destino)
        print(f"  {nombre:<34} {destino.stat().st_size / 1024:8.1f} KB")

    print("-" * 62)
    print("Gráficos generados en", ANALYSIS_DIR)


if __name__ == "__main__":
    main()
