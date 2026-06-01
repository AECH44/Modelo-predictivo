"""
Rutas API para el Sistema Predictor Saber Pro
"""
from fastapi import APIRouter, HTTPException, Query, status, Depends, Request
from typing import Optional

import logging
from datetime import datetime

from ..models.student_model import (
    StudentInput,
    PredictionResponse,
    HistoryResponse,
    StatisticsResponse,
    HealthResponse
)
from ..services.prediction_service import PredictionService
from ..middleware.auth_middleware import get_current_user_dependency

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["predictions"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Realizar predicción",
    description="Endpoint para predecir el desempeño esperado en el examen Saber Pro"
)
async def predict_performance(
    student_data: StudentInput,
    documento: Optional[str] = Query(
        None,
        description="Número de documento del estudiante (opcional para demo)",
        min_length=5,
        max_length=20
    ),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Realiza una predicción del rendimiento Saber Pro para un estudiante.

    Parámetros del estudiante:
    - **promedio_acumulado**: Promedio académico acumulado (0-5)
    - **promedio_basicas**: Promedio de materias básicas (0-5)
    - **promedio_ingenieria**: Promedio de materias de ingeniería (0-5)
    - **num_reprobadas**: Número de materias reprobadas (0-20)
    - **pct_creditos**: Porcentaje de créditos aprobados (0-100)
    - **semestre**: Semestre actual (1-10)
    - **estrato**: Estrato socioeconómico (1-6)
    - **genero**: Género (M o F)

    Retorna:
    - **resultado**: Categoría de predicción (Bajo, Medio, Alto)
    - **probabilidad**: Confianza de la predicción (0-1)
    - **confidence_pct**: Porcentaje de confianza (0-100)
    - **recomendacion**: Recomendaciones personalizadas
    - **timestamp**: Fecha y hora de la predicción
    - **model_version**: Versión del modelo ML
    """
    try:
        # Usar documento o generar uno demo
        doc = documento if documento else f"demo_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Realizar predicción
        prediction = PredictionService.predict(student_data, doc)

        logger.info(
            f"Predicción exitosa: documento={doc}, "
            f"resultado={prediction.resultado}, "
            f"confianza={prediction.confidence_pct}%"
        )

        return prediction

    except Exception as e:
        logger.error(f"Error en predicción: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando predicción: {str(e)}"
        )


@router.get(
    "/history/{documento}",
    response_model=HistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Historial de predicciones",
    description="Obtiene el historial de predicciones de un estudiante"
)
async def get_prediction_history(
    documento: str,
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Cantidad máxima de registros a retornar"
    ),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Obtiene el histórico de predicciones de un estudiante específico.

    Parámetros:
    - **documento**: Número de documento del estudiante
    - **limit**: Cantidad máxima de registros (default: 10, máximo: 100)

    Retorna:
    - **documento**: Número de documento del estudiante
    - **predictions**: Lista de predicciones históricas
    - **total_predictions**: Total de predicciones encontradas
    - **average_confidence**: Promedio de confianza
    - **average_probability**: Promedio de probabilidad
    """
    try:
        history = PredictionService.get_student_history(documento, limit)

        logger.info(
            f"Historial obtenido para documento={documento}, "
            f"total={history.total_predictions}"
        )

        return history

    except Exception as e:
        logger.error(f"Error obteniendo historial: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo historial: {str(e)}"
        )


@router.get(
    "/statistics",
    response_model=StatisticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Estadísticas del sistema",
    description="Obtiene estadísticas generales del sistema de predicciones"
)
async def get_system_statistics(
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Obtiene estadísticas generales del sistema de predicciones.

    Retorna:
    - **total_predictions**: Total de predicciones realizadas
    - **average_confidence**: Promedio de confianza general
    - **average_probability**: Promedio de probabilidad general
    - **category_distribution**: Distribución por categoría
    - **timestamp**: Fecha y hora de la consulta
    """
    try:
        stats = PredictionService.get_statistics()

        logger.info(
            f"Estadísticas obtenidas: total={stats.total_predictions}, "
            f"avg_confidence={stats.average_confidence}%"
        )

        return stats

    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Verifica el estado del sistema y sus componentes"
)
async def health_check():
    """
    Verifica el estado del sistema y sus componentes.

    Retorna:
    - **status**: Estado general del sistema (healthy/degraded)
    - **model_loaded**: Si el modelo ML está cargado
    - **database_connected**: Si la base de datos está conectada
    - **model_version**: Versión del modelo
    - **timestamp**: Fecha y hora de la verificación
    """
    try:
        health_info = PredictionService.health_check()

        return HealthResponse(**health_info)

    except Exception as e:
        logger.error(f"Error en health check: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en health check: {str(e)}"
        )
