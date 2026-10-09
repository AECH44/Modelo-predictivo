# ML Service — FastAPI (predicción)

Servicio interno en **FastAPI 0.142** que carga el modelo entrenado
(`ml-training/trained_models/saberpro_model.pkl`) y expone un endpoint
de predicción.

> Servicio interno: corre en `localhost:8000` y NO expone auth JWT.
> La auth vive en `backend/` (Express). El predictor de Express llama
> aquí vía HTTP.

## Stack

- FastAPI 0.142
- uvicorn 0.54
- scikit-learn 1.9 (carga el `.pkl`)
- pandas, numpy, joblib
- pydantic (validación de payloads)

## Cómo correr

```bash
# Setup
python -m venv .venv
.venv/Scripts/activate    # Windows
# source .venv/bin/activate   # Linux
pip install -r requirements.txt

# Servir
python run.py
# Equivalente: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints

- `GET /api/health` — health check (incluye `model_loaded: true/false`)
- `POST /api/predict` — predicción con las 13 features del `.pkl`
- `GET /docs` — Swagger UI (FastAPI auto-generado)

## Variables de entorno (opcional)

| Variable    | Default                                          | Descripción                  |
| ----------- | ------------------------------------------------ | ---------------------------- |
| `MODEL_PATH` | `ml-training/trained_models/saberpro_model.pkl` | Ruta al `.pkl` (relativa)    |

## Estructura

```
app/
├── __init__.py
├── main.py                       # FastAPI app + lifespan (carga .pkl al arrancar)
├── models/
│   └── student_model.py          # Pydantic con 13 features validadas
├── routes/
│   └── prediction_routes.py      # /api/health, /api/predict
└── services/
    └── prediction_service.py     # Carga .pkl, prepara features, predice
```

Para re-entrenar el modelo ver [`../ml-training/`](../ml-training/).
