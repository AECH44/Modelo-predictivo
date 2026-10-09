# Modelo Predictivo Saber Pro

Sistema web para predecir el desempeño de estudiantes en las pruebas Saber Pro,
basado en datos académicos y socioeconómicos. Proyecto de grado de la
**Universidad Nacional Abierta y a Distancia (UNAC)**.

## 🎯 Descripción

El sistema entrena un modelo de Machine Learning (Gradient Boosting Classifier)
con datos reales anonimizados de la universidad y expone una API REST + panel
administrativo para:

- **Admins** (rector, decano, profesor, administrador): visualizar métricas del
  modelo, probar predicciones con el `.pkl` real, y gestionar usuarios.
- **Estudiantes** (futuro): completar perfil y ver predicción de su rendimiento.

> ⚠️ **Limitación importante:** el target del modelo es un *proxy* del promedio
> acumulado (Bajo/Medio/Alto), no el puntaje Saber Pro real. Documentado en
> [`docs/ANALISIS_RESULTADOS.md`](docs/ANALISIS_RESULTADOS.md).

## 🏗️ Arquitectura

Monorepo con **3 servicios** que corren en paralelo:

```
┌──────────────┐      HTTP/JSON       ┌──────────────┐
│   Frontend   │ ───────────────────▶ │   Backend    │
│  React+Vite  │                      │ Express+PG   │ :4000
│   :5173      │                      └──────┬───────┘
└──────────────┘                             │ HTTP/JSON
                                             ▼
                                      ┌──────────────┐
                                      │  ML Service  │
                                      │   FastAPI    │ :8000
                                      │  (carga .pkl)│
                                      └──────────────┘
                                             ▲
                                             │ entrena
                                      ┌──────────────┐
                                      │ML Training   │
                                      │  (Python)    │
                                      │ scikit-learn │
                                      └──────────────┘
```

| Servicio       | Puerto | Stack                     | Carpeta          |
| -------------- | ------ | ------------------------- | ---------------- |
| Frontend       | 5173   | React 19 + Vite 8         | `frontend/`      |
| Backend        | 4000   | Node 18 + Express 4 + PG  | `backend/`       |
| ML Service     | 8000   | FastAPI + scikit-learn    | `ml-service/`    |
| ML Training    | —      | Python + scikit-learn     | `ml-training/`   |
| Base de datos  | 5432   | PostgreSQL 18             | `localhost`      |

## 📁 Estructura del proyecto

```
Modelo-predictivo-Saber-Pro/
├── README.md                              ← este archivo
├── .gitignore
├── .env.example                           ← plantilla de variables
│
├── data/                                  ← dataset
│   └── base-de-datos-para-proyecto-de-grado-Ing.csv
│
├── backup/                                ← snapshots de BD
│   └── tmp_backup_pre_limpieza.sql
│
├── docs/                                  ← documentación
│   ├── ANALISIS_RESULTADOS.md             ← documento principal del trabajo de grado
│   ├── api-endpoints.md
│   ├── integracion.md
│   ├── modelo-ml.md
│   └── buenas-practicas.md
│
├── frontend/                              ← React + Vite
│   ├── src/                               ← componentes, páginas
│   ├── public/                            ← assets estáticos
│   ├── package.json
│   └── vite.config.js
│
├── backend/                               ← Express + PostgreSQL
│   ├── src/                               ← rutas, middleware, auth
│   │   └── scripts/                       ← seed-admins, import-students
│   ├── scripts/                           ← ETL CSV → BD
│   ├── package.json
│   └── .env.example
│
├── ml-service/                            ← FastAPI (predicción)
│   ├── app/
│   │   ├── models/                        ← Pydantic
│   │   ├── routes/                        ← /api/predict, /api/health
│   │   └── services/                      ← carga .pkl y predice
│   ├── requirements.txt
│   └── run.py
│
└── ml-training/                           ← Entrenamiento + análisis
    ├── train_from_real.py                 ← entrena con datos reales
    ├── analyze_results.py                 ← genera gráficos y reporte
    ├── analysis/                          ← PNGs + reporte.md
    ├── models/                            ← desercion_metrics.json
    ├── trained_models/                    ← saberpro_model.pkl
    └── requirements.txt
```

## 🚀 Cómo correr el proyecto

### Prerrequisitos

- **Node.js 18+** y npm
- **Python 3.14** con venv
- **PostgreSQL 18** corriendo en `localhost:5432` con BD `saberpro` creada
- **psql** en PATH (o usar `C:\Program Files\PostgreSQL\18\bin\psql.exe`)

### 1. Configurar la base de datos

```bash
# 1.1 Crear BD (si no existe)
psql -U postgres -c "CREATE DATABASE saberpro;"

# 1.2 Crear la tabla dataset_saber_pro_real
psql -U postgres -d saberpro -f backend/scripts/ddl.sql

# 1.3 Cargar el CSV (idempotente, UPSERT)
python backend/scripts/cargar_dataset.py
# (lee credenciales de backend/.env)
```

### 2. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales de PostgreSQL

# ML Service (opcional, tiene defaults)
cp ml-service/.env.example ml-service/.env
```

### 3. Instalar dependencias

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# ML Service
cd ml-service
python -m venv .venv
source .venv/bin/activate   # Git Bash / Linux
# .venv\Scripts\activate    # PowerShell / Windows
pip install -r requirements.txt
deactivate
cd ..
```

### 4. Re-poblar admins (idempotente)

```bash
cd backend && npm run seed-admins && cd ..
```

Crea 4 cuentas admin con política `password = número de documento`:

| Rol           | Email                              | Password       |
| ------------- | ---------------------------------- | -------------- |
| rector        | rectoria@unac.edu.co               | 91497570       |
| decano        | facultad.ingenieria@unac.edu.co    | 91475722       |
| profesor      | javierf.cordobap@unac.edu.co       | 7702661        |
| administrador | jhanc.mesae@unac.edu.co            | 1001417605     |

### 5. Arrancar los 3 servicios (en terminales separadas)

```bash
# Terminal 1 — Express (puerto 4000)
cd backend && npm start

# Terminal 2 — FastAPI (puerto 8000)
cd ml-service
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# Linux: .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 3 — Frontend (puerto 5173)
cd frontend && npm run dev
```

Abrir <http://localhost:5173> en el navegador.

## 🤖 Re-entrenar el modelo

```bash
cd ml-training
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Entrena con datos reales de PostgreSQL → genera saberpro_model.pkl
python train_from_real.py

# Genera análisis (6 PNGs + reporte.md)
python analyze_results.py
deactivate
```

Después de re-entrenar, **reiniciar `ml-service`** para que recargue el `.pkl`.

## 📚 Documentación

- [`docs/ANALISIS_RESULTADOS.md`](docs/ANALISIS_RESULTADOS.md) — Documento
  principal del trabajo de grado (10 secciones).
- [`docs/modelo-ml.md`](docs/modelo-ml.md) — Detalles técnicos del modelo.
- [`docs/api-endpoints.md`](docs/api-endpoints.md) — Referencia de endpoints.
- [`docs/integracion.md`](docs/integracion.md) — Cómo Express se integra con FastAPI.
- [`docs/buenas-practicas.md`](docs/buenas-practicas.md) — Convenciones del proyecto.

## 🔐 Stack

- **Frontend:** React 19, Vite 8, react-router-dom 7. CSS puro (sin Tailwind/Bootstrap).
- **Backend:** Node.js, Express 4, `pg`, bcryptjs, jsonwebtoken, googleapis (OAuth).
- **ML Service:** FastAPI 0.142, uvicorn, scikit-learn 1.9, pandas, numpy, joblib.
- **BD:** PostgreSQL 18.

## 📝 Licencia

Trabajo de grado — uso académico, UNAC.
