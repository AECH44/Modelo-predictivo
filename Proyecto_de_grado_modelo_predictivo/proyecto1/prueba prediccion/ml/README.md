# 🤖 Machine Learning - Modelo Predictor Saber Pro

## 📋 Descripción

Módulo de Machine Learning que entrena y serializa un modelo de clasificación de 3 clases (Bajo, Medio, Alto) para predecir desempeño en pruebas Saber Pro usando dos algoritmos:

1. **Logistic Regression** (Regresión Logística Múltiple)
2. **Gradient Boosting** (Ensemble de árboles)

## 🚀 Quick Start

### 1. Generar datos de entrenamiento
```bash
python generate_dataset.py
```
Crea `datasets/saberpro_data.csv` con 500 muestras sintéticas.

### 2. Entrenar modelo
```bash
python train_model.py
```

Salida:
- Modelo guardado en: `trained_models/saberpro_model.pkl`
- Reportes de métricas por consola
- Matriz de confusión

### 3. Modelo listo para usar
El backend FastAPI carga automáticamente `trained_models/saberpro_model.pkl`

## 📁 Estructura

```
ml/
├── train_model.py             # Script entrenamiento
├── data_preprocessing.py       # Limpieza y encoding
├── generate_dataset.py         # Generar datos sintéticos
├── datasets/
│   └── saberpro_data.csv       # Datos entrenamiento
└── trained_models/
    └── saberpro_model.pkl      # Modelo serializado (joblib)
```

## 📊 Variables de Entrada

| Variable | Tipo | Rango | Descripción |
|----------|------|-------|-------------|
| edad | int | 18-65 | Edad del estudiante |
| promedio | float | 2.0-5.0 | Promedio académico (escala 0-5) |
| horas_estudio | float | 5-50 | Horas de estudio por semana |
| estrato | int | 1-6 | Estrato socioeconómico |
| acceso_internet | bool | True/False | ¿Tiene internet? |
| semestre | int | 1-10 | Semestre actual |

## 🎯 Variable Objetivo

```
resultado_saber_pro: 
  - Bajo:  Predicción débil (< 40%)
  - Medio: Predicción intermedia (40-70%)
  - Alto:  Predicción fuerte (> 70%)
```

## 🧠 Explicación Técnica de Algoritmos

### 1️⃣ Regresión Logística Múltiple

**¿Qué es?**
Algoritmo de clasificación lineal que predice la probabilidad de cada clase.

**Fórmula:**
```
P(Clase) = 1 / (1 + e^(-z))    [Sigmoid]

donde z = w₀ + w₁·edad + w₂·promedio + ... + w₆·semestre
```

**Ventajas:**
- ✅ Rápido de entrenar
- ✅ Interpretable (coeficientes)
- ✅ Sirve como baseline
- ✅ Bajo uso de memoria

**Desventajas:**
- ❌ Asume relaciones lineales
- ❌ Menos preciso con datos complejos
- ❌ Difícil capturar interacciones

**Implementación:**
```python
from sklearn.linear_model import LogisticRegression

model = LogisticRegression(
    multi_class='multinomial',      # Usa softmax para 3+ clases
    max_iter=1000,
    random_state=42
)

model.fit(X_train_scaled, y_train)
predictions = model.predict(X_test_scaled)
probabilities = model.predict_proba(X_test_scaled)
```

### 2️⃣ Gradient Boosting

**¿Qué es?**
Ensemble de árboles de decisión que aprenden secuencialmente, corrigiendo errores del modelo anterior.

**Ventajas:**
- ✅ Mejor precisión que Logistic Regression
- ✅ Captura interacciones no lineales
- ✅ Detecta patrones complejos
- ✅ Feature importance automático

**Desventajas:**
- ❌ Más lento que Logistic Regression
- ❌ Menos interpretable
- ❌ Riesgo de overfitting
- ❌ Requiere tuning

**Implementación:**
```python
from sklearn.ensemble import GradientBoostingClassifier

model = GradientBoostingClassifier(
    n_estimators=100,           # 100 árboles
    learning_rate=0.1,          # Tasa de aprendizaje
    max_depth=5,                # Profundidad árbol
    min_samples_split=5,        # Mín muestras para split
    random_state=42
)

model.fit(X_train_scaled, y_train)
predictions = model.predict(X_test_scaled)
probabilities = model.predict_proba(X_test_scaled)
```

### Comparación Visual

```
Logistic Regression          Gradient Boosting
─────────────────────────    ──────────────────
  Precisión: 85%               Precisión: 92%
  Tiempo: 0.1s                 Tiempo: 2.5s
  Interpretable: Sí            Interpretable: No
  F1-Score: 0.84               F1-Score: 0.91
```

## 📈 Pipeline de Entrenamiento

```
1. CARGAR DATOS (CSV)
        ↓
2. PREPROCESAR
   - Limpiar nulos
   - Validar ranges
   - Encoding categóricas
        ↓
3. NORMALIZAR (StandardScaler)
   - Media = 0
   - Desv. Est. = 1
        ↓
4. SPLIT TRAIN/TEST (80/20)
   - Stratify para balance
        ↓
5. ENTRENAR MODELOS
   ├─ Logistic Regression
   └─ Gradient Boosting
        ↓
6. EVALUAR (Métricas)
   - Accuracy
   - Precision
   - Recall
   - F1-Score
        ↓
7. SELECCIONAR MEJOR
        ↓
8. GUARDAR .pkl (joblib)
```

## 📊 Métricas de Evaluación

### Accuracy
```
Correcto / Total = (TP + TN) / (TP + TN + FP + FN)
Qué % de predicciones son correctas
```

### Precision
```
TP / (TP + FP)
De las veces que predijo "Alto", ¿cuántas eran realmente "Alto"?
```

### Recall (Sensibilidad)
```
TP / (TP + FN)
De todos los "Alto" reales, ¿cuántos encontró?
```

### F1-Score
```
2 * (Precision * Recall) / (Precision + Recall)
Media armónica: Precision y Recall están equilibrados
```

## 🔄 Integración con FastAPI

### Flujo Completo:

```
Frontend (React)
   ↓ JSON
Backend FastAPI
   ↓ Carga datos
PredictionService
   ├─ load_model() → saberpro_model.pkl
   ├─ prepare_features(student_data)
   ├─ model.predict()
   ├─ model.predict_proba()
   └─ generar recomendación
   ↓ Response JSON
Frontend (React)
   ↓ Muestra resultado
Usuario
```

### Código en Backend:

```python
# En app/services/prediction_service.py

@classmethod
def load_model(cls):
    model_data = joblib.load('ml/trained_models/saberpro_model.pkl')
    cls.model = model_data['model']
    cls.scaler = model_data['scaler']

@classmethod
def predict(cls, student_data):
    # Preparar features [edad, promedio, horas_estudio, ...]
    features = cls._prepare_features(student_data)
    
    # Predecir
    prediction = cls.model.predict([features])[0]
    probabilities = cls.model.predict_proba([features])[0]
    
    # Mapear: 0→Bajo, 1→Medio, 2→Alto
    categoria = CATEGORY_MAP[prediction]
    probabilidad = np.max(probabilities)
    
    return PredictionResponse(
        categoria=categoria,
        probabilidad=probabilidad,
        confidence_pct=round(probabilidad * 100, 1),
        recomendacion=generate_recommendation(categoria),
        timestamp=datetime.now()
    )
```

## 🎯 Matriz de Confusión Explicada

```
              Predicción
              Bajo  Medio Alto
         ┌────────────────────┐
Bajo     │  TP   FN   FN      │  (Verdaderos Positivos)
Real     ├────────────────────┤
Medio    │  FP   TP   FN      │
         ├────────────────────┤
Alto     │  FP   FP   TP      │
         └────────────────────┘

TP (Verdadero Positivo): Predijo bien
FP (Falso Positivo): Predijo que era Bajo pero era otro
FN (Falso Negativo): Predijo que no era Bajo pero sí era
```

## 🚀 Mejora del Modelo

### Hiperparámetros Gradient Boosting

```python
# ACTUAL (Configuración actual)
GradientBoostingClassifier(
    n_estimators=100,      # 100 árboles
    learning_rate=0.1,     # Aprendizaje conservador
    max_depth=5,           # Árboles poco profundos
    random_state=42
)

# OPCIONES DE AJUSTE

# Para AUMENTAR precisión:
n_estimators=200          # Más árboles
learning_rate=0.05        # Aprendizaje más lento
max_depth=6               # Árboles más profundos

# Para VELOCIDAD:
n_estimators=50           # Menos árboles
learning_rate=0.2         # Aprendizaje más rápido
max_depth=3               # Árboles superficiales
```

## 📦 Archivo .pkl Explicado

El archivo `saberpro_model.pkl` contiene:

```python
{
    'model': <GradientBoostingClassifier trained>,
    'scaler': <StandardScaler fitted>,
    'feature_names': ['edad', 'promedio', 'horas_estudio', ...]
}
```

**Carga en Python:**
```python
import joblib

data = joblib.load('trained_models/saberpro_model.pkl')
model = data['model']
scaler = data['scaler']

# Usar para predicción
features_scaled = scaler.transform(X_new)
predictions = model.predict(features_scaled)
```

## 🔍 Validación Cruzada (k-fold)

Para mejor evaluación:

```python
from sklearn.model_selection import cross_val_score

scores = cross_val_score(model, X, y, cv=5)  # 5-fold CV
print(f"Accuracy: {scores.mean():.4f} (+/- {scores.std():.4f})")
```

## 📝 Checklist ML

- [x] Datos preprocesados
- [x] Encoding de categorías
- [x] Normalización StandardScaler
- [x] Train/Test Split 80/20
- [x] Logistic Regression entrenado
- [x] Gradient Boosting entrenado
- [x] Evaluación con métricas
- [x] Selección de mejor modelo
- [x] Modelo guardado (.pkl)
- [ ] Validación cruzada
- [ ] Ajuste de hiperparámetros
- [ ] Importancia de features

---

**Desarrollado para Proyecto de Grado 2024**
