# Documentacion del Modelo de Machine Learning

## Sistema Predictor Saber Pro

---

## Tabla de Contenidos

1. [Algoritmo: Regresion Logistica Multiple](#algoritmo-regresion-logistica-multiple)
2. [Features Utilizadas](#features-utilizadas)
3. [Variable Target](#variable-target)
4. [Metricas de Evaluacion](#metricas-de-evaluacion)
5. [Como Reentrenar el Modelo](#como-reentrenar-el-modelo)
6. [Estructura del Archivo de Modelo](#estructura-del-archivo-de-modelo)

---

## Algoritmo: Regresion Logistica Multiple

### Descripcion

El modelo utiliza **Regresion Logistica Multiple** (Multinomial Logistic Regression) para predecir la categoria de desempeno del estudiante en el examen Saber Pro.

### Por que Regresion Logistica?

| Ventaja | Descripcion |
|---------|-------------|
| Interpretabilidad | Los coeficientes indican la influencia de cada feature |
| Velocidad | Entrenamiento rapido, inferencia en milisegundos |
| Probabilidades | Genera probabilidades de pertenencia a cada clase |
| Estabilidad | No requiere muchos datos para funcionar bien |
| Linealidad | Funciona bien con datos linealmente separables |

### Fundamento Matematico

La regresion logistica modela la probabilidad de que una observacion pertenezca a una categoria:

```
P(Y = k | X) = softmax_k(W_k * X + b_k)

Donde:
- Y = variable objetivo (Bajo, Medio, Alto)
- X = vector de features
- W = matriz de pesos
- b = vector de bias
```

### Configuracion del Modelo

```python
from sklearn.linear_model import LogisticRegression

model = LogisticRegression(
    multi_class='multinomial',  # 3 clases: Bajo, Medio, Alto
    solver='lbfgs',              # Optimizador para multiclase
    max_iter=1000,              # Maximo iteraciones
    random_state=42,            # Reproducibilidad
    C=1.0                        # Regularizacion L2
)
```

---

## Features Utilizadas

### Lista de Features

El modelo utiliza 8 features de entrada para realizar la prediccion:

| # | Feature | Tipo | Rango | Descripcion |
|---|---------|------|-------|-------------|
| 1 | promedio_acumulado | float | 0.0-5.0 | Promedio academico general acumulado |
| 2 | promedio_basicas | float | 0.0-5.0 | Promedio en materias basicas |
| 3 | promedio_ingenieria | float | 0.0-5.0 | Promedio en materias de ingenieria |
| 4 | num_reprobadas | int | 0-20 | Cantidad de materias reprobadas |
| 5 | pct_creditos | float | 0-100 | Porcentaje de creditos aprobados |
| 6 | semestre | int | 1-10 | Semestre actual del estudiante |
| 7 | estrato | int | 1-6 | Estrato socioeconomico (1=bajo, 6=alto) |
| 8 | genero | int | 0-1 | Genero: M=1, F=0 |

### Preprocesamiento de Features

#### Estandarizacion

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
```

Se utiliza **StandardScaler** para normalizar las features, asegurando que todas tengan media 0 y desviacion estandar 1. Esto es importante porque las features tienen diferentes escalas (ej: semestre 1-10 vs. pct_creditos 0-100).

#### Encoding de Variables Categoricas

```python
# Genero: texto a binario
genero_encoded = 1 if genero == 'M' else 0

# Estrato: mantener como integer (ya es numerico)
```

### Importancia de Features

El modelo asigna pesos diferentes a cada feature. Las mas influyentes suelen ser:

1. **promedio_acumulado**: Impacto directo en el desempeno esperado
2. **num_reprobadas**: Indicador negativo de rendimiento
3. **pct_creditos**: Progreso academico general
4. **promedio_ingenieria**: Relevant para estudiantes de ingenieria

---

## Variable Target

### Categorias de Prediccion

El modelo clasifica a los estudiantes en 3 categorias:

| Categoria | Descripcion | Rango de Probabilidad |
|----------|-------------|----------------------|
| **Bajo** | Desempeno debil esperado | 0.0 - 0.33 |
| **Medio** | Desempeno intermedio | 0.33 - 0.66 |
| **Alto** | Desempeno fuerte esperado | 0.66 - 1.0 |

### Encoding del Target

| Categoria | Valor Numerico |
|-----------|---------------|
| Bajo | 0 |
| Medio | 1 |
| Alto | 2 |

### Recomendaciones por Categoria

#### Bajo
- Reforzar materias basicas
- Aumentar horas de estudio
- Buscar tutorías académicas
- Formar grupos de estudio

#### Medio
- Consolidar conocimientos
- Practicar con simulacros
- Identificar áreas debiles
- Mantener consistencia

#### Alto
- Mantener ritmo de estudio
- Practicar bajo presión
- Considerar ser tutor
- Repasar temas complejos

---

## Metricas de Evaluacion

### Metricas Principales

| Metrica | Descripcion | Valor Esperado |
|---------|-------------|----------------|
| Accuracy | Porcentaje de predicciones correctas | > 80% |
| Precision | Exactitud de predicciones positivas | > 75% |
| Recall | Cobertura de casos positivos | > 75% |
| F1-Score | Media armonica de precision y recall | > 75% |

### Metricas Detalladas por Clase

```python
from sklearn.metrics import classification_report, confusion_matrix

print(classification_report(y_test, y_pred))
```

Output esperado:
```
              precision    recall  f1-score   support

       Bajo       0.85      0.80      0.82       100
      Medio       0.88      0.90      0.89       200
       Alto       0.92      0.91      0.91       150

    accuracy                           0.87       450
   macro avg       0.88      0.87      0.87       450
weighted avg       0.87      0.87      0.87       450
```

### Matriz de Confusion

```python
confusion_matrix(y_test, y_pred)
```

Estructura:
```
                 Predicho
              Bajo  Medio  Alto
Real  Bajo    [ 80   15     5 ]
      Medio   [ 10  180    10 ]
      Alto    [  3   12   135 ]
```

### Metricas Adicionales

| Metrica | Descripcion |
|---------|-------------|
| ROC-AUC | Area bajo curva ROC (1.0 = perfecto) |
| Log Loss | Perdida logaritmica (menor es mejor) |
| Macro F1 | F1 promedio sin ponderar por clase |
| Weighted F1 | F1 ponderado por soporte de clase |

---

## Como Reentrenar el Modelo

### Paso 1: Preparar Datos

```bash
cd E:\Projects\proyecto1\prueba prediccion\ml
```

Crear o actualizar el archivo `datasets/saberpro_data.csv`:

```csv
promedio_acumulado,promedio_basicas,promedio_ingenieria,num_reprobadas,pct_creditos,semestre,estrato,genero,resultado
4.2,4.0,4.3,2,75.5,6,3,M,Alto
3.5,3.2,3.8,5,60.0,5,2,F,Medio
2.8,2.5,3.0,8,45.0,4,1,M,Bajo
...
```

### Paso 2: Ejecutar Script de Entrenamiento

```bash
# Activar entorno virtual
.\venv\Scripts\Activate.ps1

# Ejecutar entrenamiento
python train_model.py
```

### Paso 3: Verificar Modelo Generado

```bash
# Verificar archivo
dir trained_models\saberpro_model.pkl

# Probar carga del modelo
python -c "import joblib; m=joblib.load('trained_models/saberpro_model.pkl'); print('Modelo cargado:', m['model'])"
```

### Estructura del Script de Entrenamiento

```python
# ml/train_model.py

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report
import joblib

# 1. Cargar datos
df = pd.read_csv('datasets/saberpro_data.csv')

# 2. Separar features y target
X = df.drop('resultado', axis=1)
y = df['resultado']

# 3. Codificar target
target_map = {'Bajo': 0, 'Medio': 1, 'Alto': 2}
y_encoded = y.map(target_map)

# 4. Dividir datos
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

# 5. Escalar features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 6. Entrenar modelo
model = LogisticRegression(multi_class='multinomial', max_iter=1000)
model.fit(X_train_scaled, y_train)

# 7. Evaluar
y_pred = model.predict(X_test_scaled)
print(classification_report(y_test, y_pred))

# 8. Guardar modelo
joblib.dump({
    'model': model,
    'scaler': scaler,
    'target_map': target_map,
    'feature_names': list(X.columns),
    'version': '1.0.0'
}, 'trained_models/saberpro_model.pkl')
```

### Parametros para Optimizacion

Si el rendimiento no es optimo, ajustar:

```python
model = LogisticRegression(
    multi_class='multinomial',
    solver='lbfgs',      # Cambiar: 'newton-cg', 'sag', 'saga'
    C=1.0,              # Regularizacion: 0.01 a 100
    max_iter=1000,      # Mas iteraciones si no converge
    class_weight='balanced'  # Si hay desbalance de clases
)
```

---

## Estructura del Archivo de Modelo

El modelo se guarda como un diccionario Python serializado con joblib:

```python
model_data = {
    'model': LogisticRegression(...),
    'scaler': StandardScaler(...),
    'target_map': {0: 'Bajo', 1: 'Medio', 2: 'Alto'},
    'feature_names': ['promedio_acumulado', 'promedio_basicas', ...],
    'version': '1.0.0',
    'training_date': '2026-05-26',
    'accuracy': 0.92
}
```

### Carga del Modelo en Backend

```python
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / 'ml/trained_models/saberpro_model.pkl'

def load_model():
    if MODEL_PATH.exists():
        return joblib.load(MODEL_PATH)
    return None

def predict(student_data):
    model_data = load_model()
    if model_data is None:
        # Modo demo: generar prediccion sin modelo
        return generate_demo_prediction(student_data)

    model = model_data['model']
    scaler = model_data['scaler']

    # Preprocesar features
    features = prepare_features(student_data)
    features_scaled = scaler.transform([features])

    # Predecir
    prediction = model.predict(features_scaled)[0]
    probabilities = model.predict_proba(features_scaled)[0]

    return {
        'resultado': target_map[prediction],
        'probabilidad': max(probabilities)
    }
```

---

## Versionado del Modelo

| Version | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-05-26 | Version inicial con Regresion Logistica |

### Actualizar Version

Despues de reentrenar, actualizar en `backend/app/services/prediction_service.py`:

```python
MODEL_VERSION = "1.0.0"  # Cambiar a "1.0.1", "1.1.0", etc.
```

Formato de versionado: **MAJOR.MINOR.PATCH**
- MAJOR: Cambios incompatibles
- MINOR: Nuevas funcionalidades compatibles
- PATCH: Correcciones de errores

---

## Limitaciones del Modelo

1. **Datos simulados**: El modelo fue entrenado con datos sintéticos
2. **Features limitadas**: Solo 8 features de entrada
3. **Linealidad**: La regresion logistica asume relaciones lineales
4. **Generalizacion**: Puede no funcionar bien con datos reales diferentes

### Recomendaciones para Mejora

1. Recolectar datos reales de estudiantes
2. Agregar mas features (horas de estudio, ingresos familiares, etc.)
3. Probar algoritmos no lineales (Random Forest, XGBoost)
4. Validar con datos de prueba externos

---

## Monitoreo del Modelo

### Metric as a Service

El endpoint `/api/statistics` muestra:

```json
{
  "total_predictions": 1500,
  "average_confidence": 82.5,
  "category_distribution": {...}
}
```

### Alertas

Monitorear:
- Average confidence < 70%
- Degradacion de accuracy con el tiempo
- Cambios en distribucion de categorias

---

**Documentacion del Modelo ML completada.**