"""
Tests para los modelos Pydantic de ml-service.

Cubre la barrera de validacion de entrada del predictor: cualquier
feature fuera de rango debe rechazarse, y los defaults deben estar
bien configurados para no romper el contrato del JSON de salida.

Estos tests NO requieren FastAPI, ni PostgreSQL, ni el modelo .pkl.
Son tests puros de pydantic, los mas rapidos y confiables del proyecto.
"""

import pytest
from pydantic import ValidationError

from app.models.student_model import (
    StudentInput,
    PredictionResponse,
    FeatureContribution,
)


# ---------------------------------------------------------------------------
# StudentInput: validacion de las 13 features del modelo
# ---------------------------------------------------------------------------

@pytest.fixture
def base_input():
    """13 features validas. Sirve como base para tests de override."""
    return {
        "promedio_materias_basicas": 3.5,
        "promedio_ingenieria": 3.8,
        "promedio_programacion": 3.6,
        "promedio_matematica_estadistica": 3.4,
        "asignaturas_reprobadas": 1,
        "porcentaje_avance": 70.0,
        "semestre_actual": 5,
        "estrato": 3,
        "creditos_aprobados": 80,
        "asignaturas_aprobadas": 25,
        "edad": 22,
        "genero": "M",
        "promedio_ingles_nivel": "B1",
    }


class TestStudentInputValid:
    """Casos validos: el input debe aceptarse tal cual."""

    def test_acepta_input_completo_valido(self, base_input):
        s = StudentInput(**base_input)
        assert s.promedio_materias_basicas == 3.5
        assert s.genero == "M"
        assert s.promedio_ingles_nivel == "B1"

    def test_acepta_todos_los_niveles_de_ingles(self, base_input):
        for nivel in ("A1", "A2", "B1", "B2", "C1", "C2"):
            s = StudentInput(**{**base_input, "promedio_ingles_nivel": nivel})
            assert s.promedio_ingles_nivel == nivel

    def test_acepta_genero_femenino(self, base_input):
        s = StudentInput(**{**base_input, "genero": "F"})
        assert s.genero == "F"


class TestStudentInputInvalid:
    """Casos invalidos: cada campo fuera de rango debe rechazarse."""

    def test_rechaza_promedio_fuera_de_rango(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "promedio_materias_basicas": -0.1})
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "promedio_materias_basicas": 5.1})

    def test_rechaza_edad_fuera_de_rango(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "edad": 10})   # < 14
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "edad": 100})  # > 80

    def test_rechaza_genero_invalido(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "genero": "X"})
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "genero": "MASCULINO"})

    def test_rechaza_nivel_ingles_invalido(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "promedio_ingles_nivel": "C3"})
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "promedio_ingles_nivel": "b1"})  # lowercase

    def test_rechaza_estrato_fuera_de_rango(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "estrato": 0})   # < 1
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "estrato": 7})   # > 6

    def test_rechaza_reprobadas_negativas(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "asignaturas_reprobadas": -1})

    def test_rechaza_semestre_fuera_de_rango(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "semestre_actual": 0})
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "semestre_actual": 13})

    def test_rechaza_porcentaje_avance_fuera_de_rango(self, base_input):
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "porcentaje_avance": -1})
        with pytest.raises(ValidationError):
            StudentInput(**{**base_input, "porcentaje_avance": 100.1})

    def test_rechaza_feature_obligatoria_faltante(self, base_input):
        sin_edad = {k: v for k, v in base_input.items() if k != "edad"}
        with pytest.raises(ValidationError):
            StudentInput(**sin_edad)


# ---------------------------------------------------------------------------
# PredictionResponse: contrato de salida
# ---------------------------------------------------------------------------

class TestPredictionResponse:
    """Contrato del JSON que va al frontend (y de ahi al browser)."""

    def test_feature_contributions_por_defecto_es_lista_vacia(self):
        """Si SHAP no esta disponible o falla, devuelve lista vacia (no null)."""
        from datetime import datetime
        r = PredictionResponse(
            resultado="Medio",
            probabilidad=0.5,
            confidence_pct=50.0,
            recomendacion="x",
            timestamp=datetime.now(),
        )
        assert r.feature_contributions == []
        assert isinstance(r.feature_contributions, list)

    def test_model_version_por_defecto(self):
        from datetime import datetime
        r = PredictionResponse(
            resultado="Medio",
            probabilidad=0.5,
            confidence_pct=50.0,
            recomendacion="x",
            timestamp=datetime.now(),
        )
        assert r.model_version == "real-data-v1"

    def test_probabilities_dict_vacio_por_defecto(self):
        from datetime import datetime
        r = PredictionResponse(
            resultado="Alto",
            probabilidad=0.9,
            confidence_pct=90.0,
            recomendacion="y",
            timestamp=datetime.now(),
        )
        assert r.probabilities == {}

    def test_serialize_a_dict_incluye_feature_contributions(self):
        from datetime import datetime
        r = PredictionResponse(
            resultado="Bajo",
            probabilidad=0.6,
            confidence_pct=60.0,
            recomendacion="z",
            timestamp=datetime(2026, 10, 9, 12, 0, 0),
            feature_contributions=[
                FeatureContribution(feature="num__promedio_ingenieria",
                                    contribution=0.3, abs_contribution=0.3),
            ],
        )
        d = r.model_dump()
        assert d["resultado"] == "Bajo"
        assert len(d["feature_contributions"]) == 1
        assert d["feature_contributions"][0]["feature"] == "num__promedio_ingenieria"


class TestFeatureContribution:
    def test_abs_contribution_es_valor_absoluto_de_contribution(self):
        c = FeatureContribution(feature="x", contribution=-0.5, abs_contribution=0.5)
        assert c.abs_contribution == abs(c.contribution)

    def test_feature_y_contribution_son_obligatorios(self):
        with pytest.raises(ValidationError):
            FeatureContribution()  # sin argumentos
        with pytest.raises(ValidationError):
            FeatureContribution(feature="x", contribution=0.1)  # falta abs_contribution