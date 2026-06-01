# 🗄️ PostgreSQL - Base de Datos Saber Pro

## 📋 Descripción

Configuración completa de PostgreSQL para almacenar:
- Datos demográficos de estudiantes
- Histórico de predicciones
- Auditoría de cambios
- Estadísticas y análisis

## 🚀 Instalación y Configuración

### 1. Instalar PostgreSQL

**Windows:**
```bash
# Descargar desde: https://www.postgresql.org/download/windows/
# O usando Chocolatey:
choco install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### 2. Crear usuario y BD

```bash
# Acceder a PostgreSQL
psql -U postgres

# Dentro de psql:
CREATE USER saberpro_user WITH PASSWORD 'tu_contraseña_segura';
CREATE DATABASE saberpro_db OWNER saberpro_user;

# Dar permisos
ALTER USER saberpro_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE saberpro_db TO saberpro_user;

# Salir
\q
```

### 3. Ejecutar scripts SQL

```bash
# Crear tablas
psql -U saberpro_user -d saberpro_db -f database/sql/init_database.sql

# Insertar datos de prueba
psql -U saberpro_user -d saberpro_db -f database/sql/seed_data.sql

# Verificar
psql -U saberpro_user -d saberpro_db
\dt              # Ver tablas
SELECT * FROM students LIMIT 5;
SELECT * FROM predictions LIMIT 5;
\q
```

## 📁 Estructura

```
database/
└── sql/
    ├── init_database.sql    # Crear tablas, índices, vistas
    ├── seed_data.sql        # Datos de prueba
    └── queries.sql          # Queries útiles
```

## 🗂️ Tablas Principales

### 1. **students** - Información de Estudiantes

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment | Identificador único |
| edad | INTEGER | 16-70 | Edad del estudiante |
| promedio | DECIMAL(3,2) | 0-5 | Promedio académico |
| horas_estudio | DECIMAL(4,2) | 0-168 | Horas/semana |
| estrato | INTEGER | 1-6 | Estrato socioeconómico |
| carrera | VARCHAR(100) | NOT NULL | Programa académico |
| acceso_internet | BOOLEAN | DEFAULT TRUE | ¿Tiene internet? |
| semestre | INTEGER | 1-10 | Semestre actual |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha creación |
| updated_at | TIMESTAMP | Auto-update | Fecha actualización |

**Índices:**
```sql
CREATE INDEX idx_students_carrera ON students(carrera);
CREATE INDEX idx_students_estrato ON students(estrato);
CREATE INDEX idx_students_created_at ON students(created_at);
```

### 2. **predictions** - Predicciones Realizadas

| Campo | Tipo | Restricción | Descripción |
|-------|------|-------------|-------------|
| id | SERIAL PRIMARY KEY | Auto-increment | Identificador único |
| student_id | INTEGER | FK students | Ref. al estudiante |
| categoria | VARCHAR(20) | Bajo/Medio/Alto | Categoría predicha |
| probabilidad | DECIMAL(4,3) | 0-1 | Confianza predicción |
| recomendacion | TEXT | Nullable | Consejo personalizado |
| model_version | VARCHAR(20) | DEFAULT 1.0.0 | Versión del modelo |
| created_at | TIMESTAMP | DEFAULT NOW() | Fecha predicción |

**Índices:**
```sql
CREATE INDEX idx_predictions_student_id ON predictions(student_id);
CREATE INDEX idx_predictions_categoria ON predictions(categoria);
CREATE INDEX idx_predictions_created_at ON predictions(created_at);
```

### 3. **students_audit** - Auditoría

Tabla para rastrear cambios en datos de estudiantes:
```sql
CREATE TABLE students_audit (
    id SERIAL PRIMARY KEY,
    student_id INTEGER,
    action VARCHAR(10),      -- INSERT, UPDATE, DELETE
    changed_at TIMESTAMP,
    old_data JSONB,
    new_data JSONB
);
```

## 👁️ Vistas (Views)

### predictions_summary
```sql
SELECT
    categoria,
    total,
    avg_confidence,
    min_prob,
    max_prob
FROM predictions_summary;
```

### predictions_by_career
```sql
SELECT
    carrera,
    categoria,
    total_predictions,
    avg_confidence,
    percentage
FROM predictions_by_career;
```

## ⚙️ Funciones SQL

### get_student_predictions()
```sql
SELECT * FROM get_student_predictions(student_id_param => 1, limit_param => 10);
```

### get_predictions_stats()
```sql
SELECT * FROM get_predictions_stats(days_back => 30);
```

## 🔑 Variables de Entorno

En `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saberpro_db
DB_USER=saberpro_user
DB_PASSWORD=tu_contraseña
```

## 📊 Queries Útiles

### Estadísticas Globales
```sql
SELECT COUNT(DISTINCT s.id) as estudiantes,
       COUNT(p.id) as predicciones,
       ROUND(AVG(p.probabilidad)::numeric, 4) as confianza
FROM students s
LEFT JOIN predictions p ON s.id = p.student_id;
```

### Mejor Desempeño por Carrera
```sql
SELECT s.carrera,
       AVG(s.promedio) as promedio_carrera,
       AVG(p.probabilidad) as confianza
FROM students s
LEFT JOIN predictions p ON s.id = p.student_id
GROUP BY s.carrera
ORDER BY confianza DESC;
```

### Últimas Predicciones
```sql
SELECT s.id, s.carrera, p.categoria, p.probabilidad, p.created_at
FROM predictions p
JOIN students s ON p.student_id = s.id
ORDER BY p.created_at DESC
LIMIT 10;
```

Ver más en `queries.sql` (15 queries adicionales)

## 🔒 Seguridad

### Contraseña Fuerte
```bash
# Generar contraseña segura
openssl rand -base64 12
```

### Backups

**Crear backup:**
```bash
pg_dump -U saberpro_user -d saberpro_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restaurar backup:**
```bash
psql -U saberpro_user -d saberpro_db < backup_20240519_100000.sql
```

### Restricción de Conexiones

En `postgresql.conf`:
```
listen_addresses = 'localhost'
port = 5432
```

## 🧪 Testing SQL

```bash
# Acceder a la BD
psql -U saberpro_user -d saberpro_db

# Listar tablas
\dt

# Ver esquema de tabla
\d students

# Ejecutar query
SELECT * FROM students LIMIT 5;

# Salir
\q
```

## 📈 Mejora de Performance

### Índices Recomendados

Ya están creados en `init_database.sql`, pero puedes agregar más:

```sql
-- Búsqueda frecuente por estudiante + fecha
CREATE INDEX idx_predictions_student_date ON predictions(student_id, created_at DESC);

-- Para análisis por estrato
CREATE INDEX idx_students_estrato_promedio ON students(estrato, promedio);
```

### VACUUM y ANALYZE

```bash
# Limpiar y actualizar estadísticas
psql -U saberpro_user -d saberpro_db -c "VACUUM ANALYZE;"
```

## 🗑️ Limpieza y Mantenimiento

### Eliminar Predicciones Antiguas

```sql
DELETE FROM predictions
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Resetear Auto-Increment

```sql
ALTER SEQUENCE students_id_seq RESTART WITH 1;
ALTER SEQUENCE predictions_id_seq RESTART WITH 1;
```

## 📊 Monitoreo

### Tamaño de BD

```sql
SELECT pg_size_pretty(pg_database_size('saberpro_db'));
```

### Conexiones Activas

```sql
SELECT usename, application_name, state
FROM pg_stat_activity
WHERE datname = 'saberpro_db';
```

### Tablas Más Grandes

```sql
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🐛 Troubleshooting

### Error: "FATAL: password authentication failed"
```bash
# Verifica contraseña en .env
# O resetea:
psql -U postgres
ALTER USER saberpro_user WITH PASSWORD 'nueva_contraseña';
```

### Error: "database does not exist"
```bash
# Crear BD:
createdb -U saberpro_user -h localhost saberpro_db
```

### Error: "could not connect to server"
```bash
# Inicia PostgreSQL:
sudo systemctl start postgresql    # Linux
brew services start postgresql@15  # macOS
```

## 📚 Documentación Oficial

- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Psycopg2](https://www.psycopg.org/)

---

**Desarrollado para Proyecto de Grado 2024**
