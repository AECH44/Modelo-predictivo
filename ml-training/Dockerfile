# Pipeline de entrenamiento (solo se ejecuta bajo demanda, no es un servicio).
# Se invoca con: docker-compose --profile train run --rm ml-training
#
# Entrena el modelo v2 con datos reales de dataset_saber_pro_real y persiste:
#   - trained_models/saberpro_model_v2.pkl   <- regresion del puntaje real
#   - data/background_sample_v2.pkl          (necesario para SHAP)
#   - models/saberpro_v2_metrics.json
# en el volumen ./ml-training montado en /app.
#
# El script v1 (train_from_real.py) queda disponible como referencia del
# modelo anterior (clasificador de banda):
#   docker-compose --profile train run --rm ml-training python train_from_real.py

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY train_from_real.py train_saberpro_v2.py analyze_results.py ./

# Por defecto reentrena el modelo v2 (puntaje real del examen).
# Si queres solo regenerar graficos:
#   docker-compose --profile train run --rm ml-training python analyze_results.py
CMD ["python", "train_saberpro_v2.py"]