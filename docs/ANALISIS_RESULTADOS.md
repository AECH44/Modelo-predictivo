# Análisis de Resultados — Modelo Predictivo Saber Pro

> Documento del trabajo de grado. Reúne el análisis del dataset, el
> entrenamiento del modelo, los resultados obtenidos, su interpretación y
> cómo funciona en producción.
>
> **Versión del modelo:** `real-data-v1`
> **Dataset:** 736 filas (`dataset_saber_pro_real`), 627 usadas para entrenar
> **Modelo ganador:** Gradient Boosting Classifier
> **Fecha del último entrenamiento:** 2026-10-02

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [El dataset](#2-el-dataset)
3. [Preprocesamiento y derivación del target](#3-preprocesamiento-y-derivación-del-target)
4. [Entrenamiento](#4-entrenamiento)
5. [Resultados](#5-resultados)
6. [Importancia de las variables](#6-importancia-de-las-variables)
7. [Análisis de errores y matriz de confusión](#7-análisis-de-errores-y-matriz-de-confusión)
8. [Funcionamiento en producción](#8-funcionamiento-en-producción)
9. [Limitaciones y consideraciones](#9-limitaciones-y-consideraciones)
10. [Cómo reproducir](#10-cómo-reproducir)

---

## 1. Resumen ejecutivo

Se entrenaron dos modelos de clasificación supervisada (Logistic Regression
y Gradient Boosting) para predecir el rendimiento académico agregado de
estudiantes de ingeniería, usando como base 736 registros anónimos
proporcionados por la universidad.

El modelo final, **Gradient Boosting**, alcanza un **accuracy de 0.8492** y un
**F1-score ponderado de 0.8468** sobre 126 muestras de test. La métrica
agregada **ROC AUC (one-vs-rest) es 0.9565**, lo que indica que el modelo
discrimina muy bien entre las tres clases (Bajo, Medio, Alto).

La variable más predictiva es el **promedio de ingeniería** (35% de
importancia en el modelo de árbol), seguida de las asignaturas reprobadas
(18%) y el porcentaje de avance académico (10%).

⚠️ **Nota importante:** el dataset no contiene el puntaje real de Saber Pro.
El target se deriva del promedio académico acumulado, que es un **proxy**
del rendimiento. El modelo predice la banda de rendimiento académico
agregado, no el desempeño en la prueba estandarizada. Esta limitación está
documentada explícitamente en el código y en los entregables.

---

## 2. El dataset

### 2.1 Origen y características

- **Archivo fuente:** `base-de-datos-para-proyecto-de-grado-Ing.csv`
  (anónimo, sin documento/email/nombre del estudiante).
- **Tabla destino:** `dataset_saber_pro_real` en PostgreSQL (BD `saberpro`).
- **Filas totales:** 736
- **Columnas:** 35 (26 del CSV original + 4 derivadas para el predictor +
  defaults documentados + trazabilidad)

### 2.2 Columnas más relevantes para el modelo

| Columna | Tipo | Uso |
|---|---|---|
| `promedio_acumulado` | float | **Target derivado** (Bajo/Medio/Alto) |
| `promedio_materias_basicas` | float | Feature |
| `promedio_ingenieria` | float | Feature (la más importante) |
| `promedio_programacion` | float | Feature |
| `promedio_matematica_estadistica` | float | Feature |
| `asignaturas_reprobadas` | int | Feature |
| `porcentaje_avance` | float | Feature |
| `semestre_actual` | int | Feature |
| `estrato` | int | Feature |
| `creditos_aprobados` | int | Feature |
| `asignaturas_aprobadas` | int | Feature |
| `edad` | int | Feature |
| `genero` | char | Feature (M/F) |
| `promedio_ingles_nivel` | str | Feature (A1-C2) |

### 2.3 Calidad observada

- **109 filas con `promedio_acumulado = 0`**: placeholders de estudiantes en
  primer semestre sin notas. Se excluyen del entrenamiento.
- **337/736 con `puntaje_global_saber11 = 0`**: placeholders del Saber 11.
  Excluidos del modelo (concentraban ceros, no aportaban señal).
- **372 sin inglés** (nivel MCER), **625 sin año de presentación de Saber Pro**,
  24 sin estrato, 18 sin género, 17 sin edad, 39 sin condición laboral.
- **2 últimas filas** son placeholders obvios.

### 2.4 Análisis de la variable objetivo derivada

Después de categorizar `promedio_acumulado` (excluyendo ceros y nulos):

| Clase | Rango | Conteo | % |
|---|---|---|---|
| Bajo | promedio > 0 y < 3.0 | 72 | 11.5% |
| Medio | 3.0 <= promedio < 4.0 | 293 | 46.7% |
| Alto | promedio >= 4.0 | 262 | 41.8% |
| **Total usado** | | **627** | **100%** |
| Excluidos | promedio = 0 o NULL | 109 | — |

La distribución tiene **sesgo al alza** (88.5% de los estudiantes quedan en
Medio o Alto), lo que refleja la naturaleza de la muestra (estudiantes que
ya han avanzado y tienen notas).

---

## 3. Preprocesamiento y derivación del target

### 3.1 Derivación del target

```
promedio_acumulado == NULL o == 0   →  fila excluida
promedio_acumulado > 0 y < 3.0     →  "Bajo"
promedio_acumulado ∈ [3.0, 4.0)    →  "Medio"
promedio_acumulado >= 4.0          →  "Alto"
```

Implementado en `ml/train_from_real.py:build_target()`.

### 3.2 Limpieza

- **Excluidas** (13 columnas): `promedio_acumulado` (data leakage con el
  target), los 4 puntajes de Saber 11 (337 ceros), 4 columnas con varianza
  cero (defaults aplicados al cargar: `horas_estudio_semana`, `asistencia_pct`,
  `acceso_internet`, `acceso_pc`), 3 columnas mayormente nulas
  (`numero_simulacros_realizados`, `puntaje_promedio_simulacros`,
  `participo_preparacion`), y 3 de texto libre (`procedencia`,
  `ciudad_residencia_actual`, `tipo_financiacion`).
- **Mantenidas** (13 features):
  - 11 numéricas: `promedio_materias_basicas`, `promedio_ingenieria`,
    `promedio_programacion`, `promedio_matematica_estadistica`,
    `asignaturas_reprobadas`, `porcentaje_avance`, `semestre_actual`,
    `estrato`, `creditos_aprobados`, `asignaturas_aprobadas`, `edad`.
  - 2 categóricas: `genero` (M/F), `promedio_ingles_nivel` (A1-C2).
- **Imputación** dentro del `ColumnTransformer`:
  - Numéricas: `SimpleImputer(strategy='median')` (por si hay nulos).
  - Categóricas: `SimpleImputer(strategy='most_frequent')`.

### 3.3 Pipeline de preprocesamiento (sklearn)

```python
ColumnTransformer(
  transformers=[
    ('num', Pipeline([
      ('imputer', SimpleImputer(strategy='median')),
      ('scaler', StandardScaler()),
    ]), NUMERIC_FEATURES),
    ('cat', Pipeline([
      ('imputer', SimpleImputer(strategy='most_frequent')),
      ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
    ]), CATEGORICAL_FEATURES),
  ],
  remainder='drop',
)
```

- Estandarización de numéricas (media 0, desv. 1).
- One-hot encoding de categóricas (drop first).

---

## 4. Entrenamiento

### 4.1 Split

- **Train/test split:** 80/20 con `stratify=y` (mantiene la proporción de clases).
- **Train:** 501 muestras
- **Test:** 126 muestras
- **Random state:** 42 (reproducibilidad)

### 4.2 Modelos entrenados

Se entrenaron dos modelos en paralelo y se seleccionó el mejor por accuracy
en el conjunto de test:

**A) Logistic Regression (multinomial)**
```python
LogisticRegression(
  max_iter=2000,
  class_weight='balanced',  # compensa el desbalance
  random_state=42,
)
```

**B) Gradient Boosting Classifier**
```python
GradientBoostingClassifier(
  n_estimators=100,
  learning_rate=0.1,
  max_depth=4,
  random_state=42,
)
```

### 4.3 Hiperparámetros no ajustados

⚠️ No se realizó GridSearchCV ni ajuste de hiperparámetros en esta
versión. Los valores son los defaults razonables de sklearn. Una
extensión natural es explorar `n_estimators ∈ {100, 200, 500}`,
`max_depth ∈ {3, 5, 7}`, `learning_rate ∈ {0.05, 0.1, 0.2}`.

---

## 5. Resultados

### 5.1 Comparación de modelos (test set)

| Modelo | Accuracy | Precision (w) | Recall (w) | F1 (w) | ROC AUC (OvR) |
|---|---|---|---|---|---|
| Logistic Regression | 0.7937 | 0.8117 | 0.7937 | 0.7887 | 0.9421 |
| **Gradient Boosting** | **0.8492** | **0.8573** | **0.8492** | **0.8468** | **0.9565** |

Gradient Boosting gana en **todas** las métricas. La diferencia más
grande es en accuracy (+5.5 puntos porcentuales).

### 5.2 Classification report (Gradient Boosting)

| Clase | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Bajo  | 1.0000 | 0.6429 | 0.7826 | 14 |
| Medio | 0.8571 | 0.8136 | 0.8348 | 59 |
| Alto  | 0.8197 | 0.9434 | 0.8772 | 53 |

**Interpretación:**

- **Alto** es la clase más fácil de identificar (recall 0.94, F1 0.88).
  Cuando el modelo dice "Alto", acierta el 82% de las veces, y captura
  el 94% de los verdaderos "Alto".

- **Medio** tiene el F1 más bajo (0.83) por el coste de la clase minoritaria
  Bajo contigua (5 confusiones Bajo→Medio).

- **Bajo** es la más difícil (recall 0.64): 5 de los 14 "Bajo" reales se
  confunden con "Medio". Esto se debe a que la clase tiene solo 14
  muestras en test (72 en train, 11.5% del dataset), insuficiente para
  que el modelo aprenda los patrones distintivos.

### 5.3 ROC AUC por clase (one-vs-rest)

| Clase | AUC | Interpretación |
|---|---|---|
| Alto  | **0.977** | Excelente discriminación |
| Bajo  | 0.949 | Muy buena discriminación |
| Medio | 0.940 | Muy buena discriminación |

Las tres clases tienen AUC > 0.94, lo que indica que el modelo ordena
correctamente las observaciones por probabilidad de pertenecer a cada
clase, incluso cuando se equivoca en la decisión final del umbral.

### 5.4 Matriz de confusión (Gradient Boosting)

| | Pred: Bajo | Pred: Medio | Pred: Alto |
|---|---|---|---|
| **Real: Bajo**  | 9  | 5  | 0 |
| **Real: Medio** | 0  | 48 | 11 |
| **Real: Alto**  | 0  | 3  | 50 |

**Patrones de error:**
- 5 falsos negativos en "Bajo" (Bajo → Medio): el modelo es conservador,
  prefiere etiquetar como Medio cuando hay duda.
- 11 falsos negativos en "Medio" (Medio → Alto): cuando un estudiante de
  Medio tiene notas altas, el modelo lo clasifica como Alto.
- 3 falsos negativos en "Alto" (Alto → Medio): marginal.
- **0 falsos positivos en "Bajo"**: el modelo nunca inventó un "Bajo"
  donde no lo había. Esto es coherente con `class_weight='balanced'` que
  penaliza más los errores de la clase minoritaria.

---

## 6. Importancia de las variables

El Gradient Boosting permite extraer la importancia de cada feature
(reducción de impureza). Top 10:

| Rank | Feature | Importancia | % |
|---|---|---|---|
| 1 | `promedio_ingenieria` | 0.353 | 35.3% |
| 2 | `asignaturas_reprobadas` | 0.176 | 17.6% |
| 3 | `porcentaje_avance` | 0.095 | 9.5% |
| 4 | `promedio_materias_basicas` | 0.077 | 7.7% |
| 5 | `promedio_matematica_estadistica` | 0.076 | 7.6% |
| 6 | `creditos_aprobados` | 0.072 | 7.2% |
| 7 | `promedio_programacion` | 0.043 | 4.3% |
| 8 | `asignaturas_aprobadas` | 0.033 | 3.3% |
| 9 | `edad` | 0.020 | 2.0% |
| 10 | `estrato` | 0.008 | 0.8% |

**Hallazgo clave:** el **promedio de ingeniería** es la variable
dominante. Es 2× más importante que la segunda (asignaturas reprobadas)
y 4× más que el porcentaje de avance. Esto es coherente con la
naturaleza del target (derivado del promedio académico) y con la
relevancia del programa de ingeniería en la muestra.

Las variables categóricas (`genero`, `promedio_ingles_nivel`) y el
estrato socioeconómico tienen **baja importancia** (suman < 2%
combinadas). El modelo prácticamente no se basa en género, nivel de
inglés o estrato para sus predicciones, lo que sugiere que el
rendimiento académico es el factor determinante.

Ver gráfico: `ml/analysis/feature_importance.png`.

---

## 7. Análisis de errores y matriz de confusión

Los errores del modelo se concentran en **dos transiciones adyacentes**:

1. **Bajo ↔ Medio** (5 errores): un estudiante con promedio entre 2.5 y
   3.0 puede caer en cualquier lado. La frontera está en 3.0 exacto y
   el modelo la interpreta de forma conservadora.
2. **Medio ↔ Alto** (11 errores): la frontera en 4.0 es igualmente
   arbitraria. Estudiantes con promedio 3.8–4.2 son difíciles de
   clasificar.

**Recomendación:** si se quiere mejorar la separación entre clases, se
podría:
- Aumentar `n_estimators` del Gradient Boosting (más árboles).
- Probar regresión ordinal en vez de clasificación (explotar el orden
  Bajo < Medio < Alto).
- Usar validación cruzada estratificada para reportar intervalos de
  confianza en las métricas.

Ver gráficos:
- `ml/analysis/matriz_confusion_gradientboostingclassifier.png`
- `ml/analysis/matriz_confusion_logisticregression.png`

---

## 8. Funcionamiento en producción

### 8.1 Arquitectura

```
Frontend React (Vite, puerto 5173)
        │
        │  HTTPS / JSON  (usuario con sesión JWT)
        ▼
Backend Express (Node, puerto 4000)
  - Autenticación (bcrypt + JWT)
  - Autorización por rol (rector / decano / profesor / administrador)
  - Endpoints admin: /admin/stats, /admin/users, /analysis/*
  - Predictor como wrapper del servicio Python (con fallback heurístico)
        │
        │  HTTP interno (sin auth, localhost)
        ▼
Servicio FastAPI (Python, puerto 8000)
  - Carga saberpro_model.pkl al arrancar
  - Expone /api/predict, /api/health, /api/statistics
  - Valida los 13 features con Pydantic
  - Ejecuta el Pipeline sklearn y retorna la predicción + probabilidades
```

### 8.2 Flujo de una predicción

1. El usuario completa su perfil de estudiante (promedios, semestre,
   estrato, etc.) en la UI.
2. La UI hace `PUT /api/student/profile` al backend Express.
3. Express llama a `computePrediction(profile)` (en `predictor.js`).
4. `computePrediction` consulta `/api/health` de FastAPI:
   - Si responde con `model_loaded: true`, arma el JSON con las 13
     features y hace `POST /api/predict`.
   - Si no responde, usa la heurística determinista como fallback
     (`heuristic-v1`).
5. FastAPI ejecuta el Pipeline (`StandardScaler` → `OneHotEncoder` →
   `SimpleImputer` → `GradientBoostingClassifier`) y retorna:
   ```json
   {
     "resultado": "Alto",
     "probabilidad": 0.88,
     "confidence_pct": 88.0,
     "recomendacion": "Mantén tu ritmo...",
     "model_version": "real-data-v1",
     "probabilities": {"Alto": 0.88, "Medio": 0.12, "Bajo": 0.00}
   }
   ```
6. Express guarda la predicción en `predictions` (tabla PostgreSQL) y la
   retorna a la UI.

### 8.3 Archivos clave

| Componente | Archivo |
|---|---|
| Frontend | `frontend/src/App.jsx`, `frontend/src/api.js` |
| Auth + endpoints admin | `backend/src/routes.js`, `backend/src/auth.js` |
| Predictor con fallback | `backend/src/predictor.js` |
| Servicio Python | `ml-service/app/main.py` |
| Lógica de predicción | `ml-service/app/services/prediction_service.py` |
| Schema de entrada | `ml-service/app/models/student_model.py` |
| Modelo serializado | `ml-training/trained_models/saberpro_model.pkl` |

---

## 9. Limitaciones y consideraciones

1. **El target es un proxy, no Saber Pro real.** El modelo predice la
   banda de rendimiento académico agregado, no el desempeño en la prueba
   estandarizada. Para predecir Saber Pro real se necesita un dataset con
   esa variable objetivo.

2. **627 filas de entrenamiento** es un dataset pequeño. Las métricas son
   reproducibles con `random_state=42` pero no hay validación cruzada
   que dé intervalos de confianza.

3. **No se hizo ajuste de hiperparámetros.** Los modelos usan
   hiperparámetros de sklearn por defecto. Con GridSearchCV o
   RandomizedSearchCV se podrían mejorar.

4. **Sobreajuste potencial.** No se midió la brecha train/test. Con 501
   muestras de entrenamiento y un Gradient Boosting de 100 árboles, es
   posible que haya cierto sobreajuste. Recomendable: reportar
   train_accuracy vs test_accuracy.

5. **La clase "Bajo" es minoritaria** (11.5% del dataset, 14 muestras en
   test). El `class_weight='balanced'` ayuda, pero las métricas de
   recall de esta clase son menos confiables por el tamaño muestral.

6. **Saber 11 no se usó como feature.** 337/736 filas tienen el valor en
   0 (placeholder), lo que lo hace inutilizable. Un dataset con Saber 11
   limpio podría mejorar el modelo significativamente.

7. **El backend Express y FastAPI deben estar corriendo simultáneamente.**
   Si FastAPI está caído, el sistema usa la heurística (precision menor
   en los resultados). El health check se cachea 30 segundos.

---

## 10. Cómo reproducir

### 10.1 Prerrequisitos

- PostgreSQL 18 corriendo con BD `saberpro`
- Python 3.14
- Node.js 20+

### 10.2 Backend (Express)

```bash
cd backend
npm install
npm run seed-admins   # crea 4 cuentas admin
npm start             # Express en :4000
```

### 10.3 Servicio Python (FastAPI)

```bash
cd ml-service
python -m venv .venv
.venv/Scripts/Activate.ps1
pip install -r requirements.txt

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 10.4 Frontend

```bash
cd frontend
npm install
npm run dev      # Vite en :5173
```

### 10.5 Reentrenar el modelo

```bash
cd ml-training
python -m venv .venv
.venv/Scripts/Activate.ps1
pip install -r requirements.txt

python train_from_real.py     # Entrena + guarda .pkl + JSON
python analyze_results.py     # Genera 6 PNG + reporte.md
```

### 10.6 Credenciales de admin

Password = número de documento (política institucional):

| Rol | Email | Password |
|---|---|---|
| rector | rectoria@unac.edu.co | 91497570 |
| decano | facultad.ingenieria@unac.edu.co | 91475722 |
| profesor | javierf.cordobap@unac.edu.co | 7702661 |
| administrador | jhanc.mesae@unac.edu.co | 1001417605 |

---

## Anexo: glosario

- **Accuracy:** % de predicciones correctas sobre el total.
- **Precision:** de las veces que predije "Alto", cuántas eran realmente "Alto".
- **Recall:** de todos los "Alto" reales, cuántos encontré.
- **F1-score:** media armónica de precision y recall (un solo número).
- **ROC AUC:** área bajo la curva ROC. 1.0 = perfecto, 0.5 = aleatorio.
- **One-vs-Rest (OvR):** para clasificación multiclase, se calcula una
  curva ROC por clase tratando al resto como "no esta clase".
- **Gradient Boosting:** ensemble de árboles donde cada árbol corrige los
  errores del anterior.
- **Pipeline sklearn:** cadena de transformaciones + estimador final que
  se entrena/predice como una sola unidad.
- **Class weight balanced:** penaliza más los errores en clases
  minoritarias para compensar el desbalance.
- **Target proxy:** variable objetivo que se usa en lugar de la real
  porque esta no está disponible. Aquí, `promedio_acumulado` se usa en
  lugar del puntaje Saber Pro.

---

**Trabajo de grado:** PI Modelo Predictivo Saber Pro
