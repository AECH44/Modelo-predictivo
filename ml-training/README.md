# ML Training — Pipeline Python

Pipeline de entrenamiento y análisis del modelo. Lee datos reales desde
PostgreSQL, entrena un Gradient Boosting Classifier, y genera análisis.

## Stack

- Python 3.14
- scikit-learn 1.9
- pandas 3.0
- numpy 2.5
- matplotlib 3.11
- psycopg2-binary 2.9
- joblib 1.6

## Cómo re-entrenar

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt

# Lee credenciales de backend/.env
# Entrena con datos reales → genera trained_models/saberpro_model.pkl
python train_from_real.py

# Genera 6 PNGs + reporte.md en analysis/
python analyze_results.py
deactivate
```

## Archivos generados

```
trained_models/
└── saberpro_model.pkl              # Modelo entrenado (GradientBoostingClassifier)

models/
└── desercion_metrics.json          # Métricas de evaluación

analysis/
├── comparacion_metricas.png
├── matriz_confusion_gradientboostingclassifier.png
├── matriz_confusion_logisticregression.png
├── feature_importance.png
├── distribucion_clases.png
├── roc_curves.png
└── reporte.md
```

Después de re-entrenar, **reiniciar `ml-service`** para que recargue el `.pkl`.

## Target derivado

El target `Bajo | Medio | Alto` se deriva de `promedio_acumulado` (no del
puntaje Saber Pro real). Esta limitación está documentada en
[`../docs/ANALISIS_RESULTADOS.md`](../docs/ANALISIS_RESULTADOS.md) sección 9.

```
promedio_acumulado == NULL o == 0   →  fila excluida
promedio_acumulado ∈ (0, 3.0)       →  "Bajo"
promedio_acumulado ∈ [3.0, 4.0)     →  "Medio"
promedio_acumulado >= 4.0           →  "Alto"
```

## 13 features

- 11 numéricas: promedios (básicas, ingeniería, programación, matemática
  estadística), asignaturas reprobadas, porcentaje avance, semestre, estrato,
  créditos aprobados, asignaturas aprobadas, edad.
- 2 categóricas: género (M/F), nivel de inglés MCER (A1-C2).
