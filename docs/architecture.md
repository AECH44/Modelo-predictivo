# Arquitectura del Sistema

Documento técnico de la arquitectura actual (monorepo plano).
Para entender las decisiones de diseño, ver
[`ANALISIS_RESULTADOS.md`](./ANALISIS_RESULTADOS.md).

## Visión general

```
┌──────────────────────────────────────────────────────────────────────┐
│                            NAVEGADOR                                  │
│                       http://localhost:5173                          │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ fetch + JWT
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  FRONTEND — React 19 + Vite 8                        │
│                         `frontend/`                                   │
│  - React Router 7 (rutas por rol)                                    │
│  - Componentes: DataTable, Icon                                       │
│  - Cliente HTTP: fetch con Authorization: Bearer <jwt>               │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP/JSON
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                BACKEND — Express 4 + PostgreSQL 18                    │
│                          `backend/`                                   │
│                       http://localhost:4000                          │
│                                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  /auth/*    │  │ /admin/*    │  │ /student/*  │  │ /analysis/*│  │
│  │  login/JWT  │  │ users/audit │  │ profile     │  │ métricas   │  │
│  │  OAuth      │  │ stats       │  │ predictions │  │ predict    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  predictor.js — wrapper con fallback                          │    │
│  │  1. Llama FastAPI → modelo real (.pkl)                       │    │
│  │  2. Si FastAPI falla → heurística determinista               │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────┬─────────────────────────────────┬──────────────────────────┘
           │ SQL                             │ HTTP/JSON
           ▼                                 ▼
   ┌──────────────┐                 ┌────────────────────┐
   │ PostgreSQL   │                 │  ML SERVICE        │
   │  :5432       │                 │  FastAPI :8000     │
   │              │                 │  `ml-service/`     │
   │ - dataset_   │                 │                    │
   │   saber_pro_ │                 │  Carga el .pkl     │
   │   real (736) │                 │  al arrancar       │
   │ - usuarios   │                 │                    │
   │   (4 admins) │                 │  Endpoints:        │
   │ - student_   │                 │  GET  /api/health  │
   │   profiles   │                 │  POST /api/predict │
   │ - predict.   │                 │  GET  /api/...     │
   │ - audit_log  │                 │                    │
   └──────────────┘                 └────────┬───────────┘
                                              │ carga
                                              ▼
                                    ┌────────────────────┐
                                    │   ML TRAINING       │
                                    │   `ml-training/`    │
                                    │                    │
                                    │  train_from_real.py │
                                    │  analyze_results.py │
                                    │                    │
                                    │  trained_models/   │
                                    │   saberpro_model   │
                                    │     .pkl (682 KB)  │
                                    │  models/           │
                                    │   desercion_       │
                                    │   metrics.json     │
                                    │  analysis/         │
                                    │   6 PNG + reporte  │
                                    └────────────────────┘
```

## Flujo de una predicción

1. El frontend envía `PUT /student/profile` con los 13 features
2. `backend/src/routes.js` valida JWT, mapea el perfil y llama a
   `predictor.js → computePrediction(profile)`
3. `predictor.js` chequea (con TTL 30s) si `ml-service` está vivo vía
   `GET http://127.0.0.1:8000/api/health`
4. Si sí, llama `POST http://127.0.0.1:8000/api/predict` con las 13 features
5. `ml-service` carga el `.pkl` (Gradient Boosting v1), predice y responde
   con la clase (`Bajo/Medio/Alto`) + probabilidades
6. Express traduce la respuesta al contrato de la UI y guarda en
   `predictions` (PostgreSQL)
7. La UI muestra: clase predicha, barras de probabilidad, factores clave,
   áreas a mejorar, recomendaciones

## Capas y archivos clave

### Frontend (`frontend/src/`)
- `App.jsx` — Router y vistas por rol (~5.4k líneas, monolito intencional)
- `api.js` — Cliente HTTP con JWT y manejo de errores
- `components/DataTable.jsx` — Tabla de datos con búsqueda/orden/filtros
- `components/Icon.jsx` — Set de íconos SVG inline
- CSS: `App.css`, `index.css` (sin frameworks)

### Backend (`backend/src/`)
- `server.js` — Express app, CORS, estáticos de `/assets/analysis/*.png`
- `routes.js` — Todos los endpoints REST (~1100 líneas, 26 router definitions)
- `auth.js` — Login local (bcrypt + JWT)
- `db.js` — Pool de PostgreSQL (`pg`)
- `google-oauth.js` — OAuth Google (opcional)
- `users.js` — CRUD usuarios, sanitización
- `profiles.js` — Perfiles de estudiantes
- `predictor.js` — **Wrapper async con fallback** (FastAPI + heurística)
- `scripts/seed-admins.js` — Crea 4 cuentas admin (idempotente)
- `scripts/import-students.js` — Importa estudiantes desde CSV

### ETL (`backend/scripts/`)
- `ddl.sql` — DDL de `dataset_saber_pro_real` (35 columnas)
- `cargar_dataset.py` — Carga el CSV con UPSERT (idempotente)
- `consultas.sql` — 10 queries para entender el dataset

### ML Service (`ml-service/app/`)
- `main.py` — FastAPI app + lifespan que carga el `.pkl` al arrancar
- `routes/prediction_routes.py` — `/api/predict`, `/api/health`
- `services/prediction_service.py` — Carga `.pkl`, prepara DataFrame,
  predice, mapea `pipeline.classes_` (Alto/Bajo/Medio alfabético) a
  probabilidades por clase
- `models/student_model.py` — Pydantic con validación de las 13 features

### ML Training (`ml-training/`)
- `train_from_real.py` — Lee BD, entrena LR + GB, guarda el mejor `.pkl`
  + JSON de métricas
- `analyze_results.py` — Genera 6 PNGs + `reporte.md`

## Decisiones de diseño

| Decisión                          | Por qué                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| **Monorepo plano**                | Despliegue y navegación más simples; un solo `git clone`                |
| **Express ↔ FastAPI por HTTP**    | Aísla el stack ML; FastAPI puede reiniciarse sin tirar Express          |
| **Predictor con fallback**        | Si FastAPI cae, Express responde con heurística (degradación elegante)  |
| **Modelo real + heurística**      | Permite demos sin Python; el modelo real siempre tiene prioridad         |
| **JWT solo en Express**           | FastAPI es servicio interno (no expuesto a internet)                    |
| **OAuth Google opcional**         | Login institucional sin contraseña funciona; OAuth es mejora opcional   |
| **Sin frameworks CSS**            | Requisito de portabilidad y aprendizaje puro de CSS                     |
| **Dataset real anonimizado**      | 736 filas; no hay datos sintéticos en producción (decisión 2026-10-02)  |
| **Target proxy (Bajo/Medio/Alto)**| No hay Saber Pro real en el dataset; se deriva del promedio acumulado   |
| **Vite monolítico en `App.jsx`**  | Single-file routing intencional para que la lógica de roles sea visible |

## Variables de entorno

Ver:
- [`backend/.env.example`](../backend/.env.example)
- [`frontend/.env.example`](../frontend/.env.example)
- [`ml-service/.env.example`](../ml-service/.env.example)

## Cómo extender

- **Nuevo endpoint:** agregar en `backend/src/routes.js` (sección apropiada)
- **Nueva feature del modelo:** editar `ml-training/train_from_real.py`
  (lista `FEATURES`), re-entrenar, reiniciar `ml-service`
- **Nueva vista UI:** agregar caso en `App.jsx → renderSection()` y entrada
  en `ROLE_CONFIG.<rol>.nav`
- **Nuevo rol:** agregar a `ADMIN_ROLES` en `routes.js` y entrada en
  `ROLE_CONFIG` en `App.jsx`
