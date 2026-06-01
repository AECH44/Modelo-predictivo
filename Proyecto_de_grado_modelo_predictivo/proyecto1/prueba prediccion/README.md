# Sistema Predictor Saber Pro - Full Stack con IA

Proyecto de Grado: Sistema web para predicción de resultados Pruebas Saber Pro usando Machine Learning, arquitectura Full Stack y análisis de inteligencia artificial.

---

## Descripcion General

Sistema completo que predice el desempeno de estudiantes en las pruebas Saber Pro basandose en:
- Datos academicos (promedio acumulado, promedio basicas, promedio ingenieria)
- Datos de progreso (creditos aprobados, materias reprobadas)
- Datos socioeconomicos (estrato, semestre)
- Informacion demografica (genero)

Utiliza **Regresion Logistica Multiple** para clasificacion en 3 categorias:
- **Bajo**: Desempeno debil esperado
- **Medio**: Desempeno intermedio
- **Alto**: Desempeno fuerte esperado

---

## Arquitectura del Proyecto

```
proyecto-saber-pro/
|
+-- frontend/                 # React + Vite (Puerto 5173)
|   +-- src/
|       +-- components/       # UI Components
|       +-- services/         # API Client
|       +-- App.jsx           # Root component
|   +-- package.json
|
+-- backend/                  # FastAPI (Puerto 8000)
|   +-- app/
|       +-- routes/           # REST Endpoints
|       +-- services/         # Business Logic + ML
|       +-- models/           # Pydantic Schemas
|       +-- database/         # PostgreSQL Connection
|       +-- main.py           # FastAPI App
|   +-- requirements.txt
|
+-- ml/                       # Machine Learning
|   +-- train_model.py        # Training script
|   +-- data_preprocessing.py # Data cleaning
|   +-- datasets/
|   |   +-- saberpro_data.csv # Training data
|   +-- trained_models/
|       +-- saberpro_model.pkl # Serialized model
|
+-- database/                 # PostgreSQL
|   +-- sql/
|       +-- init_database.sql # Create tables
|       +-- seed_data.sql     # Test data
|       +-- queries.sql       # Useful queries
|
+-- docs/                     # Documentation
|   +-- INTEGRACION.md        # Setup guide
|   +-- API_ENDPOINTS.md      # API docs
|   +-- MODELO_ML.md          # ML model documentation
|
+-- README.md
+-- CHECKLIST.md
```

---

## Requisitos del Sistema

| Requisito | Version | Proposito |
|-----------|---------|-----------|
| Node.js | >= 18.0.0 | Frontend (Vite bundler) |
| npm | >= 9.0.0 | Gestion de paquetes Node |
| Python | >= 3.10 | Backend + ML |
| pip | Latest | Gestion de paquetes Python |
| PostgreSQL | >= 13 | Base de datos |

---

## Instalacion Paso a Paso

### 1. Clonar el Proyecto

```bash
cd proyecto-saber-pro
```

### 2. Configurar Base de Datos PostgreSQL

```bash
# Acceder a PostgreSQL
psql -U postgres

# Crear base de datos y usuario
CREATE USER saberpro_user WITH PASSWORD 'tu_contrasena_fuerte';
CREATE DATABASE saberpro_db OWNER saberpro_user;
ALTER USER saberpro_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE saberpro_db TO saberpro_user;
\q

# Ejecutar scripts SQL
psql -U saberpro_user -d saberpro_db -f database/sql/init_database.sql
psql -U saberpro_user -d saberpro_db -f database/sql/seed_data.sql
```

### 3. Configurar Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar (Windows)
venv\Scripts\activate

# Activar (Linux/macOS)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con credenciales de base de datos
```

### 4. Configurar Frontend

```bash
cd frontend
npm install
```

### 5. Entrenar Modelo ML (Opcional)

```bash
cd ml
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias ML
pip install pandas numpy scikit-learn joblib

# Generar datos y entrenar
python generate_dataset.py
python train_model.py
```

---

## Como Ejecutar el Sistema

El sistema requiere 3 terminales simultaneas:

### Terminal 1: Base de Datos
PostgreSQL debe estar corriendo en segundo plano
```bash
# Verificar estado
sudo systemctl status postgresql  # Linux
brew services list | grep postgres   # macOS
```

### Terminal 2: Backend FastAPI
```bash
cd backend
venv\Scripts\activate  # Windows
# o
source venv/bin/activate  # Linux/macOS

python run.py
```

Output esperado:
```
+========================================+
|  Iniciando FastAPI - Predictor Saber Pro  |
+========================================+

URL: http://0.0.0.0:8000
Docs: http://0.0.0.0:8000/docs
```

### Terminal 3: Frontend React
```bash
cd frontend
npm run dev
```

Output esperado:
```
  VITE v5.x.x  ready in xxx ms

  Local:   http://localhost:5173/
  Network: use --host to expose
```

### Abrir en Navegador
- Frontend: http://localhost:5173
- Backend Docs: http://localhost:8000/docs

---

## Endpoints de la API

### POST /api/predict
Realiza prediccion de desempeno Saber Pro

**Request Body:**
```json
{
  "promedio_acumulado": 4.2,
  "promedio_basicas": 4.0,
  "promedio_ingenieria": 4.3,
  "num_reprobadas": 2,
  "pct_creditos": 75.5,
  "semestre": 6,
  "estrato": 3,
  "genero": "M"
}
```

**Response:**
```json
{
  "resultado": "Alto",
  "probabilidad": 0.87,
  "confidence_pct": 87.0,
  "recomendacion": "Excelente...",
  "timestamp": "2024-05-26T10:30:00",
  "model_version": "1.0.0"
}
```

### GET /api/health
Verifica estado del sistema

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "database_connected": true,
  "model_version": "1.0.0",
  "timestamp": "2024-05-26T10:30:00"
}
```

### GET /api/history/{documento}
Obtiene historial de predicciones de un estudiante

**Parámetros:**
- `documento`: Numero de documento del estudiante
- `limit`: Maximo de registros (default: 10)

### GET /api/statistics
Obtiene estadisticas generales del sistema

**Response:**
```json
{
  "total_predictions": 1500,
  "average_confidence": 82.5,
  "average_probability": 0.825,
  "category_distribution": {
    "Bajo": {"total": 300, "avg_confidence": 78.2},
    "Medio": {"total": 700, "avg_confidence": 85.1},
    "Alto": {"total": 500, "avg_confidence": 88.3}
  },
  "timestamp": "2024-05-26T10:30:00"
}
```

---

## Variables de Entorno

### Backend (.env)

```env
# Debug mode
DEBUG=True
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saberpro_db
DB_USER=saberpro_user
DB_PASSWORD=tu_contrasena_fuerte

# Modelo ML
MODEL_PATH=ml/trained_models/saberpro_model.pkl

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
VITE_API_BASE_PATH=/api
```

---

## Flujo de Datos

```
+---------------+     POST /api/predict
|   Usuario     |     (JSON con datos estudiante)
+---------------+
        |
        v
+---------------+     Validacion Pydantic
|   FastAPI      |     (confirma campos y rangos)
+---------------+
        |
        v
+---------------+     Feature Extraction
|  Prediction    |     (ordena datos para modelo)
|   Service     |
+---------------+
        |
        v
+---------------+     Regresion Logistica
|   Modelo ML    |     Multiple (.pkl cargado)
+---------------+
        |
        v
+---------------+     Resultado + Recomendacion
|   Respuesta    |     (JSON con prediccion)
+---------------+
        |
        v
+---------------+     INSERT INTO
|  PostgreSQL    |     resultados_saber_pro
+---------------+
```

---

## Solucion de Problemas Comunes

### PostgreSQL no conecta

```bash
# Verificar que PostgreSQL esta corriendo
sudo systemctl status postgresql  # Linux

# Verificar credenciales en backend/.env
type backend\.env  # Windows
cat backend/.env   # Linux/macOS

# Probar conexion manual
psql -U saberpro_user -d saberpro_db -c "SELECT 1"
```

### Modelo ML no carga

```bash
# Verificar que el archivo existe
dir ml\trained_models\saberpro_model.pkl  # Windows
ls -la ml/trained_models/saberpro_model.pkl  # Linux/macOS

# Si no existe, entrenar:
cd ml
python train_model.py
```

### Error de CORS

```bash
# Verificar FRONTEND_URL en backend/.env
# Debe ser: http://localhost:5173

# Verificar que el backend permite el origen
# En main.py, revisar: allow_origins
```

### npm install falla

```bash
# Limpiar cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Python venv no funciona

```bash
# Recrear entorno virtual
rm -rf venv
python -m venv venv

# Activar correctamente
# Windows: venv\Scripts\activate
# Linux: source venv/bin/activate
```

---

## Tecnologias Utilizadas

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| **Frontend** | React | 18.2 | UI interactiva |
| | Vite | 5.0 | Bundler rapido |
| | Axios | 1.6 | HTTP Client |
| **Backend** | FastAPI | 0.104 | Framework web |
| | Uvicorn | 0.24 | ASGI server |
| | Pydantic | 2.5 | Validacion datos |
| | SQLAlchemy | 2.0 | ORM PostgreSQL |
| **ML** | Scikit-learn | 1.3 | Algoritmos ML |
| | Joblib | 1.3 | Serializacion modelo |
| | Pandas | 2.1 | Procesamiento datos |
| **BD** | PostgreSQL | 13+ | Base de datos |

---

## Documentacion Relacionada

- [docs/INTEGRACION.md](docs/INTEGRACION.md) - Guia paso a paso de instalacion
- [docs/API_ENDPOINTS.md](docs/API_ENDPOINTS.md) - Documentacion completa de API
- [docs/MODELO_ML.md](docs/MODELO_ML.md) - Documentacion del modelo ML
- [CHECKLIST.md](CHECKLIST.md) - Checklist de verificacion

---

## Licencia

MIT License - Libre para uso educativo

---

**Sistema listo para usar!**