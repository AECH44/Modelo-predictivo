# Checklist de Verificacion - Sistema Predictor Saber Pro

Documento de verificacion para asegurar que el sistema esta correctamente configurado y funcionando.

---

## Instrucciones de Uso

Marque cada item como completado una vez que verifique su funcionamiento correcto.

---

## Fase 1: Base de Datos

- [ ] PostgreSQL instalado en el sistema
- [ ] Servicio de PostgreSQL esta corriendo
- [ ] Base de datos `saberpro_db` creada
- [ ] Usuario `saberpro_user` creado con contrasena
- [ ] Privilegios de usuario asignados correctamente

### Verificar Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Ejecutar en psql:
SELECT version();

# Crear base de datos
CREATE DATABASE saberpro_db;

# Salir
\q

# Verificar conexion
psql -U saberpro_user -d saberpro_db -c "SELECT 1;"
```

### Verificar Tablas

```bash
psql -U saberpro_user -d saberpro_db

# Ver tablas existentes
\dt

# Verificar estructura
\d estudiantes
\d asignaturas
\d notas
\d resultados_saber_pro

# Verificar datos de prueba
SELECT COUNT(*) FROM estudiantes;
SELECT COUNT(*) FROM asignaturas;
```

### Ejecutar Scripts SQL

```bash
cd E:\Projects\proyecto1\prueba prediccion

# Crear tablas
psql -U saberpro_user -d saberpro_db -f database/sql/init_database.sql

# Insertar datos de prueba
psql -U saberpro_user -d saberpro_db -f database/sql/seed_data.sql

# Verificar insercion
psql -U saberpro_user -d saberpro_db -c "SELECT COUNT(*) FROM estudiantes;"
```

**Estado esperado:** Tablas creadas con datos de prueba.

---

## Fase 2: Backend FastAPI

- [ ] Carpeta `backend` existe y contiene archivos
- [ ] Entorno virtual de Python creado (`venv`)
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Archivo `.env` creado con credenciales de BD correctas
- [ ] Script `run.py` existe y es ejecutable

### Verificar Archivos del Backend

```bash
cd E:\Projects\proyecto1\prueba prediccion\backend

# Verificar estructura
dir

# Verificar app
dir app\

# Verificar archivos clave
test-path app/main.py
test-path app/routes/prediction_routes.py
test-path app/services/prediction_service.py
test-path requirements.txt
test-path .env
```

### Instalar y Configurar Backend

```bash
cd E:\Projects\proyecto1\prueba prediccion\backend

# Crear entorno virtual
python -m venv venv

# Activar
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con credenciales correctas
```

### Contenido Esperado de .env

```env
DEBUG=True
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

DB_HOST=localhost
DB_PORT=5432
DB_NAME=saberpro_db
DB_USER=saberpro_user
DB_PASSWORD=MiContrasenaSegura123

MODEL_PATH=ml/trained_models/saberpro_model.pkl
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

### Iniciar Backend

```bash
# En terminal separada (mantener corriendo)
cd E:\Projects\proyecto1\prueba prediccion\backend
.\venv\Scripts\Activate.ps1
python run.py
```

### Verificar Backend Funcionando

```bash
# Health check
curl http://localhost:8000/api/health

# Respuesta esperada:
# {"status": "...", "model_loaded": true/false, "database_connected": true/false, ...}

# Ver documentacion
curl http://localhost:8000/docs
```

**Estado esperado:** Backend ejecutandose sin errores, respuesta a health check.

---

## Fase 3: Frontend React

- [ ] Carpeta `frontend` existe y contiene archivos
- [ ] Dependencias npm instaladas (`npm install`)
- [ ] Archivo `.env` configurado (opcional)
- [ ] Servidor Vite puede iniciar

### Verificar Archivos del Frontend

```bash
cd E:\Projects\proyecto1\prueba prediccion\frontend

# Verificar estructura
dir

# Verificar archivos clave
test-path package.json
test-path vite.config.js
test-path index.html
test-path src/App.jsx
```

### Instalar y Configurar Frontend

```bash
cd E:\Projects\proyecto1\prueba prediccion\frontend

# Instalar dependencias
npm install

# Verificar instalacion
dir node_modules
```

### Iniciar Frontend

```bash
# En terminal separada (mantener corriendo)
cd E:\Projects\proyecto1\prueba prediccion\frontend
npm run dev
```

### Verificar Frontend Funcionando

```bash
# Verificar que el servidor responde
curl http://localhost:5173

# Abrir en navegador
# http://localhost:5173
```

**Estado esperado:** Pagina principal carga correctamente.

---

## Fase 4: API Respondiendo

### Verificar Health Check

```bash
curl http://localhost:8000/api/health
```

Respuesta esperada:
```json
{
  "status": "healthy" | "degraded",
  "model_loaded": true | false,
  "database_connected": true | false,
  "model_version": "1.0.0",
  "timestamp": "..."
}
```

### Verificar Endpoint de Prediccion

```bash
curl -X POST http://localhost:8000/api/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"promedio_acumulado\": 4.2, \"promedio_basicas\": 4.0, \"promedio_ingenieria\": 4.3, \"num_reprobadas\": 2, \"pct_creditos\": 75.5, \"semestre\": 6, \"estrato\": 3, \"genero\": \"M\"}"
```

Respuesta esperada:
```json
{
  "resultado": "Alto" | "Medio" | "Bajo",
  "probabilidad": 0.8...,
  "confidence_pct": 80...,
  "recomendacion": "...",
  "timestamp": "...",
  "model_version": "1.0.0"
}
```

### Verificar Endpoint de Estadisticas

```bash
curl http://localhost:8000/api/statistics
```

### Verificar Documentacion Swagger

```bash
# Abrir en navegador
http://localhost:8000/docs
```

---

## Fase 5: Prediccion End-to-End

### Desde la Interfaz Web

1. Abrir http://localhost:5173 en navegador
2. Verificar que el formulario carga
3. Llenar campos:
   - Promedio Acumulado: 4.2
   - Promedio Basicas: 4.0
   - Promedio Ingenieria: 4.3
   - Numero de Reprobadas: 2
   - Porcentaje Creditos: 75.5
   - Semestre: 6
   - Estrato: 3
   - Genero: M
4. Hacer clic en "Generar Prediccion"
5. Verificar que aparece resultado
6. Verificar que la recomendacion se muestra

### Verificar Persistencia en Base de Datos

```bash
psql -U saberpro_user -d saberpro_db

# Ver predicciones recientes
SELECT documento, resultado, probabilidad, created_at
FROM resultados_saber_pro
ORDER BY created_at DESC
LIMIT 5;

# Verificar conteo
SELECT COUNT(*) FROM resultados_saber_pro;
```

---

## Checklist Final

### Base de Datos
- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `saberpro_db` creada
- [ ] Tablas `estudiantes`, `asignaturas`, `notas`, `resultados_saber_pro` verificadas
- [ ] Datos de prueba insertados

### Backend
- [ ] Entorno virtual creado y activado
- [ ] Dependencias instaladas
- [ ] Archivo `.env` configurado
- [ ] Servidor iniciado en puerto 8000
- [ ] Health check respondiendo
- [ ] Documentacion Swagger accesible

### Frontend
- [ ] Dependencias npm instaladas
- [ ] Servidor Vite iniciado en puerto 5173
- [ ] Pagina principal carga
- [ ] Formulario de prediccion visible

### Sistema Completo
- [ ] Prediccion funciona end-to-end
- [ ] Resultados se guardan en BD
- [ ] Historial accesible
- [ ] Estadisticas disponibles

---

## Resolucion de Problemas

### Si la base de datos no conecta:

```bash
# Verificar servicio PostgreSQL
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS
# Windows: Services > postgresql-x64-15

# Verificar credenciales en .env
type backend\.env
```

### Si el backend no inicia:

```bash
# Verificar puerto en uso
netstat -an | findstr 8000

# Verificar errores en el log
python run.py
```

### Si el frontend no carga:

```bash
# Verificar puerto en uso
netstat -an | findstr 5173

# Limpiar cache
rm -rf node_modules package-lock.json
npm install
```

---

## Comandos de Verificacion Rapida

```bash
# 1. Verificar PostgreSQL
psql -U saberpro_user -d saberpro_db -c "SELECT 1;"

# 2. Verificar Backend
curl http://localhost:8000/api/health

# 3. Verificar Frontend
curl http://localhost:5173

# 4. Verificar Prediccion
curl -X POST http://localhost:8000/api/predict -H "Content-Type: application/json" -d "{\"promedio_acumulado\":4.2,\"promedio_basicas\":4.0,\"promedio_ingenieria\":4.3,\"num_reprobadas\":2,\"pct_creditos\":75.5,\"semestre\":6,\"estrato\":3,\"genero\":\"M\"}"

# 5. Verificar Estadisticas
curl http://localhost:8000/api/statistics
```

---

**Checklist completado.**