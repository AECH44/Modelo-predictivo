# Servicio FastAPI que sirve el modelo ML real.
#
# Estructura esperada dentro del contenedor:
#   /ml-service/
#     app/
#       main.py
#       services/prediction_service.py  <- usa BASE_DIR = Path(__file__).parent.parent.parent.parent
#     ml-training/                      <- volumen montado (no en la imagen)
#       trained_models/saberpro_model_v2.pkl   <- modelo v2 (regresion del puntaje)
#       trained_models/saberpro_model.pkl      <- modelo v1 (fallback)
#       data/background_sample_v2.pkl
#
# BASE_DIR del prediction_service.py resuelve a "/" dentro del contenedor
# (porque el archivo esta en /ml-service/app/services/ y sube 4 niveles).
# Por eso los volumenes se montan en /ml-training/ y /<nombre>, no en /app.

# Python 3.14: es el requisito minimo de numpy 2.5.4 / scipy 1.18.1 / shap
# 0.53.0 (no publican wheels para 3.11) y coincide con la version del venv
# local con la que se entreno y verifico el modelo v2. El .pkl se serializo
# con scikit-learn 1.9.1: cambiar de version rompe el unpickle.
FROM python:3.14-slim

WORKDIR /ml-service

# Evitar bytecode .pyc y forzar logs sin buffer (para ver en docker logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Instalar deps
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copiar el codigo del servicio
COPY app ./app

# El modelo y background se montan como volumenes en docker-compose.
# El v2 (regresion del puntaje real) tiene prioridad; el v1 queda como fallback.
ENV MODEL_PATH_V2=ml-training/trained_models/saberpro_model_v2.pkl \
    MODEL_PATH=ml-training/trained_models/saberpro_model.pkl

EXPOSE 8000

# --reload: reinicia al editar archivos en /ml-service/app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]