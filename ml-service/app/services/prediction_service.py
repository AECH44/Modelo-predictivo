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
    CategoryStats,
    FeatureContribution,
)

# SHAP se importa de forma opcional: si no esta instalado, el servicio sigue
# funcionando pero sin feature_contributions (lista vacia).
try:
    import shap  # type: ignore
    _SHAP_AVAILABLE = True
except Exception:  # pragma: no cover - shap no instalado
    shap = None  # type: ignore
    _SHAP_AVAILABLE = False

logger = logging.getLogger(__name__)

# Rutas del modelo - ir al root del proyecto (padre de ml-service)
# ml-service/app/services/prediction_service.py -> subir 4 niveles
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODEL_PATH = os.getenv('MODEL_PATH', 'ml-training/trained_models/saberpro_model.pkl')
FULL_MODEL_PATH = BASE_DIR / MODEL_PATH
# Background sample para SHAP (persiste ml-training/train_from_real.py). Opcional.
BACKGROUND_PATH = BASE_DIR / 'ml-training' / 'data' / 'background_sample.pkl'

# Mapeo de categorías (modelo real devuelve strings, no enteros)
CATEGORY_MAP = {0: 'Bajo', 1: 'Medio', 2: 'Alto'}
REVERSE_CATEGORY_MAP = {'Bajo': 0, 'Medio': 1, 'Alto': 2}

# Versión del modelo
MODEL_VERSION = "real-data-v1"


class PredictionService:
    """
    Servicio para realizar predicciones usando modelo de Regresión Logística Múltiple
    """

    model: Optional[Any] = None
    scaler: Optional[Any] = None
    _db_connected: bool = False
    _shap_explainer: Optional[Any] = None
    _shap_feature_names: Optional[List[str]] = None

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

                # Intentar inicializar SHAP. Es opcional: si falla, seguimos
                # funcionando y el endpoint omite feature_contributions.
                cls._init_shap_explainer()
                return True
            else:
                logger.warning(f"Archivo modelo no encontrado: {FULL_MODEL_PATH}")
                logger.warning("El servicio funcionará en modo de demostración")
                return False
        except Exception as e:
            logger.error(f"Error cargando modelo: {e}")
            return False

    @classmethod
    def _init_shap_explainer(cls) -> None:
        """
        Construye el TreeExplainer de SHAP para el clasificador subyacente.
        Solo funciona si el modelo es un Pipeline con un clasificador tree-based
        (GradientBoostingClassifier / RandomForest). En cualquier otro caso,
        deja _shap_explainer en None y el endpoint omite las contribuciones.
        """
        cls._shap_explainer = None
        cls._shap_feature_names = None
        if not _SHAP_AVAILABLE:
            logger.info("SHAP no instalado: feature_contributions deshabilitado.")
            return
        try:
            # Necesitamos un Pipeline con named_steps 'preprocessor' y 'classifier'.
            pipeline = cls.model
            if not hasattr(pipeline, "named_steps"):
                logger.info("Modelo no es un Pipeline; SHAP omitido.")
                return
            classifier = pipeline.named_steps.get("classifier")
            preprocessor = pipeline.named_steps.get("preprocessor")
            if classifier is None or preprocessor is None:
                logger.info("Pipeline sin 'classifier' o 'preprocessor'; SHAP omitido.")
                return
            # Solo tiene sentido con tree-based (GB / RF). Para LR el explainer
            # es distinto (Linear) y daria explicaciones menos utiles.
            from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
            if not isinstance(classifier, (GradientBoostingClassifier, RandomForestClassifier)):
                logger.info(
                    "Clasificador %s no es tree-based; SHAP omitido.",
                    type(classifier).__name__,
                )
                return
            # Cargar background si existe (persiste ml-training/train_from_real.py).
            # Si no, usar tree_path_dependent que no requiere background.
            background = None
            try:
                if BACKGROUND_PATH.exists():
                    background = joblib.load(BACKGROUND_PATH)
                    logger.info("SHAP background cargado (%d filas).", len(background))
            except Exception as e:
                logger.warning("No se pudo cargar background SHAP: %s", e)
                background = None
            try:
                cls._shap_explainer = shap.TreeExplainer(
                    classifier,
                    background,
                    feature_perturbation="interventional" if background is not None else "tree_path_dependent",
                )
            except TypeError:
                # Fallback para versiones de SHAP que no aceptan positional background.
                cls._shap_explainer = shap.TreeExplainer(classifier)
            # Nombres de las features post-transform (post ColumnTransformer).
            try:
                cls._shap_feature_names = list(preprocessor.get_feature_names_out())
            except Exception:
                cls._shap_feature_names = None
            logger.info(
                "SHAP TreeExplainer inicializado (%d features post-transform).",
                len(cls._shap_feature_names or []),
            )
        except Exception as e:
            # Cualquier excepcion aqui es no-fatal: log warning y seguir sin SHAP.
            logger.warning("No se pudo inicializar SHAP: %s", e)
            cls._shap_explainer = None
            cls._shap_feature_names = None

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

            if cls.model is not None:
                # El modelo real (Pipeline sklearn con ColumnTransformer) devuelve
                # strings directamente ('Bajo'/'Medio'/'Alto') porque asi se entreno.
                prediction = cls.model.predict(features)[0]
                probabilities = cls.model.predict_proba(features)[0]
                # Mapear las columnas de probabilidad al nombre de clase. El
                # Pipeline las ordena como vio las clases durante fit
                # (alfabeticamente: Alto, Bajo, Medio).
                classes = list(cls.model.classes_)
                probs_by_class = {str(c): float(probabilities[i]) for i, c in enumerate(classes)}
                resultado = str(prediction)
                probabilidad = float(np.max(probabilities))
            else:
                # Modo demostración: generar predicción simulada
                prediction, probabilities = cls._generate_demo_prediction(features)
                resultado = CATEGORY_MAP.get(int(prediction), 'Medio')
                probabilidad = float(np.max(probabilities))
                probs_by_class = {
                    'Bajo': float(probabilities[0]),
                    'Medio': float(probabilities[1]),
                    'Alto': float(probabilities[2]),
                }

            # Generar recomendación
            recomendacion = cls._generate_recommendation(resultado, student_data)

            # Contribuciones SHAP por feature (devuelve [] si SHAP no esta disponible).
            feature_contributions = cls._compute_shap_contributions(features, resultado)

            # Crear respuesta
            response = PredictionResponse(
                resultado=resultado,
                probabilidad=round(probabilidad, 4),
                confidence_pct=round(probabilidad * 100, 1),
                recomendacion=recomendacion,
                timestamp=datetime.now(),
                model_version=MODEL_VERSION,
                probabilities=probs_by_class,
                feature_contributions=feature_contributions,
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
    def _prepare_features(cls, student_data: StudentInput) -> pd.DataFrame:
        """
        Prepara features para el modelo real (real-data-v1).

        El .pkl (GradientBoostingClassifier envuelto en un Pipeline con
        ColumnTransformer) espera EXACTAMENTE 13 features con estos
        nombres (ver ml/train_from_real.py):

          Numericas (11):
            promedio_materias_basicas, promedio_ingenieria,
            promedio_programacion, promedio_matematica_estadistica,
            asignaturas_reprobadas, porcentaje_avance, semestre_actual,
            estrato, creditos_aprobados, asignaturas_aprobadas, edad
          Categoricas (2):
            genero, promedio_ingles_nivel
        """
        features = pd.DataFrame([{
            'promedio_materias_basicas': student_data.promedio_materias_basicas,
            'promedio_ingenieria': student_data.promedio_ingenieria,
            'promedio_programacion': student_data.promedio_programacion,
            'promedio_matematica_estadistica': student_data.promedio_matematica_estadistica,
            'asignaturas_reprobadas': student_data.asignaturas_reprobadas,
            'porcentaje_avance': student_data.porcentaje_avance,
            'semestre_actual': student_data.semestre_actual,
            'estrato': student_data.estrato,
            'creditos_aprobados': student_data.creditos_aprobados,
            'asignaturas_aprobadas': student_data.asignaturas_aprobadas,
            'edad': student_data.edad,
            'genero': student_data.genero,
            'promedio_ingles_nivel': student_data.promedio_ingles_nivel,
        }])
        return features

    @classmethod
    def _compute_shap_contributions(
        cls, features: pd.DataFrame, predicted_class: str
    ) -> List[FeatureContribution]:
        """
        Calcula las contribuciones SHAP por feature para la clase predicha.

        Devuelve una lista ordenada desc por |contribution|. Si SHAP no esta
        disponible, devuelve lista vacia (feature_contributions en la respuesta
        queda como [] y la UI simplemente no muestra la seccion).
        """
        if cls._shap_explainer is None or cls.model is None:
            return []
        try:
            pipeline = cls.model
            preprocessor = pipeline.named_steps["preprocessor"]
            # Transformar al espacio que ve el clasificador (post ColumnTransformer).
            X_transformed = preprocessor.transform(features)
            shap_values = cls._shap_explainer.shap_values(X_transformed)

            # shap_values puede venir en 3 formatos segun version de SHAP:
            #   - list of 2D arrays (multiclass antiguo): len = n_classes
            #   - 3D array (n_samples, n_features, n_classes): SHAP >=0.45 multiclass
            #   - 2D array (n_samples, n_features): regresion o binario
            classes = list(pipeline.classes_)
            try:
                predicted_idx = classes.index(predicted_class)
            except ValueError:
                predicted_idx = 0

            if isinstance(shap_values, list):
                contrib_row = np.asarray(shap_values[predicted_idx])[0]
            else:
                arr = np.asarray(shap_values)
                if arr.ndim == 3:
                    contrib_row = arr[0, :, predicted_idx]
                elif arr.ndim == 2:
                    # Binario: hay un solo set de contribuciones
                    contrib_row = arr[0]
                else:
                    return []

            names = cls._shap_feature_names
            if names is None or len(names) != len(contrib_row):
                names = [f"feature_{i}" for i in range(len(contrib_row))]

            rows = [
                FeatureContribution(
                    feature=name,
                    contribution=float(c),
                    abs_contribution=abs(float(c)),
                )
                for name, c in zip(names, contrib_row)
            ]
            rows.sort(key=lambda r: r.abs_contribution, reverse=True)
            return rows
        except Exception as e:
            logger.warning("Fallo calculo SHAP, omitiendo contribuciones: %s", e)
            return []

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
        # Recomendaciones adaptadas al modelo real (13 features).
        # Usamos promedio_ingenieria (la feature mas importante segun
        # feature_importance.png ~35%) y promedio_materias_basicas
        # (segunda mas importante entre los promedios).
        recommendations = {
            'Bajo': (
                f"Tu prediccion indica un rendimiento bajo en Saber Pro. "
                f"Recomendaciones especificas:\n\n"
                f"1. Refuerza materias basicas: Tu promedio en basicas ({student_data.promedio_materias_basicas:.2f}) "
                f"indica necesidad de mejora.\n"
                f"2. Aumenta horas de estudio: Considera dedicar al menos "
                f"{max(15, int(student_data.porcentaje_avance * 0.3))} horas semanales adicionales.\n"
                f"3. Busca tutorias: Utiliza los servicios de apoyo academico de tu universidad.\n"
                f"4. Forma grupos de estudio: El aprendizaje colaborativo puede mejorar tu desempeno.\n"
                f"5. Consulta con tu asesor: Agenda una cita para revisar tu plan de estudios."
            ),
            'Medio': (
                f"Tu prediccion indica un rendimiento medio en Saber Pro. "
                f"Para mejorar tu resultado:\n\n"
                f"1. Consolidar conocimientos: Tu promedio de ingenieria ({student_data.promedio_ingenieria:.2f}) "
                f"es correcto, pero puede mejorar.\n"
                f"2. Enfocate en ingenieria: Es la variable con mayor peso en el modelo.\n"
                f"3. Practica con simulacros: Realiza al menos 2 simulacros semanales.\n"
                f"4. Identifica areas debiles: Revisa temas con menores promedios.\n"
                f"5. Manten la consistencia: La constancia es fundamental para pasar de medio a alto."
            ),
            'Alto': (
                f"Excelente! Tu prediccion indica un alto rendimiento esperado en Saber Pro. "
                f"Para mantener este nivel:\n\n"
                f"1. Manten tu ritmo: Tu promedio de ingenieria ({student_data.promedio_ingenieria:.2f}) "
                f"es excelente, sigue asi.\n"
                f"2. Practica bajo presion: Realiza simulacros en condiciones de examen.\n"
                f"3. Repasa temas complejos: Enfocate en areas que suelen ser desafiantes.\n"
                f"4. Cuida tu bienestar: Descanso adecuado mejora el rendimiento cognitivo.\n"
                f"5. Considera ser tutor: Ensenar refuerza el aprendizaje y ayuda a otros."
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
