"""
Genera graficos y reporte markdown a partir de metrics.json (producido por
train_from_real.py).

Salidas en ml/analysis/:
  - comparacion_metricas.png
  - matriz_confusion_<modelo>.png (una por modelo)
  - feature_importance.png (solo GradientBoosting)
  - distribucion_clases.png
  - roc_curves.png (solo el mejor modelo)
  - reporte.md
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import roc_curve, auc
from sklearn.preprocessing import label_binarize

plt.style.use("seaborn-v0_8-whitegrid")
plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["axes.titlesize"] = 13
plt.rcParams["axes.labelsize"] = 11
plt.rcParams["figure.dpi"] = 110

CLASS_NAMES = ["Bajo", "Medio", "Alto"]
PALETTE = {
    "Bajo": "#d62728",
    "Medio": "#ffbb33",
    "Alto": "#2ca02c",
    "LogisticRegression": "#1f77b4",
    "GradientBoostingClassifier": "#ff7f0e",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_metrics(metrics_path: Path) -> dict:
    return json.loads(metrics_path.read_text(encoding="utf-8"))


def load_pipeline(model_path: Path):
    return joblib.load(model_path)


def feature_names_from_pipeline(pipeline) -> list[str]:
    """Devuelve los nombres de columnas DESPUES del ColumnTransformer."""
    pre = pipeline.named_steps["preprocessor"]
    names: list[str] = []
    for name, transformer, cols in pre.transformers_:
        if name == "num":
            names.extend(cols)
        elif name == "cat":
            ohe = transformer.named_steps["onehot"]
            names.extend(ohe.get_feature_names_out(cols).tolist())
    return names


# ---------------------------------------------------------------------------
# Figuras
# ---------------------------------------------------------------------------

def plot_comparacion_metricas(metrics: dict, out: Path) -> None:
    names = list(metrics["all_models"].keys())
    keys = ["accuracy", "precision_weighted", "recall_weighted", "f1_weighted"]
    labels = ["Accuracy", "Precision", "Recall", "F1 (weighted)"]
    data = {m: [metrics["all_models"][m][k] for k in keys] for m in names}

    x = np.arange(len(keys))
    width = 0.35
    fig, ax = plt.subplots(figsize=(8, 5))
    for i, m in enumerate(names):
        offset = (i - (len(names) - 1) / 2) * width
        bars = ax.bar(x + offset, data[m], width, label=m, color=PALETTE[m])
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, h + 0.005,
                    f"{h:.3f}", ha="center", va="bottom", fontsize=8)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score")
    ax.set_title("Comparacion de metricas por modelo (test set)")
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)


def plot_matriz_confusion(cm: list, name: str, out: Path) -> None:
    arr = np.array(cm)
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(arr, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(arr.shape[1]),
        yticks=np.arange(arr.shape[0]),
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        ylabel="Real",
        xlabel="Predicho",
        title=f"Matriz de confusion - {name}",
    )
    thresh = arr.max() / 2
    for i in range(arr.shape[0]):
        for j in range(arr.shape[1]):
            ax.text(j, i, f"{arr[i, j]}",
                    ha="center", va="center",
                    color="white" if arr[i, j] > thresh else "black",
                    fontsize=12)
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)


def plot_feature_importance(pipeline, name: str, out: Path, top_n: int = 15) -> None:
    clf = pipeline.named_steps["classifier"]
    if not hasattr(clf, "feature_importances_"):
        return
    feat_names = feature_names_from_pipeline(pipeline)
    importances = clf.feature_importances_
    order = np.argsort(importances)[-top_n:]

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh([feat_names[i] for i in order], importances[order], color="#2ca02c")
    ax.set_xlabel("Importancia")
    ax.set_title(f"Top {top_n} features - {name}")
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)


def plot_distribucion_clases(test_predictions: dict, out: Path) -> None:
    y_test = test_predictions["y_test"]
    y_pred = test_predictions["y_pred"]
    real_counts = pd.Series(y_test).value_counts().reindex(CLASS_NAMES, fill_value=0)
    pred_counts = pd.Series(y_pred).value_counts().reindex(CLASS_NAMES, fill_value=0)

    x = np.arange(len(CLASS_NAMES))
    width = 0.4
    fig, ax = plt.subplots(figsize=(7, 5))
    bars1 = ax.bar(x - width / 2, real_counts.values, width, label="Real (test)",
                   color="#1f77b4")
    bars2 = ax.bar(x + width / 2, pred_counts.values, width, label="Predicho (test)",
                   color="#ff7f0e")
    for bars in (bars1, bars2):
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, h + 0.5,
                    f"{int(h)}", ha="center", va="bottom", fontsize=9)
    ax.set_xticks(x)
    ax.set_xticklabels(CLASS_NAMES)
    ax.set_ylabel("Conteo")
    ax.set_title("Distribucion de clases: real vs predicho (test set)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)


def plot_roc_curves(pipeline, y_test: list[str], y_proba: list[list[float]],
                    name: str, out: Path) -> None:
    y_int = np.array([CLASS_NAMES.index(y) for y in y_test])
    y_bin = label_binarize(y_int, classes=[0, 1, 2])
    y_proba_arr = np.array(y_proba)

    # Reordenar columnas de y_proba al orden fijo Bajo/Medio/Alto.
    # pipeline.predict_proba devuelve columnas en el orden de pipeline.classes_,
    # que puede no coincidir con CLASS_NAMES.
    class_to_col = {cls: i for i, cls in enumerate(pipeline.classes_)}
    y_proba_ordered = np.zeros_like(y_proba_arr)
    for i, cls in enumerate(CLASS_NAMES):
        y_proba_ordered[:, i] = y_proba_arr[:, class_to_col[cls]]

    fig, ax = plt.subplots(figsize=(7, 5))
    for i, cls in enumerate(CLASS_NAMES):
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_proba_ordered[:, i])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, color=PALETTE[cls], lw=2,
                label=f"{cls} (AUC = {roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=1, alpha=0.5)
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(f"Curvas ROC (one-vs-rest) - {name}")
    ax.legend(loc="lower right")
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)


# ---------------------------------------------------------------------------
# Reporte markdown
# ---------------------------------------------------------------------------

def write_report(metrics: dict, analysis_dir: Path) -> None:
    best = metrics["best_model"]
    bm = metrics["best_model_metrics"]
    target = metrics["target_derivation"]
    cm = np.array(bm["confusion_matrix"])
    rep = bm["classification_report"]

    def fmt(v):
        return f"{v:.4f}" if isinstance(v, (int, float)) else str(v)

    md = []
    md.append("# Reporte de resultados - Modelo Predictor Saber Pro\n")
    md.append(f"- **Version del modelo**: `{metrics['model_version']}`")
    md.append(f"- **Fuente**: {metrics['source']}")
    md.append(f"- **Filas en dataset**: {metrics['rows_total']}")
    md.append(f"- **Filas usadas**: {metrics['rows_used']}")
    md.append(f"- **Mejor modelo**: **{best}**\n")

    md.append("## Derivacion del target\n")
    md.append(f"Target derivado de la columna `{target['from_column']}`:\n")
    md.append("| Clase | Rango |")
    md.append("|-------|-------|")
    md.append(f"| Bajo  | {target['Bajo']} |")
    md.append(f"| Medio | {target['Medio']} |")
    md.append(f"| Alto  | {target['Alto']} |")
    md.append(f"\nExcluidos: {target['excluded']}\n")

    md.append("## Metricas del mejor modelo (test set)\n")
    md.append("| Metrica | Valor |")
    md.append("|---------|-------|")
    md.append(f"| Accuracy | {fmt(bm['accuracy'])} |")
    md.append(f"| Precision (weighted) | {fmt(bm['precision_weighted'])} |")
    md.append(f"| Recall (weighted) | {fmt(bm['recall_weighted'])} |")
    md.append(f"| F1 (weighted) | {fmt(bm['f1_weighted'])} |")
    md.append(f"| ROC AUC (OvR weighted) | {fmt(bm['roc_auc_ovr_weighted'])} |\n")

    md.append("## Classification report\n")
    md.append("| Clase | Precision | Recall | F1 | Support |")
    md.append("|-------|-----------|--------|----|---------|")
    for cls in CLASS_NAMES:
        r = rep[cls]
        md.append(f"| {cls} | {fmt(r['precision'])} | {fmt(r['recall'])} | "
                  f"{fmt(r['f1-score'])} | {int(r['support'])} |")
    md.append("")

    md.append("## Matriz de confusion (test set)\n")
    md.append("| | Pred: Bajo | Pred: Medio | Pred: Alto |")
    md.append("|---|---|---|---|")
    for i, cls in enumerate(CLASS_NAMES):
        row = " | ".join(str(int(cm[i, j])) for j in range(3))
        md.append(f"| **Real: {cls}** | {row} |")
    md.append("")

    md.append("## Comparacion de modelos\n")
    md.append("| Modelo | Accuracy | Precision | Recall | F1 | ROC AUC |")
    md.append("|--------|----------|-----------|--------|----|---------|")
    for name, m in metrics["all_models"].items():
        md.append(
            f"| {name} | {fmt(m['accuracy'])} | {fmt(m['precision_weighted'])} | "
            f"{fmt(m['recall_weighted'])} | {fmt(m['f1_weighted'])} | "
            f"{fmt(m['roc_auc_ovr_weighted'])} |"
        )
    md.append("")

    md.append("## Graficos generados\n")
    md.append("- `comparacion_metricas.png`")
    md.append(f"- `matriz_confusion_{best.lower()}.png`")
    if best == "GradientBoostingClassifier":
        md.append("- `feature_importance.png`")
    md.append("- `distribucion_clases.png`")
    md.append("- `roc_curves.png`\n")

    md.append("## Nota importante\n")
    md.append(
        "El target se deriva del `promedio_acumulado` del estudiante porque el "
        "dataset no contiene el puntaje real de Saber Pro. El modelo aprende a "
        "predecir el rendimiento academico agregado, no el desempeno en la "
        "prueba estandarizada. Para una prediccion real de Saber Pro se "
        "necesitaria un dataset con la variable objetivo real."
    )

    report_path = analysis_dir / "reporte.md"
    report_path.write_text("\n".join(md), encoding="utf-8")
    print(f"Reporte guardado en: {report_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    base = Path(__file__).resolve().parent
    metrics_path = base / "models" / "desercion_metrics.json"
    model_path = base / "trained_models" / "saberpro_model.pkl"
    out_dir = base / "analysis"
    out_dir.mkdir(parents=True, exist_ok=True)

    metrics = load_metrics(metrics_path)
    pipeline = load_pipeline(model_path)

    print("=" * 60)
    print("ANALISIS DE RESULTADOS")
    print("=" * 60)
    print(f"Mejor modelo: {metrics['best_model']}")

    plot_comparacion_metricas(metrics, out_dir / "comparacion_metricas.png")
    print(f"[OK] comparacion_metricas.png")

    for name in metrics["all_models"].keys():
        cm = metrics["all_models"][name]["confusion_matrix"]
        slug = name.lower()
        plot_matriz_confusion(cm, name, out_dir / f"matriz_confusion_{slug}.png")
        print(f"[OK] matriz_confusion_{slug}.png")

    if metrics["best_model"] == "GradientBoostingClassifier":
        plot_feature_importance(pipeline, metrics["best_model"],
                                out_dir / "feature_importance.png")
        print(f"[OK] feature_importance.png")

    test_pred = metrics["test_predictions"]
    plot_distribucion_clases(test_pred, out_dir / "distribucion_clases.png")
    print(f"[OK] distribucion_clases.png")

    plot_roc_curves(
        pipeline, test_pred["y_test"], test_pred["y_proba"],
        metrics["best_model"], out_dir / "roc_curves.png",
    )
    print(f"[OK] roc_curves.png")

    write_report(metrics, out_dir)
    print(f"\nTodos los graficos y reporte en: {out_dir}")


if __name__ == "__main__":
    main()
