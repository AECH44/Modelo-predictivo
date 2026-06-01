# ESTRUCTURA PROFESIONAL DEL PROYECTO - PREDICTOR SABER PRO

## 📁 Árbol de Carpetas

```
proyecto-saber-pro/
│
├── frontend/                          # 🎨 APLICACIÓN REACT CON VITE
│   ├── src/
│   │   ├── components/                # Componentes reutilizables
│   │   │   ├── PredictionForm.jsx     # Formulario de entrada
│   │   │   ├── ResultsDisplay.jsx     # Mostrador de resultados
│   │   │   ├── LoadingSpinner.jsx     # Indicador de carga
│   │   │   └── ErrorAlert.jsx         # Manejo de errores
│   │   ├── pages/                     # Páginas principales
│   │   │   └── Home.jsx               # Página principal
│   │   ├── services/                  # Servicios API
│   │   │   └── apiService.js          # Cliente HTTP para backend
│   │   ├── App.jsx                    # Componente raíz
│   │   └── main.jsx                   # Punto de entrada
│   ├── public/                        # Archivos estáticos
│   ├── vite.config.js                 # Configuración Vite
│   ├── package.json                   # Dependencias Node
│   └── .env.example                   # Variables de entorno
│
├── backend/                           # 🔌 API REST CON FASTAPI
│   ├── app/
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── prediction_routes.py   # Endpoints /predict, /history
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── prediction_service.py  # Lógica predicción + BD
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── student_model.py       # Schema Pydantic
│   │   │   └── prediction_response.py # Respuesta de API
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── connection.py          # Conexión PostgreSQL
│   │   │   └── queries.py             # Queries SQL
│   │   └── main.py                    # Inicializador FastAPI
│   ├── requirements.txt               # Dependencias Python
│   ├── .env.example                   # Variables de entorno
│   └── run.py                         # Script para iniciar
│
├── ml/                                # 🤖 MODELOS DE MACHINE LEARNING
│   ├── train_model.py                 # Script entrenamiento
│   ├── data_preprocessing.py          # Limpieza datos
│   ├── model_evaluation.py            # Evaluación modelos
│   ├── datasets/
│   │   └── saberpro_data.csv         # Dataset entrenamiento
│   └── trained_models/
│       └── saberpro_model.pkl         # Modelo entrenado (joblib)
│
├── database/                          # 🗄️ POSTGRESQL
│   └── sql/
│       ├── init_database.sql          # Crear tablas
│       ├── seed_data.sql              # Datos iniciales
│       └── queries.sql                # Consultas útiles
│
├── docs/                              # 📚 DOCUMENTACIÓN
│   ├── INTEGRACION.md                 # Guía paso a paso
│   ├── API_ENDPOINTS.md               # Documentación endpoints
│   └── ML_EXPLICACION.md              # Explicación técnica ML
│
└── .gitignore                         # Archivos ignorados Git

```

---

## 🎯 RESPONSABILIDADES DE CADA CARPETA

### **frontend/** - Interfaz de Usuario
- **`components/`**: Componentes reutilizables (Formulario, Resultados, Loading, Error)
- **`pages/`**: Vistas principales de la aplicación
- **`services/`**: Cliente HTTP para comunicarse con FastAPI
- **`package.json`**: Gestiona dependencias (React, Vite, Axios, etc)
- **Tecnología**: React 18 + Vite + TailwindCSS
- **Puerto**: http://localhost:5173

### **backend/** - Servidor API
- **`routes/`**: Endpoints REST (POST /predict, GET /history)
- **`services/`**: Lógica de negocio + carga de modelo ML
- **`models/`**: Schemas Pydantic para validación
- **`database/`**: Conexión PostgreSQL y queries
- **Tecnología**: FastAPI + Pydantic
- **Puerto**: http://localhost:8000

### **ml/** - Machine Learning
- **`train_model.py`**: Entrena LogisticRegression y GradientBoosting
- **`data_preprocessing.py`**: Limpieza y encoding de datos
- **`datasets/`**: CSV con datos históricos
- **`trained_models/`**: Archivo .pkl con modelo serializado
- **Tecnología**: Scikit-learn + Pandas + Numpy

### **database/** - Persistencia de Datos
- **SQL scripts**: Crear tablas, seed data, consultas
- **Tablas principales**: 
  - `students`: Información del estudiante
  - `predictions`: Histórico de predicciones
- **Tecnología**: PostgreSQL 13+

---

## 🔄 FLUJO DE DATOS

```
[Frontend React]
       ↓ POST /predict
[FastAPI Backend]
       ↓ Carga modelo .pkl
[ML (Scikit-learn)]
       ↓ Ejecuta predicción
[PostgreSQL]
       ↓ Guarda resultado
[Frontend React]
       ↓ Muestra resultado
[Usuario]
```

---

## ⚙️ TECNOLOGÍAS STACK

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + Vite | 18.x + 5.x |
| Backend | FastAPI | 0.100+ |
| ML | Scikit-learn | 1.3+ |
| BD | PostgreSQL | 13+ |
| Validación | Pydantic | 2.x |

---

Continúa con PARTE 2 para generar el código del Frontend React.
