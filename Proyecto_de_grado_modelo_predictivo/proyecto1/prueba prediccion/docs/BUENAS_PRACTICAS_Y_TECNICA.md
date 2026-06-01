# 🏆 BUENAS PRÁCTICAS & EXPLICACIÓN TÉCNICA

## PARTE 7 — BUENAS PRÁCTICAS

### 🔐 Seguridad

#### Variables de Entorno
```bash
# ✓ CORRECTO: Usar .env
VITE_API_URL=http://localhost:8000

# ✗ INCORRECTO: Hardcodear en código
const API_URL = "http://localhost:8000"
```

#### Manejo de Contraseñas
```python
# ✓ CORRECTO: Hash de contraseñas
from werkzeug.security import generate_password_hash
hashed = generate_password_hash('password', method='pbkdf2:sha256')

# ✗ INCORRECTO: Guardar en texto plano
password = "123456"
```

#### CORS Configurado
```python
# ✓ CORRECTO: Whitelist de dominios
CORS_ORIGINS = ["http://localhost:5173", "https://app.example.com"]

# ✗ INCORRECTO: Permitir cualquiera
allow_origins=["*"]
```

### 🛡️ Validación de Datos

#### Frontend
```javascript
// ✓ CORRECTO: Validar antes de enviar
if (!formData.edad || formData.edad < 16 || formData.edad > 70) {
    setError("Edad debe estar entre 16 y 70");
    return;
}

// ✗ INCORRECTO: Enviar datos sin validar
fetch(API_URL, { body: formData });
```

#### Backend
```python
# ✓ CORRECTO: Validación Pydantic
class StudentInput(BaseModel):
    edad: int = Field(..., ge=16, le=70)
    promedio: float = Field(..., ge=0, le=5)

# ✗ INCORRECTO: Sin validación
def predict(edad, promedio):
    return model.predict([[edad, promedio]])
```

### 🏗️ Arquitectura Limpia

#### Separación de Responsabilidades
```
├── routes/           # Solo reciben/retornan HTTP
├── services/         # Lógica de negocio
├── models/           # Esquemas de datos
├── database/         # Interacción con BD
└── ml/              # Modelos de ML
```

#### NO mezclar capas:
```python
# ✗ INCORRECTO: Todo en una función
def predict_endpoint(data):
    # validar
    # conectar BD
    # cargar modelo
    # predecir
    # guardar
    # retornar
```

```python
# ✓ CORRECTO: Cada capa con responsabilidad
@router.post("/predict")
def predict(data: StudentInput):
    prediction = PredictionService.predict(data)
    return prediction
```

### 📝 Logging y Debugging

#### Logging Estructurado
```python
# ✓ CORRECTO
import logging
logger = logging.getLogger(__name__)
logger.info(f"Predicción exitosa: {prediction.categoria}")

# ✗ INCORRECTO
print("Predicción exitosa")
```

#### Error Handling
```python
# ✓ CORRECTO: Capturar y loguear
try:
    prediction = model.predict(features)
except Exception as e:
    logger.error(f"Error prediciendo: {e}")
    raise HTTPException(status_code=500, detail=str(e))

# ✗ INCORRECTO: Sin manejo
prediction = model.predict(features)
```

### 💾 Gestión de Dependencias

#### requirements.txt Versionado
```txt
# ✓ CORRECTO: Especificar versiones
fastapi==0.104.1
scikit-learn==1.3.2

# ✗ INCORRECTO: Sin versiones
fastapi
scikit-learn
```

#### package.json Actualizado
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

### 🧪 Testing

#### Tests Unitarios (Backend)
```python
def test_predict():
    student = StudentInput(
        edad=22, promedio=4.2, horas_estudio=20,
        estrato=3, carrera="Ing", acceso_internet=True, semestre=6
    )
    result = PredictionService.predict(student)
    assert result.categoria in ['Bajo', 'Medio', 'Alto']
```

#### Tests Unitarios (Frontend)
```javascript
test('PredictionForm submits data', () => {
    const { getByRole } = render(<PredictionForm />);
    const submitButton = getByRole('button', { name: /Generar/i });
    fireEvent.click(submitButton);
    // assertions...
});
```

### 📦 Versionado Semántico

```
v1.0.0
 ↓  ↓  ↓
 |  |  └─ PATCH: Bug fixes (1.0.1)
 |  └────── MINOR: Features (1.1.0)
 └───────── MAJOR: Breaking changes (2.0.0)
```

---

## PARTE 8 — EXPLICACIÓN TÉCNICA DETALLADA

### 🏛️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│                   (React Frontend - Vite)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Componentes UI                                     │   │
│  │  - PredictionForm: Recolecta datos                 │   │
│  │  - ResultsDisplay: Muestra predicción              │   │
│  │  - ErrorAlert: Maneja errores                      │   │
│  └─────────────────────────────────────────────────────┘   │
│              ↓ HTTP POST /predict (JSON) ↓                  │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                    CAPA DE API REST                          │
│                  (FastAPI Backend)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Routes                                             │   │
│  │  - POST /predict: Endpoint predicción              │   │
│  │  - GET /history/{id}: Histórico                    │   │
│  │  - GET /statistics: Estadísticas                   │   │
│  └─────────────────────────────────────────────────────┘   │
│              ↓ Valida con Pydantic ↓                        │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                 CAPA DE LÓGICA DE NEGOCIO                   │
│               (PredictionService FastAPI)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Prepara features                                │   │
│  │  2. Carga modelo ML (.pkl)                          │   │
│  │  3. Ejecuta predicción                              │   │
│  │  4. Genera recomendación                            │   │
│  │  5. Guarda en BD                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│              ↓ Accede a BD y ML ↓                           │
└──────────────────────────────────────────────────────────────┘
         ↙                         ↘
┌─────────────────┐    ┌──────────────────────────┐
│  BASE DE DATOS  │    │  MODELOS ML (Scikit)    │
│  (PostgreSQL)   │    │                          │
│                 │    │  - Gradient Boosting    │
│ - students      │    │  - Logistic Regression  │
│ - predictions   │    │                          │
│ - vistas        │    │ Archivo: .pkl           │
└─────────────────┘    └──────────────────────────┘
```

### 🔄 Flujo de Ejecución Paso a Paso

```
1. USUARIO INGRESA DATOS
   ├─ Edad: 22
   ├─ Promedio: 4.2
   ├─ Horas estudio: 25
   ├─ Estrato: 3
   ├─ Carrera: "Ingeniería"
   ├─ Internet: true
   └─ Semestre: 6

2. FRONTEND VALIDA
   ├─ edad ∈ [16, 70]? ✓
   ├─ promedio ∈ [0, 5]? ✓
   ├─ horas_estudio ≥ 0? ✓
   ├─ estrato ∈ [1, 6]? ✓
   └─ semestre ∈ [1, 10]? ✓

3. FRONTEND ENVÍA
   POST /api/predict
   Content-Type: application/json
   
   {
     "edad": 22,
     "promedio": 4.2,
     "horas_estudio": 25,
     "estrato": 3,
     "carrera": "Ingeniería",
     "acceso_internet": true,
     "semestre": 6
   }

4. BACKEND RECIBE
   ├─ Route: prediction_routes.py
   ├─ Valida con Pydantic
   ├─ Instantia StudentInput
   └─ Llama PredictionService.predict()

5. PREDICTION SERVICE
   ├─ Prepara features: [22, 4.2, 25, 3, 1, 6]
   ├─ Normaliza con StandardScaler
   └─ Features normalizados: [-0.65, 1.23, 0.89, -0.15, 1.05, 0.42]

6. CARGA MODELO
   ├─ Abre: ml/trained_models/saberpro_model.pkl
   ├─ Deserializa con joblib
   └─ Obtiene: GradientBoostingClassifier entrenado

7. PREDICCIÓN
   ├─ model.predict([features_norm]) → [2]
   │  (0=Bajo, 1=Medio, 2=Alto)
   ├─ model.predict_proba([features_norm]) 
   │  → [[0.02, 0.06, 0.92]]
   └─ Max probabilidad: 0.92

8. MAPEO DE RESULTADO
   ├─ Predicción: 2 → "Alto"
   ├─ Probabilidad: 0.92
   ├─ Confianza: 92.0%
   └─ Recomendación: "Mantén nivel..."

9. GUARDAR EN BD
   INSERT INTO predictions (student_id, categoria, probabilidad, recomendacion)
   VALUES (NULL, 'Alto', 0.92, '...')

10. RESPONDER AL FRONTEND
    {
      "categoria": "Alto",
      "probabilidad": 0.92,
      "confidence_pct": 92.0,
      "recomendacion": "Mantén tu nivel...",
      "timestamp": "2024-05-19T10:30:00",
      "model_version": "1.0.0"
    }

11. FRONTEND MUESTRA RESULTADO
    ├─ Categoría: "Alto" (color verde)
    ├─ Barra progreso: 92% llena
    ├─ Recomendación: Mostrada en card
    └─ Timestamp: Fecha/hora predicción
```

### 🤖 Algoritmos ML Explicados

#### Regresión Logística Múltiple

**¿Cómo funciona?**

1. **Entrada**: [edad, promedio, horas_estudio, estrato, internet, semestre]

2. **Función Logística (Sigmoid)**:
   ```
   P(y=k|x) = e^(z_k) / Σ e^(z_j)    [Softmax para multi-clase]
   
   donde: z_k = β₀ + β₁·x₁ + β₂·x₂ + ... + β₆·x₆
   ```

3. **Entrenamiento**: Minimize cross-entropy loss
   ```
   Loss = -Σ y_true · log(y_pred)
   ```

4. **Predicción**: Argmax de probabilidades
   ```
   Predicción = argmax(P(y=0|x), P(y=1|x), P(y=2|x))
   ```

**Ventajas:**
- ✅ Rápido
- ✅ Interpretable
- ✅ Probabilidades calibradas

**Desventajas:**
- ❌ Asume separabilidad lineal
- ❌ Menos preciso con datos complejos

#### Gradient Boosting

**¿Cómo funciona?**

1. **Inicialización**: Predicción promedio
   ```
   h₀(x) = promedio(y_train)
   ```

2. **Iteraciones** (100 árboles):
   ```
   Para t = 1 a 100:
     - Calcular residuos: r = y_true - predicción_anterior
     - Entrenar árbol en residuos
     - Actualizar predicción: pred += learning_rate * árbol(x)
   ```

3. **Predicción Final**:
   ```
   y_final = h₀ + α·h₁ + α·h₂ + ... + α·h₁₀₀
   ```

**Ventajas:**
- ✅ Muy preciso (SOTA)
- ✅ Captura no-linearidades
- ✅ Importancia de features

**Desventajas:**
- ❌ Lento
- ❌ Propenso a overfitting
- ❌ Requiere tuning

### 🔢 Preparación de Features

**Orden crítico** (debe ser consistente):

```python
# ORDEN CORRECTO
features = [
    edad,            # 0
    promedio,        # 1
    horas_estudio,   # 2
    estrato,         # 3
    acceso_internet, # 4 (True=1, False=0)
    semestre         # 5
]

# EL MODELO FUE ENTRENADO CON ESTE ORDEN
# Si cambias el orden, predicciones incorrectas!
```

**Normalización**:

```python
from sklearn.preprocessing import StandardScaler

# Entrenamiento
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)

# Predicción
X_test_scaled = scaler.transform(X_test)

# Fórmula: x_scaled = (x - mean) / std_dev
```

### 💾 Serialización del Modelo

**¿Qué es un archivo .pkl?**

```python
# Guardar
import joblib

model_data = {
    'model': trained_model,
    'scaler': scaler,
    'feature_names': ['edad', 'promedio', ...]
}
joblib.dump(model_data, 'saberpro_model.pkl')

# Cargar
model_data = joblib.load('saberpro_model.pkl')
model = model_data['model']
scaler = model_data['scaler']

# El .pkl es un archivo binario comprimido
# Contiene toda la información del modelo entrenado
```

### 🗄️ Interacción con PostgreSQL

**Flujo de Datos**:

```
FastAPI
  ↓ (SQLAlchemy)
PostgreSQL Connection Pool
  ↓ (psycopg2)
PostgreSQL Server
  ↓
Tablas:
- students (info demográfica)
- predictions (resultados)
```

**Inserción de Predicción**:

```sql
INSERT INTO predictions (student_id, categoria, probabilidad, recomendacion)
VALUES (1, 'Alto', 0.92, 'Mantén...')
RETURNING id;
```

**Query de Estadísticas**:

```sql
SELECT categoria, 
       COUNT(*) as total,
       AVG(probabilidad) as confianza
FROM predictions
GROUP BY categoria;
```

### 🌉 Integración Frontend-Backend

**CORS (Cross-Origin Resource Sharing)**:

```
Frontend (http://localhost:5173)
           ↓ solicita recurso a
Backend (http://localhost:8000)
```

**Sin CORS configurado**: Error 403 Forbidden

**Con CORS configurado**:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)
```

### 📊 Métri cas de Evaluación

**Matriz de Confusión**:

```
                Predicción
              Bajo  Medio  Alto
         ┌──────────────────────┐
         │ 35    3     2        │ Bajo (40)
Realidad ├──────────────────────┤
         │ 2    56     2        │ Medio (60)
         ├──────────────────────┤
         │ 1     3    46        │ Alto (50)
         └──────────────────────┘
```

**Cálculos**:

```
Accuracy = (TP+TN) / Total = (35+56+46) / 150 = 92%

Precision (Bajo) = TP / (TP+FP) = 35 / (35+2+1) = 94%
Recall (Bajo) = TP / (TP+FN) = 35 / 40 = 88%
F1 (Bajo) = 2 * (94 * 88) / (94 + 88) = 91%
```

### 🚀 Deployment (Futuro)

**Opciones**:

1. **Docker + Kubernetes**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY . .
   RUN pip install -r requirements.txt
   CMD ["python", "run.py"]
   ```

2. **Heroku**
   ```bash
   git push heroku main
   ```

3. **AWS Lambda + API Gateway**
   ```python
   def lambda_handler(event, context):
       # parse event
       # run prediction
       # return response
   ```

### 🔮 Futuro del Proyecto

```
Versión 1.1:
- [ ] Autenticación con JWT
- [ ] Rate limiting
- [ ] Validación de datos más estricta
- [ ] Tests 100% coverage

Versión 1.2:
- [ ] Re-entrenar modelo automáticamente
- [ ] A/B testing de modelos
- [ ] Dashboard de análisis
- [ ] Alertas y monitoreo

Versión 2.0:
- [ ] Multi-usuario
- [ ] Soporte múltiples universidades
- [ ] API de terceros
- [ ] Mobile app
```

---

**Documentación Técnica Completa ✓**
