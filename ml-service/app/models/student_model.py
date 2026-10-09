"""
Modelos Pydantic para el Sistema Predictor Saber Pro

Adaptado al modelo real (saberpro_model.pkl) entrenado con datos
de `dataset_saber_pro_real` (736 filas, version real-data-v1).
El modelo espera 13 features: 11 numericas + 2 categoricas.
"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class StudentInput(BaseModel):
    """Entrada para prediccion con el modelo real (13 features)."""
    model_config = {
        'protected_namespaces': (),
        'json_schema_extra': {
            'example': {
                'promedio_materias_basicas': 3.5,
                'promedio_ingenieria': 3.8,
                'promedio_programacion': 3.6,
                'promedio_matematica_estadistica': 3.4,
                'asignaturas_reprobadas': 1,
                'porcentaje_avance': 70.0,
                'semestre_actual': 5,
                'estrato': 3,
                'creditos_aprobados': 80,
                'asignaturas_aprobadas': 25,
                'edad': 22,
                'genero': 'M',
                'promedio_ingles_nivel': 'B1',
            }
        }
    }

    # 11 features numericas
    promedio_materias_basicas: float = Field(..., ge=0, le=5)
    promedio_ingenieria: float = Field(..., ge=0, le=5)
    promedio_programacion: float = Field(..., ge=0, le=5)
    promedio_matematica_estadistica: float = Field(..., ge=0, le=5)
    asignaturas_reprobadas: int = Field(..., ge=0, le=50)
    porcentaje_avance: float = Field(..., ge=0, le=100)
    semestre_actual: int = Field(..., ge=1, le=12)
    estrato: int = Field(..., ge=1, le=6)
    creditos_aprobados: int = Field(..., ge=0, le=300)
    asignaturas_aprobadas: int = Field(..., ge=0, le=80)
    edad: int = Field(..., ge=14, le=80)

    # 2 features categoricas
    genero: str = Field(..., pattern="^(M|F)$")
    promedio_ingles_nivel: str = Field(..., pattern="^(A1|A2|B1|B2|C1|C2)$")


class PredictionResponse(BaseModel):
    """Respuesta de prediccion."""
    model_config = {
        'protected_namespaces': (),
        'json_schema_extra': {
            'example': {
                'resultado': 'Medio',
                'probabilidad': 0.87,
                'confidence_pct': 87.0,
                'recomendacion': 'Buen desempeno. Refuerza tus areas debiles.',
                'timestamp': '2026-10-02T10:30:00',
                'model_version': 'real-data-v1',
                'probabilities': {'Bajo': 0.05, 'Medio': 0.87, 'Alto': 0.08},
            }
        }
    }

    resultado: str = Field(..., description="Bajo, Medio o Alto")
    probabilidad: float = Field(..., ge=0, le=1)
    confidence_pct: float = Field(..., ge=0, le=100)
    recomendacion: str
    timestamp: datetime
    model_version: str = "real-data-v1"
    probabilities: dict = Field(default_factory=dict)


class HealthResponse(BaseModel):
    model_config = {'protected_namespaces': ()}
    status: str
    model_loaded: bool
    database_connected: bool
    model_version: str
    timestamp: datetime


class StatisticsResponse(BaseModel):
    model_config = {'protected_namespaces': ()}
    total_predictions: int
    average_confidence: float
    average_probability: float
    category_distribution: dict
    timestamp: datetime


class CategoryStats(BaseModel):
    model_config = {'protected_namespaces': ()}
    total: int
    avg_confidence: float
    avg_probability: float


class PredictionHistory(BaseModel):
    model_config = {'protected_namespaces': ()}
    id: int
    documento: str
    resultado: str
    probabilidad: float
    confidence_pct: float
    timestamp: datetime


class HistoryResponse(BaseModel):
    model_config = {'protected_namespaces': ()}
    documento: str
    predictions: List[PredictionHistory]
    total_predictions: int
    average_confidence: float
    average_probability: float
