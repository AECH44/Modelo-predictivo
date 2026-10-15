# Servicio FastAPI que sirve el modelo ML real (saberpro_model.pkl).
#
# Estructura esperada dentro del contenedor:
#   /ml-service/
#     app/
#       main.py
#       services/prediction_service.py  <- usa BASE_DIR = Path(__file__).parent.parent.parent.parent
#     ml-training/                      <- volumen montado (no en la imagen)
#       trained_models/saberpro_model.pkl
#       data/background_sample.pkl
#
# BASE_DIR del prediction_service.py resuelve a "/" dentro del contenedor
# (porque el archivo esta en /ml-service/app/services/ y sube 4 niveles).
# Por eso los volumenes se montan en /ml-training/ y /<nombre>, no en /app.

FROM python:3.11-slim

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
ENV MODEL_PATH=ml-training/trained_models/saberpro_model.pkl

EXPOSE 8000

# --reload: reinicia al editar archivos en /ml-service/app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]