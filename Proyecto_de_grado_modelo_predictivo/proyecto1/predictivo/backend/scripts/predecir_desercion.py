import json
import sys
from pathlib import Path

import pandas as pd
import joblib

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


def load_payload():
    raw = sys.stdin.read()
    if not raw.strip():
        raise ValueError("Entrada vacia")
    data = json.loads(raw)
    if isinstance(data, dict) and "data" in data:
        data = data["data"]
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise ValueError("Formato invalido; se espera objeto o lista de objetos")
    return data


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        load_dotenv(env_path)

    payload = load_payload()

    df = pd.DataFrame(payload)
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"Faltan columnas requeridas: {', '.join(missing)}")

    model_path = Path(__file__).resolve().parents[1] / "models" / "desercion_model.joblib"
    if not model_path.exists():
        raise FileNotFoundError(
            "No se encontro el modelo. Entrena primero con entrenar_modelo_predictivo.py"
        )

    model = joblib.load(model_path)

    probs = model.predict_proba(df[FEATURES])[:, 1]
    preds = model.predict(df[FEATURES])

    results = []
    for i, row in df.iterrows():
        results.append(
            {
                "input": {k: row.get(k) for k in FEATURES},
                "prediccion": int(preds[i]),
                "prob_deserto": float(probs[i]),
            }
        )

    print(json.dumps({"results": results}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)
