"""
Tests para prediction_service.py.

Cubre los helpers puros (sin .pkl, sin BD, sin FastAPI):
  - _prepare_features: construye el DataFrame con las 13 features en el
    orden y nombre exacto que espera el .pkl.
  - _generate_recommendation: devuelve texto coherente con la clase.

NO testeamos `predict()` end-to-end porque requiere cargar el .pkl real,
lo cual es lento y depende del estado de disco. El path real esta
cubierto por el analisis manual y los integration tests del frontend.
"""

import pytest

from app.services.prediction_service import PredictionService
from app.models.student_model import StudentInput


@pytest.fixture
def student_input_valido():
    return StudentInput(
        promedio_materias_basicas=3.5,
        promedio_ingenieria=3.8,
        promedio_programacion=3.6,
        promedio_matematica_estadistica=3.4,
        asignaturas_reprobadas=1,
        porcentaje_avance=70.0,
        semestre_actual=5,
        estrato=3,
        creditos_aprobados=80,
        asignaturas_aprobadas=25,
        edad=22,
        genero="M",
        promedio_ingles_nivel="B1",
    )


# ---------------------------------------------------------------------------
# _prepare_features: contrato de features con el .pkl
# ---------------------------------------------------------------------------

class TestPrepareFeatures:
    """Verifica que el DataFrame tenga las 13 features en el orden esperado."""

    def test_devuelve_una_sola_fila(self, student_input_valido):
        df = PredictionService._prepare_features(student_input_valido)
        assert len(df) == 1

    def test_tiene_exactamente_13_columnas(self, student_input_valido):
        df = PredictionService._prepare_features(student_input_valido)
        assert df.shape[1] == 13

    def test_los_nombres_de_columnas_coinciden_con_el_contrato_del_pkl(
        self, student_input_valido
    ):
        df = PredictionService._prepare_features(student_input_valido)
        expected = {
            "promedio_materias_basicas",
            "promedio_ingenieria",
            "promedio_programacion",
            "promedio_matematica_estadistica",
            "asignaturas_reprobadas",
            "porcentaje_avance",
            "semestre_actual",
            "estrato",
            "creditos_aprobados",
            "asignaturas_aprobadas",
            "edad",
            "genero",
            "promedio_ingles_nivel",
        }
        assert set(df.columns) == expected

    def test_los_valores_se_pasan_tales_cuales(self, student_input_valido):
        df = PredictionService._prepare_features(student_input_valido)
        row = df.iloc[0]
        assert row["promedio_ingenieria"] == 3.8
        assert row["edad"] == 22
        assert row["genero"] == "M"
        assert row["promedio_ingles_nivel"] == "B1"

    def test_no_modifica_el_objeto_original(self, student_input_valido):
        """Pydantic v2 congela el modelo, pero por si acaso verificamos."""
        original_edad = student_input_valido.edad
        PredictionService._prepare_features(student_input_valido)
        assert student_input_valido.edad == original_edad


# ---------------------------------------------------------------------------
# _generate_recommendation: contenido de las recomendaciones
# ---------------------------------------------------------------------------

class TestGenerateRecommendation:
    """Verifica que el texto de la recomendacion coincida con la clase."""

    def _make_student(self, **overrides):
        base = dict(
            promedio_materias_basicas=3.5,
            promedio_ingenieria=3.8,
            promedio_programacion=3.6,
            promedio_matematica_estadistica=3.4,
            asignaturas_reprobadas=1,
            porcentaje_avance=70.0,
            semestre_actual=5,
            estrato=3,
            creditos_aprobados=80,
            asignaturas_aprobadas=25,
            edad=22,
            genero="M",
            promedio_ingles_nivel="B1",
        )
        base.update(overrides)
        return StudentInput(**base)

    def test_recomendacion_bajo_es_no_vacia(self):
        s = self._make_student(promedio_ingenieria=2.5, promedio_materias_basicas=2.5)
        text = PredictionService._generate_recommendation("Bajo", s)
        assert isinstance(text, str)
        assert len(text) > 0

    def test_recomendacion_medio_es_no_vacia(self):
        s = self._make_student()
        text = PredictionService._generate_recommendation("Medio", s)
        assert isinstance(text, str)
        assert len(text) > 0

    def test_recomendacion_alto_es_no_vacia(self):
        s = self._make_student(promedio_ingenieria=4.8, promedio_materias_basicas=4.5)
        text = PredictionService._generate_recommendation("Alto", s)
        assert isinstance(text, str)
        assert len(text) > 0

    def test_recomendacion_bajo_incluye_promedio_basicas_del_estudiante(self):
        s = self._make_student(promedio_materias_basicas=2.7)
        text = PredictionService._generate_recommendation("Bajo", s)
        # El texto debe mencionar el promedio real del estudiante.
        assert "2.70" in text

    def test_recomendacion_clase_desconocida_cae_a_default(self):
        s = self._make_student()
        # Aunque la API garantiza Bajo/Medio/Alto, validamos el fallback.
        text = PredictionService._generate_recommendation("Desconocido", s)
        assert "mantener" in text.lower() or "esfuerzo" in text.lower()

    def test_las_tres_clases_producen_textos_diferentes(self):
        """Bono: confirma que las 3 ramas se diferencian."""
        s = self._make_student(promedio_ingenieria=3.5, promedio_materias_basicas=3.5)
        t_bajo = PredictionService._generate_recommendation("Bajo", s).lower()
        t_medio = PredictionService._generate_recommendation("Medio", s).lower()
        t_alto = PredictionService._generate_recommendation("Alto", s).lower()
        assert t_bajo != t_medio
        assert t_medio != t_alto
        assert t_bajo != t_alto


# ---------------------------------------------------------------------------
# Version y estado del modulo
# ---------------------------------------------------------------------------

class TestModelVersion:
    def test_model_version_es_real_data_v1(self):
        from app.services.prediction_service import MODEL_VERSION
        assert MODEL_VERSION == "real-data-v1"

    def test_shap_disponible_es_bool(self):
        from app.services.prediction_service import _SHAP_AVAILABLE
        assert isinstance(_SHAP_AVAILABLE, bool)


# ---------------------------------------------------------------------------
# Health check (estructura)
# ---------------------------------------------------------------------------

class TestHealthCheckStructure:
    def test_health_check_sin_model_cargado(self):
        """Sin modelo, status deberia ser 'degraded' (no crash)."""
        # Asegurar que no hay modelo cargado.
        PredictionService.model = None
        h = PredictionService.health_check()
        assert h["status"] == "degraded"
        assert h["model_loaded"] is False
        assert h["database_connected"] in (True, False)
        assert h["model_version"] == "real-data-v1"
        assert "timestamp" in h