# 🔌 Backend - FastAPI

## 📋 Descripción
Servidor REST API desarrollado con FastAPI para el Sistema Predictor Saber Pro. Maneja predicciones de ML, persistencia en PostgreSQL y expone endpoints REST.

## 🚀 Inicio Rápido

### 1. Crear entorno virtual
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales PostgreSQL:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saberpro_db
DB_USER=postgres
DB_PASSWORD=tu_contraseña
MODEL_PATH=ml/trained_models/saberpro_model.pkl
```

### 4. Iniciar servidor
```bash
python run.py
```

La API estará disponible en: **http://localhost:8000**
Documentación en: **http://localhost:8000/docs**

## 📁 Estructura

```
backend/app/
├── routes/
│   ├── __init__.py
│   └── prediction_routes.py    # Endpoints REST
├── services/
│   ├── __init__.py
│   └── prediction_service.py   # Lógica IA + BD
├── models/
│   ├── __init__.py
│   └── student_model.py        # Schemas Pydantic
├── database/
│   ├── __init__.py
│   ├── connection.py           # Conexión PostgreSQL
│   └── queries.py              # SQL queries
└── main.py                     # Aplicación FastAPI
```

## 🔌 Endpoints REST

### 1. POST /api/predict
Realiza predicción de desempeño Saber Pro

**Request:**
```json
{
  "edad": 22,
  "promedio": 4.2,
  "horas_estudio": 20,
  "estrato": 3,
  "carrera": "Ingeniería de Sistemas",
  "acceso_internet": true,
  "semestre": 6
}
```

**Response:**
```json
{
  "categoria": "Alto",
  "probabilidad": 0.87,
  "confidence_pct": 87.0,
  "recomendacion": "Mantén el nivel actual...",
  "timestamp": "2024-05-19T10:30:00",
  "model_version": "1.0.0"
}
```

### 2. GET /api/history/{student_id}
Obtiene histórico de predicciones

**Response:**
```json
{
  "student_id": 1,
  "predictions": [...],
  "total_predictions": 5,
  "average_confidence": 0.85
}
```

### 3. GET /api/statistics
Estadísticas generales del sistema

**Response:**
```json
{
  "total_predictions": 150,
  "average_confidence": 0.82,
  "category_distribution": {
    "Bajo": {"total": 40, "avg_confidence": 0.78},
    "Medio": {"total": 60, "avg_confidence": 0.82},
    "Alto": {"total": 50, "avg_confidence": 0.87}
  }
}
```

### 4. GET /api/health
Verifica estado del sistema

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "timestamp": "2024-05-19T10:30:00"
}
```

## 🗄️ Base de Datos

### Tabla: students
```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    edad INT,
    promedio FLOAT,
    horas_estudio FLOAT,
    estrato INT,
    carrera VARCHAR(100),
    acceso_internet BOOLEAN,
    semestre INT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: predictions
```sql
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    categoria VARCHAR(20),
    probabilidad FLOAT,
    recomendacion TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🤖 Integración con Modelo ML

El servicio carga automáticamente el modelo en startup:
```python
PredictionService.load_model()  # Carga saberpro_model.pkl
```

Flujo de predicción:
1. Recibe datos JSON del frontend
2. Valida con Pydantic (StudentInput)
3. Prepara features en orden correcto
4. Ejecuta `model.predict()` y `model.predict_proba()`
5. Mapea predicción a categoría (0→Bajo, 1→Medio, 2→Alto)
6. Genera recomendación personalizada
7. Retorna PredictionResponse

## 🔒 CORS Configuration

Permite comunicación desde:
- http://localhost:5173 (Frontend)
- http://localhost:3000 (alternativa)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📦 Dependencias Principales

- **FastAPI** 0.104 - Framework web
- **Uvicorn** 0.24 - ASGI server
- **Pydantic** 2.5 - Validación datos
- **SQLAlchemy** 2.0 - ORM SQL
- **Scikit-learn** 1.3 - Modelos ML
- **Joblib** 1.3 - Serializar modelos
- **Psycopg2** 2.9 - Driver PostgreSQL

## 🧪 Testing con curl

```bash
# Predicción
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "edad": 22,
    "promedio": 4.2,
    "horas_estudio": 20,
    "estrato": 3,
    "carrera": "Ingeniería de Sistemas",
    "acceso_internet": true,
    "semestre": 6
  }'

# Health check
curl http://localhost:8000/api/health

# Estadísticas
curl http://localhost:8000/api/statistics
```

## 🐛 Debugging

### Ver logs detallados
```python
# En main.py
logging.basicConfig(level=logging.DEBUG)
```

### Verificar conexión BD
```bash
psql -h localhost -U postgres -d saberpro_db
```

### Cargar modelo manualmente
```python
from app.services import PredictionService
PredictionService.load_model()
print(PredictionService.model)
```

## 🚀 Deployment

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "run.py"]
```

### Gunicorn + Uvicorn
```bash
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

**Desarrollado para Proyecto de Grado 2024**
