import json
from pathlib import Path


def main():
    metrics_path = Path(__file__).resolve().parents[1] / "models" / "desercion_metrics.json"
    if not metrics_path.exists():
        raise SystemExit(
            "No se encontro desercion_metrics.json. "
            "Ejecuta primero entrenar_modelo_predictivo.py"
        )

    with metrics_path.open("r", encoding="utf-8") as f:
        metrics = json.load(f)

    cm = metrics.get("confusion_matrix")
    report = metrics.get("report", {})
    roc_auc = metrics.get("roc_auc")

    if cm:
        print("Matriz de confusion (filas = real, columnas = predicho):")
        print(f"TN={cm[0][0]}  FP={cm[0][1]}")
        print(f"FN={cm[1][0]}  TP={cm[1][1]}")
        print("")

    accuracy = report.get("accuracy")
    if accuracy is not None:
        print(f"Accuracy: {accuracy:.4f}")

    macro = report.get("macro avg", {})
    if macro:
        print(
            "Macro avg - precision: {p:.4f}, recall: {r:.4f}, f1: {f1:.4f}".format(
                p=macro.get("precision", 0),
                r=macro.get("recall", 0),
                f1=macro.get("f1-score", 0),
            )
        )

    if roc_auc is not None:
        print(f"ROC AUC: {roc_auc:.4f}")


if __name__ == "__main__":
    main()
