"""
Modelos Pydantic para el Sistema Predictor Saber Pro

Adaptado al modelo real (saberpro_model.pkl) entrenado con datos
de `dataset_saber_pro_real` (736 filas, version real-data-v1).
El modelo espera 13 features: 11 numericas + 2 categoricas.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class StudentInput(BaseModel):
    """Entrada para prediccion con el modelo real v2 (14 features)."""
    model_config = {
        'protected_namespaces': (),
        'json_schema_extra': {
            'example': {
                'promedio_acumulado': 3.6,
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

    # 12 features numericas
    # `promedio_acumulado` entra desde el modelo v2: alli el target es un
    # puntaje real de examen, no una funcion del propio promedio, asi que no
    # hay fuga de informacion y es la feature mas informativa.
    promedio_acumulado: float = Field(..., ge=0, le=5)
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


class AreaScore(BaseModel):
    """Puntaje estimado en una de las areas del examen (escala 0-100)."""
    model_config = {'protected_namespaces': ()}
    id: str = Field(..., description="matematicas, lectura_critica o ingles")
    label: str
    score: float = Field(..., ge=0, le=100)


class FeatureContribution(BaseModel):
    """Una contribucion SHAP para una feature individual."""
    model_config = {'protected_namespaces': ()}
    feature: str = Field(..., description="Nombre de la feature (post-transform)")
    contribution: float = Field(..., description="Aporte al puntaje estimado")
    abs_contribution: float = Field(..., description="Magnitud para ordenar de mayor a menor impacto")


class PredictionResponse(BaseModel):
    """Respuesta de prediccion."""
    model_config = {
        'protected_namespaces': (),
        'json_schema_extra': {
            'example': {
                'resultado': 'Medio',
                'probabilidad': 0.62,
                'confidence_pct': 62.0,
                'recomendacion': 'Tu puntaje estimado en el Saber Pro es 280 ...',
                'timestamp': '2026-10-22T10:30:00',
                'model_version': 'saberpro-v2',
                'probabilities': {'Alto': 0.18, 'Medio': 0.62, 'Bajo': 0.20},
                'puntaje_estimado': 280.4,
                'puntaje_minimo': 249.5,
                'puntaje_maximo': 311.3,
                'areas': [
                    {'id': 'matematicas', 'label': 'Matematicas / Razonamiento cuantitativo', 'score': 58.1},
                    {'id': 'lectura_critica', 'label': 'Lectura critica', 'score': 60.4},
                    {'id': 'ingles', 'label': 'Ingles', 'score': 55.2},
                ],
                'feature_contributions': [
                    {'feature': 'num__promedio_acumulado', 'contribution': 12.4, 'abs_contribution': 12.4},
                ],
            }
        }
    }

    resultado: str = Field(..., description="Bajo, Medio o Alto (banda sobre el puntaje estimado)")
    probabilidad: float = Field(..., ge=0, le=1)
    confidence_pct: float = Field(..., ge=0, le=100)
    recomendacion: str
    timestamp: datetime
    model_version: str = "saberpro-v2"
    probabilities: dict = Field(default_factory=dict)
    feature_contributions: List[FeatureContribution] = Field(
        default_factory=list,
        description="Lista ordenada desc por |contribution|. Vacia si SHAP no esta disponible.",
    )

    # --- v2: el puntaje es la salida real del modelo ---
    puntaje_estimado: Optional[float] = Field(
        None, description="Puntaje global estimado en el Saber Pro (escala ~0-450).",
    )
    puntaje_minimo: Optional[float] = Field(
        None, description="Extremo inferior del intervalo de prediccion (error empirico del modelo).",
    )
    puntaje_maximo: Optional[float] = Field(
        None, description="Extremo superior del intervalo de prediccion.",
    )
    areas: List[AreaScore] = Field(
        default_factory=list, description="Puntaje estimado por area del examen (0-100).",
    )


class HealthResponse(BaseModel):
    model_config = {'protected_namespaces': ()}
    status: str
    model_loaded: bool
    database_connected: bool
    model_version: str
    timestamp: datetime
    model_type: Optional[str] = Field(
        None, description="regresion_puntaje (v2) o clasificador_banda (v1).",
    )


class StatisticsResponse(BaseModel):
    model_config = {'protected_namespaces': ()}
    total_predictions: int
    average_confidence: float
    average_probability: float
    category_distribution: dict
    timestamp: datetime
    average_score: Optional[float] = Field(
        None, description="Puntaje medio estimado entre las predicciones con puntaje.",
    )


class CategoryStats(BaseModel):
    model_config = {'protected_namespaces': ()}
    total: int
    avg_confidence: float
    avg_probability: float
    avg_score: Optional[float] = None


class PredictionHistory(BaseModel):
    model_config = {'protected_namespaces': ()}
    id: int
    documento: str
    resultado: str
    probabilidad: float
    confidence_pct: float
    timestamp: datetime
    puntaje_estimado: Optional[int] = None
    model_version: Optional[str] = None


class HistoryResponse(BaseModel):
    model_config = {'protected_namespaces': ()}
    documento: str
    predictions: List[PredictionHistory]
    total_predictions: int
    average_confidence: float
    average_probability: float
