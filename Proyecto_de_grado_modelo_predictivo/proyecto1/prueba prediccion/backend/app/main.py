"""
FastAPI - Servidor Backend para Sistema Predictor Saber Pro
Sistema de Predicción de Resultados Saber Pro con Regresión Logística Múltiple
"""
import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routes.prediction_routes import router as prediction_router
from .routes.auth_routes import router as auth_router
from .services.prediction_service import PredictionService
from .services.auth_service import set_demo_mode
from .database.connection import test_connection, get_connection, set_db_available

# Cargar variables de entorno
load_dotenv()

# Configurar logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuración
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', FRONTEND_URL).split(',')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestor del ciclo de vida de la aplicación FastAPI
    - Startup: Cargar modelo ML, probar conexión a BD
    - Shutdown: Limpiar recursos
    """
    # Startup
    logger.info("=" * 50)
    logger.info("Iniciando Sistema Predictor Saber Pro")
    logger.info("=" * 50)

    # Prueba conexión a base de datos
    db_connected = test_connection()
    set_db_available(db_connected)  # Actualizar estado de BD
    PredictionService.set_db_connected(db_connected)
    set_demo_mode(not db_connected)  # Activar modo demo si no hay BD
    if db_connected:
        logger.info("Base de datos PostgreSQL conectada")
    else:
        logger.warning("No se pudo conectar a la base de datos (modo demo)")

    # Carga modelo ML
    model_loaded = PredictionService.load_model()
    if model_loaded:
        logger.info("Modelo ML cargado exitosamente")
    else:
        logger.warning("Modelo ML no encontrado (modo demo activo)")

    logger.info("=" * 50)
    logger.info("Sistema iniciado correctamente")
    logger.info("=" * 50)

    yield

    # Shutdown
    logger.info("Apagando Sistema Predictor Saber Pro...")


# Crear aplicación FastAPI
app = FastAPI(
    title="Sistema Predictor Saber Pro",
    description="""
## API REST para Predicción de Resultados Saber Pro

Este sistema utiliza un modelo de **Regresión Logística Múltiple** para predecir
el rendimiento esperado de estudiantes universitarios en el examen Saber Pro.

### Características

- Predicción individual de desempeño (Bajo, Medio, Alto)
- Historial de predicciones por estudiante
- Estadísticas generales del sistema
- Recomendaciones personalizadas basadas en resultados

### Modelo ML

El modelo considera las siguientes variables de entrada:
- Promedio académico acumulado
- Promedio de materias básicas
- Promedio de materias de ingeniería
- Número de materias reprobadas
- Porcentaje de créditos aprobados
- Semestre actual
- Estrato socioeconómico
- Género

### Autores
Sistema desarrollado para la Universidad.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)


# CORS Middleware - Configuración para frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "X-Content-Range", "X-Total-Count"],
)


# Incluir rutas de la API
app.include_router(auth_router)
app.include_router(prediction_router)


# ============================================
# RUTAS RAÍZ
# ============================================

@app.get("/", tags=["info"])
async def root():
    """Endpoint raíz - Información del sistema"""
    return {
        "message": "Sistema Predictor Saber Pro",
        "description": "API REST para predicción de resultados Saber Pro",
        "version": "1.0.0",
        "model_type": "Regresión Logística Múltiple",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/api/health",
            "predict": "POST /api/predict",
            "history": "GET /api/history/{documento}",
            "statistics": "GET /api/statistics"
        }
    }


@app.get("/api/", tags=["info"])
async def api_root():
    """Endpoint raíz de la API"""
    return {
        "name": "Predictor Saber Pro API",
        "version": "1.0.0",
        "endpoints": {
            "prediccion": {
                "method": "POST",
                "path": "/api/predict",
                "description": "Realizar predicción de desempeño"
            },
            "historial": {
                "method": "GET",
                "path": "/api/history/{documento}",
                "description": "Obtener historial de predicciones"
            },
            "estadisticas": {
                "method": "GET",
                "path": "/api/statistics",
                "description": "Obtener estadísticas del sistema"
            },
            "salud": {
                "method": "GET",
                "path": "/api/health",
                "description": "Verificar estado del sistema"
            }
        }
    }


# ============================================
# MANEJO DE ERRORES GLOBAL
# ============================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Captura excepciones no manejadas globalmente"""
    logger.error(f"Error no manejado en {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor",
            "error": str(exc) if DEBUG else "Error procesando solicitud",
            "timestamp": datetime.now().isoformat()
        }
    )


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Maneja errores de validación de datos"""
    logger.warning(f"Error de validación en {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Datos de entrada inválidos",
            "error": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )


# ============================================
# INICIO DEL SERVIDOR
# ============================================

if __name__ == "__main__":
    import uvicorn

    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', '8000'))

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level=LOG_LEVEL.lower()
    )
