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
# Modelo v2 (regresion sobre el puntaje real de examen). Tiene prioridad
# sobre el v1 si esta presente: el v1 prededia una banda derivada del GPA y
# su "puntaje estimado" era un remapeo de la probabilidad, no una prediccion.
MODEL_PATH_V2 = os.getenv(
    'MODEL_PATH_V2', 'ml-training/trained_models/saberpro_model_v2.pkl'
)
FULL_MODEL_PATH_V2 = BASE_DIR / MODEL_PATH_V2
# Background sample para SHAP (persiste ml-training/train_from_real.py). Opcional.
BACKGROUND_PATH = BASE_DIR / 'ml-training' / 'data' / 'background_sample.pkl'
BACKGROUND_PATH_V2 = BASE_DIR / 'ml-training' / 'data' / 'background_sample_v2.pkl'

# Etiquetas de las areas del Saber Pro, en el orden en que las guarda el modelo.
AREA_LABELS = {
    'matematicas': 'Matematicas / Razonamiento cuantitativo',
    'lectura_critica': 'Lectura critica',
    'ingles': 'Ingles',
}
# Escala observada de cada area (0-100).
AREA_SCALE = {'matematicas': 100.0, 'lectura_critica': 100.0, 'ingles': 100.0}
# Escala del puntaje global del Saber Pro: tres areas de 100.
ESCALA_SABERPRO_MAX = 300.0

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
    # Un explainer por regresor (uno por area + el global si existe).
    _shap_explainers: Dict[str, Any] = {}

    # --- Estado del modelo v2 (regresion sobre puntaje real) ---
    _v2: Optional[Dict[str, Any]] = None

    @classmethod
    def load_model(cls) -> bool:
        """
        Carga el modelo entrenado desde archivo .pkl

        Prioridad: modelo v2 (regresion del puntaje real) sobre el v1
        (clasificador de banda). Si solo existe el v1, se carga ese.

        Returns:
            bool: True si el modelo se cargó exitosamente, False en caso contrario
        """
        # ------------------------------------------------------------------
        # v2: regresion del puntaje real.
        # ------------------------------------------------------------------
        try:
            if FULL_MODEL_PATH_V2.exists():
                artefacto = joblib.load(FULL_MODEL_PATH_V2)
                if isinstance(artefacto, dict) and 'areas' in artefacto:
                    cls._v2 = artefacto
                    cls.model = artefacto.get('global_pipeline')
                    logger.info(
                        "Modelo v2 cargado desde %s (version %s, n=%s, bandas %s)",
                        FULL_MODEL_PATH_V2,
                        artefacto.get('model_version'),
                        artefacto.get('n_entrenamiento'),
                        artefacto.get('bandas'),
                    )
                    cls._init_shap_explainer_v2()
                    return True
                logger.warning(
                    "El archivo v2 no tiene el formato esperado; se ignora: %s",
                    FULL_MODEL_PATH_V2,
                )
            else:
                logger.info("No se encontro el modelo v2 en %s", FULL_MODEL_PATH_V2)
        except Exception as e:
            logger.error("Error cargando el modelo v2: %s", e)
            cls._v2 = None

        # ------------------------------------------------------------------
        # v1: clasificador de banda (fallback).
        # ------------------------------------------------------------------
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
                logger.info(f"Modelo v1 cargado exitosamente desde {FULL_MODEL_PATH}")

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
            if cls._v2 is not None:
                return cls._predict_v2(student_data, documento)

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

    # ==================================================================
    # MODELO v2: regresion sobre el puntaje real de examen
    # ==================================================================

    @classmethod
    def _prepare_features_v2(cls, student_data: StudentInput) -> pd.DataFrame:
        """
        Features del modelo v2 (14: 12 numericas + 2 categoricas).

        A diferencia del v1, aqui entra `promedio_acumulado`: en el v1 quedaba
        fuera porque el target era una funcion deterministica de el (fuga de
        informacion). Con el target real es, justamente, la feature mas
        informativa y legitima.

        Los nombres deben coincidir con NUMERIC_FEATURES /
        CATEGORICAL_FEATURES de ml-training/train_saberpro_v2.py.
        """
        return pd.DataFrame([{
            'promedio_acumulado': student_data.promedio_acumulado,
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

    @classmethod
    def _band_from_score(cls, score: float) -> str:
        """Banda (Alto/Medio/Bajo) a partir del puntaje global estimado."""
        bandas = (cls._v2 or {}).get('bandas') or {'bajo_max': 253.3, 'medio_max': 307.0}
        if score < bandas['bajo_max']:
            return 'Bajo'
        if score < bandas['medio_max']:
            return 'Medio'
        return 'Alto'

    @classmethod
    def _tree_spread(cls, pipeline, X: pd.DataFrame) -> np.ndarray:
        """
        Predicciones de cada arbol del bosque.

        La dispersion entre arboles es la incertidumbre epistemica del modelo:
        si todos los arboles coinciden, el modelo esta seguro; si se dispersan,
        la estimacion es fragil. Se usa para calcular la probabilidad de cada
        banda y el intervalo de prediccion.
        """
        try:
            pre = pipeline.named_steps['preprocessor']
            model = pipeline.named_steps['model']
            Xt = pre.transform(X)
            preds = np.array([tree.predict(Xt) for tree in model.estimators_])
            return preds[:, 0]
        except Exception as e:
            logger.debug("No se pudo calcular la dispersion de arboles: %s", e)
            return np.array([])

    @classmethod
    def _predict_v2(cls, student_data: StudentInput, documento: str = "demo") -> PredictionResponse:
        """Prediccion con el modelo v2: puntaje estimado real + areas + banda.

        Escala del Saber Pro: 0-300. El puntaje global es la SUMA de las tres
        areas (matematicas, lectura critica, ingles), de modo que lo que ve el
        estudiante siempre cuadra: lo que suma en las areas es el total.
        """
        artefacto = cls._v2 or {}
        features = cls._prepare_features_v2(student_data)
        modo_global = artefacto.get('global_modo', 'modelo_directo')

        # --- Areas (se predicen primero: el global es su suma) ---
        areas = []
        areas_pipeline = artefacto.get('areas') or {}
        for key, pipeline in areas_pipeline.items():
            valor = float(pipeline.predict(features)[0])
            escala = AREA_SCALE.get(key, 100.0)
            valor = min(max(valor, 0.0), escala)
            areas.append({
                'id': key,
                'label': AREA_LABELS.get(key, key),
                'score': round(valor, 1),
            })

        # --- Puntaje global ---
        if modo_global == 'suma_de_areas' and areas:
            puntaje = sum(a['score'] for a in areas)
        else:
            global_pipeline = artefacto.get('global_pipeline')
            puntaje = (
                float(global_pipeline.predict(features)[0])
                if global_pipeline is not None
                else sum(a['score'] for a in areas)
            )
        puntaje = max(0.0, min(puntaje, ESCALA_SABERPRO_MAX))

        margen = float(artefacto.get('margen_error_global', 17.5))
        puntaje_min = max(0.0, puntaje - margen)
        puntaje_max = min(ESCALA_SABERPRO_MAX, puntaje + margen)

        # --- Bandas y su probabilidad ---
        # La incertidumbre se estima con la dispersion entre arboles del bosque.
        # En el modo "suma de areas" se hace Monte Carlo: se sortea un arbol
        # por area (los tres bosques son independientes) y se repite miles de
        # veces para obtener la distribucion del total.
        banda = cls._band_from_score(puntaje)
        probs = cls._band_probabilities(artefacto, features, areas_pipeline, modo_global)
        if probs:
            banda_mas_probable = max(probs, key=probs.get)
            if probs.get(banda, 0.0) < probs[banda_mas_probable]:
                # Si el punto medio cae en otra banda que la mas probable, se
                # reporta la mas probable: es la lectura honesta del modelo.
                banda = banda_mas_probable
            probabilidad = float(probs.get(banda, 0.0))
        else:
            probs = {'Alto': 0.0, 'Medio': 0.0, 'Bajo': 0.0}
            probs[banda] = 1.0
            probabilidad = 1.0

        # --- Explicabilidad (SHAP sobre el regresor del global) ---
        feature_contributions = cls._compute_shap_contributions_v2(features, puntaje)

        recomendacion = cls._generate_recommendation_v2(puntaje, areas, banda, margen)

        response = PredictionResponse(
            resultado=banda,
            probabilidad=round(probabilidad, 4),
            confidence_pct=round(probabilidad * 100, 1),
            recomendacion=recomendacion,
            timestamp=datetime.now(),
            model_version=artefacto.get('model_version', 'saberpro-v2'),
            probabilities=probs,
            feature_contributions=feature_contributions,
            puntaje_estimado=round(puntaje, 1),
            puntaje_minimo=round(puntaje_min, 1),
            puntaje_maximo=round(puntaje_max, 1),
            areas=areas,
        )

        logger.info(
            "Prediccion v2: documento=%s, puntaje=%.1f (%.1f-%.1f), banda=%s (%.0f%%)",
            documento, puntaje, puntaje_min, puntaje_max, banda, probabilidad * 100,
        )
        return response

    @classmethod
    def _band_probabilities(
        cls,
        artefacto: Dict[str, Any],
        features: pd.DataFrame,
        areas_pipeline: Dict[str, Any],
        modo_global: str,
    ) -> Dict[str, float]:
        """
        Probabilidad de cada banda, a partir de la dispersion del modelo.

        Modo "suma de areas": Monte Carlo sobre los tres bosques (se sortea un
        arbol por area y se suman sus predicciones).
        Modo "modelo_directo": la dispersion de los arboles del modelo global.
        """
        try:
            if modo_global == 'suma_de_areas' and areas_pipeline:
                spreads = []
                for pipeline in areas_pipeline.values():
                    s = cls._tree_spread(pipeline, features)
                    if len(s):
                        spreads.append(s)
                if not spreads:
                    return {}
                rng = np.random.default_rng(42)
                n = 4000
                totales = np.zeros(n)
                for s in spreads:
                    idx = rng.integers(0, len(s), size=n)
                    totales += s[idx]
            else:
                global_pipeline = artefacto.get('global_pipeline')
                if global_pipeline is None:
                    return {}
                s = cls._tree_spread(global_pipeline, features)
                if not len(s):
                    return {}
                totales = s

            bandas = np.array([cls._band_from_score(float(t)) for t in totales])
            return {b: float((bandas == b).mean()) for b in ('Alto', 'Medio', 'Bajo')}
        except Exception as e:
            logger.warning("No se pudieron calcular las probabilidades de banda: %s", e)
            return {}

    @classmethod
    def _generate_recommendation_v2(
        cls, puntaje: float, areas: List[Dict[str, Any]], banda: str,
        margen: float = 17.5,
    ) -> str:
        """Recomendacion redactada a partir del puntaje real y las areas."""
        banda_texto = {
            'Alto': "un desempeño esperado alto",
            'Medio': "un desempeño esperado intermedio",
            'Bajo': "un desempeño esperado bajo",
        }.get(banda, "un desempeño incierto")
        lineas = [
            f"Tu puntaje estimado en el Saber Pro es {puntaje:.0f} sobre 300 "
            f"(rango probable {max(0, puntaje - margen):.0f} a "
            f"{min(ESCALA_SABERPRO_MAX, puntaje + margen):.0f}), "
            f"lo que corresponde a {banda_texto}."
        ]
        if areas:
            peor = min(areas, key=lambda a: a['score'])
            mejor = max(areas, key=lambda a: a['score'])
            lineas.append(
                f"Tu area mas solida es {mejor['label']} ({mejor['score']:.0f}/100) y "
                f"la que mas conviene reforzar es {peor['label']} ({peor['score']:.0f}/100)."
            )
        lineas.append(
            "El margen de error es amplio: el resultado en el examen depende de "
            "factores que no aparecen en el historial academico, como la preparacion "
            "especifica para la prueba o el estado de salud el dia del examen."
        )
        return "\n\n".join(lineas)

    @classmethod
    def _init_shap_explainer_v2(cls) -> None:
        """
        SHAP sobre los regresores del modelo v2.

        A diferencia del v1 (clasificador multiclase, que SHAP no soporta), un
        regresor SI es explicable: TreeExplainer funciona sobre arboles de
        regresion sin restriccion de clases.

        En el modo "suma de areas" no hay un modelo del global: se construye
        un explainer por area y las contribuciones se suman, de modo que cada
        feature queda expresada en PUNTOS sobre el total de 300.
        """
        cls._shap_explainer = None
        cls._shap_feature_names = None
        cls._shap_explainers = {}
        if not _SHAP_AVAILABLE:
            logger.info("SHAP no instalado: feature_contributions deshabilitado.")
            return
        try:
            artefacto = cls._v2 or {}
            pipelines = dict(artefacto.get('areas') or {})
            if artefacto.get('global_pipeline') is not None:
                pipelines['__global__'] = artefacto['global_pipeline']

            background = None
            try:
                if BACKGROUND_PATH_V2.exists():
                    background = joblib.load(BACKGROUND_PATH_V2)
                    logger.info("SHAP background v2 cargado (%d filas).", len(background))
            except Exception as e:
                logger.warning("No se pudo cargar background SHAP v2: %s", e)

            for clave, pipeline in pipelines.items():
                if not hasattr(pipeline, 'named_steps'):
                    continue
                regressor = pipeline.named_steps.get('model')
                preprocessor = pipeline.named_steps.get('preprocessor')
                if regressor is None or preprocessor is None:
                    continue
                try:
                    cls._shap_explainers[clave] = shap.TreeExplainer(
                        regressor,
                        background,
                        feature_perturbation=(
                            "interventional" if background is not None
                            else "tree_path_dependent"
                        ),
                    )
                except TypeError:
                    cls._shap_explainers[clave] = shap.TreeExplainer(regressor)
                try:
                    cls._shap_feature_names = list(preprocessor.get_feature_names_out())
                except Exception:
                    cls._shap_feature_names = None

            if cls._shap_explainers:
                logger.info(
                    "SHAP v2 inicializado (%d regresores, %d features post-transform).",
                    len(cls._shap_explainers), len(cls._shap_feature_names or []),
                )
            else:
                logger.info("SHAP v2: no se pudieron construir los explainers.")
        except Exception as e:
            logger.warning("No se pudo inicializar SHAP v2: %s", e)
            cls._shap_explainers = {}

    @classmethod
    def _compute_shap_contributions_v2(
        cls, features: pd.DataFrame, puntaje: float
    ) -> List[FeatureContribution]:
        """
        Contribuciones SHAP al puntaje total.

        En el modo "suma de areas" se calcula el SHAP de cada area y se suman:
        la contribucion de cada feature queda en PUNTOS sobre el total de 300
        (por ejemplo, "el promedio acumulado aporta +12 puntos").
        """
        if not getattr(cls, '_shap_explainers', None):
            return []
        try:
            artefacto = cls._v2 or {}
            pipelines = dict(artefacto.get('areas') or {})
            if artefacto.get('global_pipeline') is not None:
                pipelines['__global__'] = artefacto['global_pipeline']

            acumulado = None
            nombres = None
            for clave, pipeline in pipelines.items():
                explainer = cls._shap_explainers.get(clave)
                if explainer is None:
                    continue
                Xt = pipeline.named_steps['preprocessor'].transform(features)
                shap_values = explainer.shap_values(Xt)
                if isinstance(shap_values, list):
                    shap_values = shap_values[0]
                fila = np.asarray(shap_values)[0]
                acumulado = fila if acumulado is None else acumulado + fila
                if nombres is None:
                    try:
                        nombres = list(
                            pipeline.named_steps['preprocessor'].get_feature_names_out()
                        )
                    except Exception:
                        nombres = None

            if acumulado is None:
                return []

            nombres = nombres or [f'f{i}' for i in range(len(acumulado))]
            contribuciones = []
            for i, valor in enumerate(acumulado):
                nombre = nombres[i] if i < len(nombres) else f'f{i}'
                contribuciones.append(
                    FeatureContribution(
                        feature=nombre,
                        contribution=round(float(valor), 4),
                        abs_contribution=round(abs(float(valor)), 4),
                    )
                )
            contribuciones.sort(key=lambda c: c.abs_contribution, reverse=True)
            return contribuciones[:12]
        except Exception as e:
            logger.warning("No se pudieron calcular las contribuciones SHAP v2: %s", e)
            return []

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
        La persistencia la hace el backend Express, no este servicio.

        Antes este metodo escribia en la tabla `resultados_saber_pro`, que no
        existe en el DDL del proyecto: el INSERT fallaba siempre (ademas con
        placeholders `:nombre`, que psycopg2 no entiende) y el error se
        tragaba con un warning, de modo que ninguna prediccion se guardaba
        desde aqui.

        Para no tener dos escritores de la misma informacion, este servicio
        solo calcula y devuelve; el registro en `predictions` lo hace
        `backend/src/routes.js` (`savePrediction`), que ademas es quien
        controla el contrato de la base de datos.
        """
        logger.debug(
            "Prediccion calculada para %s (la persistencia la hace el backend Express)",
            documento,
        )

    @classmethod
    def get_student_history(
        cls,
        documento: str,
        limit: int = 10
    ) -> HistoryResponse:
        """
        Obtiene el historial de predicciones de un estudiante.

        Lee la tabla real `predictions` (la que escribe el backend Express),
        no la inexistente `resultados_saber_pro`.
        """
        try:
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
                p.id,
                u.documento,
                p.clase,
                p.probabilidad,
                p.puntaje_estimado,
                p.model_version,
                p.created_at
            FROM predictions p
            JOIN usuarios u ON u.id = p.user_id
            WHERE u.documento = %s
            ORDER BY p.created_at DESC
            LIMIT %s
            """

            results = fetch_all(query, (documento, limit))

            predictions = []
            total_confidence = 0.0
            total_probability = 0.0

            for row in results:
                probabilidad = float(row['probabilidad']) if row['probabilidad'] is not None else 0.0
                confianza = round(probabilidad * 100, 2)
                pred = PredictionHistory(
                    id=row['id'],
                    documento=row['documento'],
                    resultado=(row['clase'] or '').capitalize(),
                    probabilidad=probabilidad,
                    confidence_pct=confianza,
                    puntaje_estimado=row['puntaje_estimado'],
                    model_version=row['model_version'],
                    timestamp=row['created_at'],
                )
                predictions.append(pred)
                total_confidence += confianza
                total_probability += probabilidad

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
        Obtiene estadísticas generales del sistema de predicciones.

        Lee la tabla real `predictions` (la que escribe el backend Express).
        """
        try:
            vacio = {
                "Bajo": {"total": 0, "avg_confidence": 0.0, "avg_probability": 0.0},
                "Medio": {"total": 0, "avg_confidence": 0.0, "avg_probability": 0.0},
                "Alto": {"total": 0, "avg_confidence": 0.0, "avg_probability": 0.0},
            }
            if not cls._db_connected:
                return StatisticsResponse(
                    total_predictions=0,
                    average_confidence=0.0,
                    average_probability=0.0,
                    average_score=None,
                    category_distribution=vacio,
                    timestamp=datetime.now()
                )

            stats_query = """
            SELECT
                clase,
                COUNT(*) AS total,
                AVG(probabilidad) AS avg_probability,
                AVG(puntaje_estimado) AS avg_score
            FROM predictions
            WHERE clase IS NOT NULL
            GROUP BY clase
            """

            results = fetch_all(stats_query)

            category_distribution = {}
            total_predictions = 0
            total_probability = 0.0
            total_score = 0.0
            scored = 0

            for row in results:
                categoria = (row['clase'] or '').capitalize()
                count = int(row['total'])
                avg_prob = float(row['avg_probability']) if row['avg_probability'] is not None else 0.0
                avg_score = float(row['avg_score']) if row['avg_score'] is not None else None

                category_distribution[categoria] = CategoryStats(
                    total=count,
                    avg_confidence=round(avg_prob * 100, 2),
                    avg_probability=round(avg_prob, 4),
                ).model_dump()
                if avg_score is not None:
                    category_distribution[categoria]['avg_score'] = round(avg_score, 1)

                total_predictions += count
                total_probability += avg_prob * count
                if avg_score is not None:
                    total_score += avg_score * count
                    scored += count

            avg_probability = total_probability / total_predictions if total_predictions else 0.0
            avg_score = total_score / scored if scored else None

            return StatisticsResponse(
                total_predictions=total_predictions,
                average_confidence=round(avg_probability * 100, 2),
                average_probability=round(avg_probability, 4),
                average_score=round(avg_score, 1) if avg_score is not None else None,
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
        version = MODEL_VERSION
        if cls._v2 is not None:
            version = cls._v2.get('model_version', version)
        # OJO: en el modo "suma de areas" el artefacto v2 NO tiene
        # `global_pipeline` (el global se reconstruye sumando las areas), asi
        # que `cls.model` puede ser None con el modelo perfectamente cargado.
        # Si el health check dijera "degraded" aqui, el backend de Express
        # dejaria de usar el modelo y todas las predicciones caerian al
        # fallback heuristico sin avisar.
        cargado = (cls._v2 is not None) or (cls.model is not None)
        return {
            "status": "healthy" if cargado else "degraded",
            "model_loaded": cargado,
            "model_type": "regresion_puntaje" if cls._v2 is not None else "clasificador_banda",
            "database_connected": cls._db_connected,
            "model_version": version,
            "timestamp": datetime.now()
        }
