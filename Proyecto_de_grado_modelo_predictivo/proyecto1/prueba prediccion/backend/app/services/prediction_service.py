"""
Servicio de Predicción para el Sistema Predictor Saber Pro
"""
import joblib
import logging
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

import numpy as np
import pandas as pd

from ..database.connection import execute_query, fetch_all, fetch_one
from ..models.student_model import (
    StudentInput,
    PredictionResponse,
    PredictionHistory,
    HistoryResponse,
    StatisticsResponse,
    CategoryStats
)

logger = logging.getLogger(__name__)

# Rutas del modelo - ir al root del proyecto (padre de backend)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODEL_PATH = os.getenv('MODEL_PATH', 'ml/trained_models/saberpro_model.pkl')
FULL_MODEL_PATH = BASE_DIR / MODEL_PATH

# Mapeo de categorías del modelo
CATEGORY_MAP = {0: 'Bajo', 1: 'Medio', 2: 'Alto'}
REVERSE_CATEGORY_MAP = {'Bajo': 0, 'Medio': 1, 'Alto': 2}

# Versión del modelo
MODEL_VERSION = "1.0.0"


class PredictionService:
    """
    Servicio para realizar predicciones usando modelo de Regresión Logística Múltiple
    """

    model: Optional[Any] = None
    scaler: Optional[Any] = None
    _db_connected: bool = False

    @classmethod
    def load_model(cls) -> bool:
        """
        Carga el modelo entrenado desde archivo .pkl

        Returns:
            bool: True si el modelo se cargó exitosamente, False en caso contrario
        """
        try:
            if FULL_MODEL_PATH.exists():
                model_data = joblib.load(FULL_MODEL_PATH)
                # El modelo puede ser un Pipeline o un diccionario con 'model' key
                if isinstance(model_data, dict):
                    cls.model = model_data.get('model')
                    cls.scaler = model_data.get('scaler', None)
                else:
                    # Es un Pipeline de sklearn
                    cls.model = model_data
                    cls.scaler = None
                logger.info(f"Modelo cargado exitosamente desde {FULL_MODEL_PATH}")
                return True
            else:
                logger.warning(f"Archivo modelo no encontrado: {FULL_MODEL_PATH}")
                logger.warning("El servicio funcionará en modo de demostración")
                return False
        except Exception as e:
            logger.error(f"Error cargando modelo: {e}")
            return False

    @classmethod
    def set_db_connected(cls, connected: bool):
        """Establece el estado de conexión a la base de datos"""
        cls._db_connected = connected

    @classmethod
    def predict(cls, student_data: StudentInput, documento: str = "demo") -> PredictionResponse:
        """
        Realiza predicción para un estudiante

        Args:
            student_data: Datos del estudiante (StudentInput)
            documento: Número de documento del estudiante

        Returns:
            PredictionResponse con resultado de la predicción
        """
        try:
            # Preparar datos para el modelo
            features = cls._prepare_features(student_data)

            # Realizar predicción
            if cls.model is not None:
                features = cls._prepare_features(student_data)
                prediction = cls.model.predict(features)[0]
                probabilities = cls.model.predict_proba(features)[0]
            else:
                # Modo demostración: generar predicción simulada
                prediction, probabilities = cls._generate_demo_prediction(features)

            # Obtener categoría y probabilidad
            resultado = CATEGORY_MAP.get(int(prediction), 'Medio')
            probabilidad = float(np.max(probabilities))

            # Generar recomendación
            recomendacion = cls._generate_recommendation(resultado, student_data)

            # Crear respuesta
            response = PredictionResponse(
                resultado=resultado,
                probabilidad=round(probabilidad, 4),
                confidence_pct=round(probabilidad * 100, 1),
                recomendacion=recomendacion,
                timestamp=datetime.now(),
                model_version=MODEL_VERSION
            )

            # Guardar predicción en BD si está conectada
            if cls._db_connected:
                try:
                    cls._save_prediction(documento, student_data, response)
                except Exception as db_error:
                    logger.warning(f"No se pudo guardar predicción en BD: {db_error}")

            logger.info(
                f"Predicción realizada: documento={documento}, "
                f"resultado={resultado}, confianza={response.confidence_pct}%"
            )

            return response

        except Exception as e:
            logger.error(f"Error en predicción: {e}")
            raise

    @classmethod
    def _prepare_features(cls, student_data: StudentInput) -> dict:
        """
        Prepara features para el modelo de Regresión Logística

        El modelo espera 8 features en este orden (como DataFrame con columnas):
        promedio_acumulado, promedio_basicas, promedio_ingenieria, num_reprobadas,
        pct_creditos, semestre, estrato, genero
        """
        # Crear DataFrame con las features y sus nombres de columna
        # Esto es necesario porque el ColumnTransformer identifica columnas por nombre
        features = pd.DataFrame([{
            'promedio_acumulado': student_data.promedio_acumulado,
            'promedio_basicas': student_data.promedio_basicas,
            'promedio_ingenieria': student_data.promedio_ingenieria,
            'num_reprobadas': student_data.num_reprobadas,
            'pct_creditos': student_data.pct_creditos,
            'semestre': student_data.semestre,
            'estrato': student_data.estrato,
            'genero': student_data.genero
        }])
        return features

        return features

    @classmethod
    def _generate_demo_prediction(cls, features: np.ndarray) -> tuple:
        """
        Genera una predicción de demostración cuando no hay modelo cargado

        Returns:
            tuple: (predicción, probabilidades)
        """
        # Cálculo simple basado en promedio ponderado de factores
        promedio_general = (features[0] + features[1] + features[2]) / 3
        factor_creditos = features[4] / 100
        factor_reprobadas = max(0, 1 - features[3] / 10)

        score = (promedio_general / 5 * 0.6 + factor_creditos * 0.2 + factor_reprobadas * 0.2)

        if score < 0.5:
            prediction = 0  # Bajo
            probabilities = [0.6, 0.3, 0.1]
        elif score < 0.75:
            prediction = 1  # Medio
            probabilities = [0.15, 0.6, 0.25]
        else:
            prediction = 2  # Alto
            probabilities = [0.05, 0.2, 0.75]

        return prediction, np.array(probabilities)

    @classmethod
    def _generate_recommendation(cls, resultado: str, student_data: StudentInput) -> str:
        """
        Genera recomendación personalizada según categoría de resultado

        Args:
            resultado: Categoría de predicción (Bajo, Medio, Alto)
            student_data: Datos del estudiante

        Returns:
            str: Recomendación personalizada
        """
        recommendations = {
            'Bajo': (
                f"Tu predicción indica un rendimiento bajo en Saber Pro. "
                f"Recomendaciones específicas:\n\n"
                f"1. Refuerza materias básicas: Tu promedio en básicas ({student_data.promedio_basicas:.1f}) "
                f"indica necesidad de mejora.\n"
                f"2. Aumenta horas de estudio: Considera dedicar al menos "
                f"{max(15, int(student_data.pct_creditos * 0.3))} horas semanales adicionales.\n"
                f"3. Busca tutorías: Utiliza los servicios de apoyo académico de tu universidad.\n"
                f"4. Forma grupos de estudio: El aprendizaje colaborativo puede mejorar tu desempeño.\n"
                f"5. Consulta con tu asesor: Agenda una cita para revisar tu plan de estudios."
            ),
            'Medio': (
                f"Tu predicción indica un rendimiento medio en Saber Pro. "
                f"Para mejorar tu resultado:\n\n"
                f"1. Consolidar conocimientos: Tu promedio acumulado ({student_data.promedio_acumulado:.1f}) "
                f"es correcto, pero puede mejorar.\n"
                f"2. Enfócate en ingeniería: Tu promedio de ingenieria ({student_data.promedio_ingenieria:.1f}) "
                f"es clave para el examen.\n"
                f"3. Practica con simulacros: Realiza al menos 2 simulacros semanales.\n"
                f"4. Identifica áreas débiles: Revisa temas con menores promedios.\n"
                f"5. Mantén la asistencia: La constancia es fundamental para pasar de medio a alto."
            ),
            'Alto': (
                f"Excelente! Tu predicción indica un alto rendimiento esperado en Saber Pro. "
                f"Para mantener este nivel:\n\n"
                f"1. Mantén tu ritmo: Tu promedio acumulado ({student_data.promedio_acumulado:.1f}) "
                f"es excelente, sigue así.\n"
                f"2. Practica bajo presión: Realiza simulacros en condiciones de examen.\n"
                f"3. Repasa temas complejos: Enfócate en áreas que suelen ser desafiantes.\n"
                f"4. Cuida tu bienestar: Descanso adecuado mejora el rendimiento cognitivo.\n"
                f"5. Considera ser tutor: Enseñar refuerza el aprendizaje y ayuda a otros."
            )
        }

        return recommendations.get(resultado, "Se recomienda mantener el esfuerzo académico constante.")

    @classmethod
    def _save_prediction(
        cls,
        documento: str,
        student_data: StudentInput,
        prediction: PredictionResponse
    ):
        """
        Guarda la predicción en la base de datos PostgreSQL

        Args:
            documento: Número de documento del estudiante
            student_data: Datos de entrada del estudiante
            prediction: Resultado de la predicción
        """
        query = """
        INSERT INTO resultados_saber_pro (
            documento,
            promedio_acumulado,
            promedio_basicas,
            promedio_ingenieria,
            num_reprobadas,
            pct_creditos,
            semestre,
            estrato,
            genero,
            resultado,
            probabilidad,
            confidence_pct,
            recomendacion,
            model_version,
            created_at
        ) VALUES (
            :documento,
            :promedio_acumulado,
            :promedio_basicas,
            :promedio_ingenieria,
            :num_reprobadas,
            :pct_creditos,
            :semestre,
            :estrato,
            :genero,
            :resultado,
            :probabilidad,
            :confidence_pct,
            :recomendacion,
            :model_version,
            NOW()
        )
        """

        params = {
            'documento': documento,
            'promedio_acumulado': student_data.promedio_acumulado,
            'promedio_basicas': student_data.promedio_basicas,
            'promedio_ingenieria': student_data.promedio_ingenieria,
            'num_reprobadas': student_data.num_reprobadas,
            'pct_creditos': student_data.pct_creditos,
            'semestre': student_data.semestre,
            'estrato': student_data.estrato,
            'genero': student_data.genero,
            'resultado': prediction.resultado,
            'probabilidad': prediction.probabilidad,
            'confidence_pct': prediction.confidence_pct,
            'recomendacion': prediction.recomendacion,
            'model_version': prediction.model_version
        }

        execute_query(query, params)
        logger.info(f"Predicción guardada para documento {documento}")

    @classmethod
    def get_student_history(
        cls,
        documento: str,
        limit: int = 10
    ) -> HistoryResponse:
        """
        Obtiene el historial de predicciones de un estudiante

        Args:
            documento: Número de documento del estudiante
            limit: Cantidad máxima de registros

        Returns:
            HistoryResponse con el historial
        """
        try:
            # Si no hay conexión a BD, retornar historial vacío
            if not cls._db_connected:
                return HistoryResponse(
                    documento=documento,
                    predictions=[],
                    total_predictions=0,
                    average_confidence=0.0,
                    average_probability=0.0
                )

            query = """
            SELECT
                id,
                documento,
                resultado,
                probabilidad,
                confidence_pct,
                promedio_acumulado,
                promedio_basicas,
                promedio_ingenieria,
                num_reprobadas,
                pct_creditos,
                semestre,
                estrato,
                genero,
                recomendacion,
                created_at as timestamp
            FROM resultados_saber_pro
            WHERE documento = :documento
            ORDER BY created_at DESC
            LIMIT :limit
            """

            results = fetch_all(query, {'documento': documento, 'limit': limit})

            predictions = []
            total_confidence = 0.0
            total_probability = 0.0

            for row in results:
                pred = PredictionHistory(
                    id=row[0],
                    documento=row[1],
                    resultado=row[2],
                    probabilidad=row[3],
                    confidence_pct=row[4],
                    promedio_acumulado=row[5],
                    promedio_basicas=row[6],
                    promedio_ingenieria=row[7],
                    num_reprobadas=row[8],
                    pct_creditos=row[9],
                    semestre=row[10],
                    estrato=row[11],
                    genero=row[12],
                    recomendacion=row[13],
                    timestamp=row[14]
                )
                predictions.append(pred)
                total_confidence += row[4]
                total_probability += row[3]

            count = len(predictions)
            avg_confidence = total_confidence / count if count > 0 else 0.0
            avg_probability = total_probability / count if count > 0 else 0.0

            return HistoryResponse(
                documento=documento,
                predictions=predictions,
                total_predictions=count,
                average_confidence=round(avg_confidence, 2),
                average_probability=round(avg_probability, 4)
            )

        except Exception as e:
            logger.error(f"Error obteniendo historial para {documento}: {e}")
            raise

    @classmethod
    def get_statistics(cls) -> StatisticsResponse:
        """
        Obtiene estadísticas generales del sistema de predicciones

        Returns:
            StatisticsResponse con las estadísticas
        """
        try:
            # Si no hay conexión a BD, retornar estadísticas demo
            if not cls._db_connected:
                return StatisticsResponse(
                    total_predictions=0,
                    average_confidence=0.0,
                    average_probability=0.0,
                    category_distribution={
                        "Bajo": {"total": 0, "avg_confidence": 0.0, "avg_probability": 0.0},
                        "Medio": {"total": 0, "avg_confidence": 0.0, "avg_probability": 0.0},
                        "Alto": {"total": 0, "avg_confidence": 0.0, "avg_probability": 0.0}
                    },
                    timestamp=datetime.now()
                )

            # Estadísticas por categoría
            stats_query = """
            SELECT
                resultado,
                COUNT(*) as total,
                AVG(confidence_pct) as avg_confidence,
                AVG(probabilidad) as avg_probability
            FROM resultados_saber_pro
            GROUP BY resultado
            """

            results = fetch_all(stats_query)

            category_distribution = {}
            total_predictions = 0
            total_confidence = 0.0
            total_probability = 0.0

            for row in results:
                categoria = row[0]
                count = row[1]
                avg_conf = float(row[2]) if row[2] else 0.0
                avg_prob = float(row[3]) if row[3] else 0.0

                category_distribution[categoria] = CategoryStats(
                    total=count,
                    avg_confidence=round(avg_conf, 2),
                    avg_probability=round(avg_prob, 4)
                ).model_dump()

                total_predictions += count
                total_confidence += avg_conf * count
                total_probability += avg_prob * count

            # Calcular promedios generales
            if total_predictions > 0:
                avg_confidence = total_confidence / total_predictions
                avg_probability = total_probability / total_predictions
            else:
                avg_confidence = 0.0
                avg_probability = 0.0

            return StatisticsResponse(
                total_predictions=total_predictions,
                average_confidence=round(avg_confidence, 2),
                average_probability=round(avg_probability, 4),
                category_distribution=category_distribution,
                timestamp=datetime.now()
            )

        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {e}")
            raise

    @classmethod
    def health_check(cls) -> Dict[str, Any]:
        """
        Verifica el estado del sistema

        Returns:
            Dict con información del estado del sistema
        """
        return {
            "status": "healthy" if cls.model is not None else "degraded",
            "model_loaded": cls.model is not None,
            "database_connected": cls._db_connected,
            "model_version": MODEL_VERSION,
            "timestamp": datetime.now()
        }
