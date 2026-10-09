# Guia Completa de Integracion - Sistema Predictor Saber Pro

## Objetivo
Esta guia describe paso a paso como configurar y ejecutar el sistema completo de prediccion de resultados Saber Pro.

---

## Prerrequisitos

### Software Requerido

| Software | Version Minima | Enlace de Descarga |
|----------|---------------|-------------------|
| Node.js | 18.0.0 | https://nodejs.org/ |
| Python | 3.10+ | https://www.python.org/ |
| PostgreSQL | 13+ | https://www.postgresql.org/ |
| Git | 2.0+ | https://git-scm.com/ |

### Verificar Instalaciones

```bash
# Node.js y npm
node --version    # >= 18.0.0
npm --version     # >= 9.0.0

# Python
python --version  # >= 3.10
pip --version     # latest

# PostgreSQL
psql --version    # >= 13

# Git
git --version
```

---

## Paso 1: Configurar PostgreSQL

### 1.1 Instalar PostgreSQL

**Windows:**
1. Descargar desde https://www.postgresql.org/download/windows/
2. Ejecutar instalador
3. Durante instalacion, anotar:
   - Puerto: 5432 (default)
   - Usuario: postgres
   - Contrasena: [ingresar y recordar]

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### 1.2 Crear Base de Datos

```bash
# Conectar como usuario postgres
psql -U postgres

# Ejecutar dentro de psql:
CREATE USER saberpro_user WITH PASSWORD 'MiContrasenaSegura123';
CREATE DATABASE saberpro_db OWNER saberpro_user;
ALTER USER saberpro_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE saberpro_db TO saberpro_user;

# Salir de psql
\q
```

### 1.3 Ejecutar Scripts SQL de Inicializacion

```bash
# Navegar a la carpeta del proyecto
cd E:\Projects\proyecto1\prueba prediccion

# Ejecutar script de creacion de tablas
psql -U saberpro_user -d saberpro_db -f database/sql/init_database.sql

# Ejecutar script de datos de prueba
psql -U saberpro_user -d saberpro_db -f database/sql/seed_data.sql
```

### 1.4 Verificar Base de Datos

```sql
-- Conectar a la base de datos
psql -U saberpro_user -d saberpro_db

-- Ver tablas creadas
\dt

-- Ver estudiantes (deberia tener datos de prueba)
SELECT COUNT(*) FROM estudiantes;

-- Ver resultados_saber_pro
SELECT COUNT(*) FROM resultados_saber_pro;

-- Salir
\q
```

---

## Paso 2: Configurar Backend

### 2.1 Navegar al Directorio del Backend

```bash
cd E:\Projects\proyecto1\prueba prediccion\backend
```

### 2.2 Crear Entorno Virtual Python

```bash
# Crear entorno virtual
python -m venv venv

# Activar (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activar (Windows CMD)
venv\Scripts\activate.bat

# Activar (Linux/macOS)
source venv/bin/activate
```

### 2.3 Instalar Dependencias

```bash
pip install -r requirements.txt
```

Dependencias principales:
- fastapi==0.104.0
- uvicorn==0.24.0
- pydantic==2.5.0
- sqlalchemy==2.0.0
- psycopg2-binary==2.9.9
- python-dotenv==1.0.0
- joblib==1.3.0

### 2.4 Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
copy .env.example .env

# Editar el archivo .env con notepad
notepad .env
```

Contenido esperado del archivo `.env`:

```env
# Configuracion del servidor
DEBUG=True
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

# Configuracion de Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saberpro_db
DB_USER=saberpro_user
DB_PASSWORD=MiContrasenaSegura123

# Configuracion del Modelo ML
MODEL_PATH=ml/trained_models/saberpro_model.pkl

# Configuracion CORS
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

### 2.5 Iniciar Servidor Backend

```bash
python run.py
```

Output esperado:
```
+========================================+
|  Iniciando FastAPI - Predictor Saber Pro  |
+========================================+

INFO:     Will watch for changes in these directories: [...]
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2.6 Verificar Backend

Abrir en navegador: http://localhost:8000/docs

Deberia ver la documentacion Swagger de la API.

---

## Paso 3: Configurar Frontend

### 3.1 Abrir Nueva Terminal

Abrir una segunda terminal (mantener el backend ejecutandose).

### 3.2 Navegar al Directorio del Frontend

```bash
cd E:\Projects\proyecto1\prueba prediccion\frontend
```

### 3.3 Instalar Dependencias npm

```bash
npm install
```

Este comando descargara e instalara:
- react==18.2.0
- react-dom==18.2.0
- vite==5.0.0
- axios==1.6.0
- tailwindcss==3.3.0

### 3.4 Configurar Variables de Entorno (opcional)

```bash
# Si existe .env.example
copy .env.example .env
```

Contenido esperado:
```env
VITE_API_URL=http://localhost:8000
VITE_API_BASE_PATH=/api
```

### 3.5 Iniciar Servidor Frontend

```bash
npm run dev
```

Output esperado:
```
  VITE v5.x.x  ready in xxx ms

  Local:   http://localhost:5173/
```

---

## Paso 4: Probar el Sistema

### 4.1 Interfaz Web (Frontend)

1. Abrir navegador en: http://localhost:5173
2. Verificar que el formulario de prediccion carga
3. Llenar datos de prueba:

| Campo | Valor |
|-------|-------|
| Promedio Acumulado | 4.2 |
| Promedio Basicas | 4.0 |
| Promedio Ingenieria | 4.3 |
| Numero de Reprobadas | 2 |
| Porcentaje Creditos | 75.5 |
| Semestre | 6 |
| Estrato | 3 |
| Genero | M |

4. Hacer clic en "Generar Prediccion"
5. Verificar que se muestra resultado con categoria y confianza

### 4.2 Probar API con curl

En una terminal nueva:

```bash
# Health check
curl http://localhost:8000/api/health

# Prediccion
curl -X POST http://localhost:8000/api/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"promedio_acumulado\": 4.2, \"promedio_basicas\": 4.0, \"promedio_ingenieria\": 4.3, \"num_reprobadas\": 2, \"pct_creditos\": 75.5, \"semestre\": 6, \"estrato\": 3, \"genero\": \"M\"}"

# Estadisticas
curl http://localhost:8000/api/statistics
```

### 4.3 Verificar Base de Datos

```bash
psql -U saberpro_user -d saberpro_db

-- Ver ultimas predicciones
SELECT documento, resultado, probabilidad, created_at 
FROM resultados_saber_pro 
ORDER BY created_at DESC 
LIMIT 5;

-- Ver conteo por categoria
SELECT resultado, COUNT(*) as total 
FROM resultados_saber_pro 
GROUP BY resultado;

\q
```

---

## Paso 5: Entrenar Modelo ML (Opcional)

### 5.1 Navegar al Directorio ML

```bash
cd E:\Projects\proyecto1\prueba prediccion\ml
```

### 5.2 Crear Entorno Virtual

```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 5.3 Instalar Dependencias

```bash
pip install pandas numpy scikit-learn joblib matplotlib seaborn
```

### 5.4 Generar Dataset

```bash
python generate_dataset.py
```

### 5.5 Entrenar Modelo

```bash
python train_model.py
```

Output esperado:
```
Métricas del Modelo Entrenado:
- Accuracy: 0.92
- Precision: 0.91
- Recall: 0.89
- F1-Score: 0.90

Modelo guardado en: ml/trained_models/saberpro_model.pkl
```

---

## Estructura de Archivos Creados

```
proyecto/
|
+-- backend/
|   +-- .env                    # Configuracion (crear desde .env.example)
|   +-- requirements.txt        # Dependencias Python
|   +-- run.py                  # Script de inicio
|   +-- app/
|       +-- main.py            # Aplicacion FastAPI
|       +-- routes/            # Endpoints API
|       +-- services/          # Logica de negocio + ML
|       +-- models/            # Esquemas Pydantic
|       +-- database/          # Conexion PostgreSQL
|
+-- frontend/
|   +-- .env                   # Configuracion (opcional)
|   +-- package.json           # Dependencias Node
|   +-- src/
|       +-- components/        # Componentes React
|       +-- App.jsx            # Componente principal
|
+-- ml/
|   +-- train_model.py         # Entrenamiento
|   +-- trained_models/        # Modelo serializado
|
+-- database/
|   +-- sql/
|       +-- init_database.sql  # Crear tablas
|       +-- seed_data.sql      # Datos prueba
|
+-- docs/
    +-- INTEGRACION.md         # Esta guia
    +-- API_ENDPOINTS.md       # Documentacion API
    +-- MODELO_ML.md           # Documentacion ML
```

---

## Troubleshooting

### Error: "connection refused" en PostgreSQL

1. Verificar que PostgreSQL esta corriendo:
   - Windows: Services > postgresql-x64-xx
   - Linux: `sudo systemctl status postgresql`

2. Verificar puerto en uso:
   ```bash
   netstat -an | grep 5432
   ```

### Error: "Model not found"

El modelo ML no esta entrenado. Ejecutar:
```bash
cd ml
python train_model.py
```

### Error: "CORS policy blocked"

Verificar que `FRONTEND_URL` en backend/.env es:
```
FRONTEND_URL=http://localhost:5173
```

Y que `ALLOWED_ORIGINS` incluye ese valor.

### Error: "npm ERR! code ENOENT"

Limpiar cache y reinstalar:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Comandos Rapidos de Verificacion

```bash
# 1. Backend responde
curl http://localhost:8000/api/health

# 2. Frontend carga
curl http://localhost:5173

# 3. Base de datos conectada
psql -U saberpro_user -d saberpro_db -c "SELECT 1"

# 4. Modelo ML disponible
dir ml\trained_models\saberpro_model.pkl
```

---

**Documentacion de Integracion completada.**