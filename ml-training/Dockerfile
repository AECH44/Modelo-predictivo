# Pipeline de entrenamiento (solo se ejecuta bajo demanda, no es un servicio).
# Se invoca con: docker-compose --profile train run --rm ml-training
#
# Entrena el modelo con datos reales de dataset_saber_pro_real y persiste:
#   - trained_models/saberpro_model.pkl
#   - data/background_sample.pkl  (necesario para SHAP)
#   - models/desercion_metrics.json
# en el volumen ./ml-training montado en /app.

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY train_from_real.py analyze_results.py ./

# Por defecto reentrena. Si queres solo regenerar graficos:
#   docker-compose --profile train run --rm ml-training python analyze_results.py
CMD ["python", "train_from_real.py"]