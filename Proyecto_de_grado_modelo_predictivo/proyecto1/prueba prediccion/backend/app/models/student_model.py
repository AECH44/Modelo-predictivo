"""
Modelos Pydantic para el Sistema Predictor Saber Pro
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class StudentInput(BaseModel):
    """Modelo para entrada de prediccion Saber Pro"""
    model_config = {
        'protected_namespaces': (),
        'json_schema_extra': {
            'example': {
                'promedio_acumulado': 4.2,
                'promedio_basicas': 4.0,
                'promedio_ingenieria': 4.3,
                'num_reprobadas': 2,
                'pct_creditos': 75.5,
                'semestre': 6,
                'estrato': 3,
                'genero': 'M'
            }
        }
    }

    promedio_acumulado: float = Field(
        ..., ge=0, le=5,
        description="Promedio academico acumulado del estudiante (0-5)"
    )
    promedio_basicas: float = Field(
        ..., ge=0, le=5,
        description="Promedio de materias basicas (0-5)"
    )
    promedio_ingenieria: float = Field(
        ..., ge=0, le=5,
        description="Promedio de materias de ingenieria (0-5)"
    )
    num_reprobadas: int = Field(
        ..., ge=0, le=20,
        description="Numero de materias reprobadas"
    )
    pct_creditos: float = Field(
        ..., ge=0, le=100,
        description="Porcentaje de creditos aprobados (0-100)"
    )
    semestre: int = Field(
        ..., ge=1, le=10,
        description="Semestre actual del estudiante (1-10)"
    )
    estrato: int = Field(
        ..., ge=1, le=6,
        description="Estrato socioeconomico (1-6)"
    )
    genero: str = Field(
        ...,
        pattern="^(M|F)$",
        description="Genero del estudiante (M o F)"
    )


class PredictionResponse(BaseModel):
    """Modelo para respuesta de prediccion"""
    model_config = {
        'protected_namespaces': (),
        'json_schema_extra': {
            'example': {
                'resultado': 'Alto',
                'probabilidad': 0.87,
                'confidence_pct': 87.0,
                'recomendacion': 'Excelente rendimiento esperado. Mantén el nivel actual de estudio y considera participar en grupos de apoyo academico.',
                'timestamp': '2024-05-19T10:30:00',
                'model_version': '1.0.0'
            }
        }
    }

    resultado: str = Field(
        ...,
        description="Resultado de la prediccion: Bajo, Medio o Alto"
    )
    probabilidad: float = Field(
        ...,
        ge=0, le=1,
        description="Probabilidad/confianza de la prediccion (0-1)"
    )
    confidence_pct: float = Field(
        ...,
        ge=0, le=100,
        description="Porcentaje de confianza (0-100)"
    )
    recomendacion: str = Field(
        ...,
        description="Recomendacion personalizada para el estudiante"
    )
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Fecha y hora de la prediccion"
    )
    model_version: str = Field(
        default="1.0.0",
        description="Version del modelo ML utilizado"
    )


class PredictionHistory(BaseModel):
    """Modelo para registro individual en historial"""
    model_config = {'protected_namespaces': ()}

    id: int
    documento: str
    resultado: str
    probabilidad: float
    confidence_pct: float
    promedio_acumulado: float
    promedio_basicas: float
    promedio_ingenieria: float
    num_reprobadas: int
    pct_creditos: float
    semestre: int
    estrato: int
    genero: str
    recomendacion: str
    timestamp: datetime


class HistoryResponse(BaseModel):
    """Modelo para respuesta de historial de predicciones"""
    model_config = {'protected_namespaces': ()}

    documento: str
    predictions: List[PredictionHistory]
    total_predictions: int
    average_confidence: float
    average_probability: float


class CategoryStats(BaseModel):
    """Estadisticas por categoria"""
    model_config = {'protected_namespaces': ()}

    total: int
    avg_confidence: float
    avg_probability: float


class StatisticsResponse(BaseModel):
    """Modelo para estadisticas generales del sistema"""
    model_config = {
        'protected_namespaces': (),
        'json_schema_extra': {
            'example': {
                'total_predictions': 1500,
                'average_confidence': 82.5,
                'average_probability': 0.825,
                'category_distribution': {
                    'Bajo': {'total': 300, 'avg_confidence': 78.2, 'avg_probability': 0.782},
                    'Medio': {'total': 700, 'avg_confidence': 85.1, 'avg_probability': 0.851},
                    'Alto': {'total': 500, 'avg_confidence': 88.3, 'avg_probability': 0.883}
                },
                'timestamp': '2024-05-19T10:30:00'
            }
        }
    }

    total_predictions: int
    average_confidence: float
    average_probability: float
    category_distribution: dict
    timestamp: datetime


class HealthResponse(BaseModel):
    """Modelo para respuesta de health check"""
    model_config = {'protected_namespaces': ()}

    status: str
    model_loaded: bool
    database_connected: bool
    model_version: str
    timestamp: datetime