# Guia de uso con Docker Compose

Levanta todo el sistema (PostgreSQL 18 + 3 servicios de aplicacion) con un solo comando.

## Pre-requisitos

- Docker Desktop (Windows / Mac / Linux) con `docker compose` v2.
- El CSV anonimo del proyecto en `data/base-de-datos-para-proyecto-de-grado-Ing.csv`
  (NO versionado en git por PII). Si no lo tienes, pidelo al tutor o
  pidele a Claude que use el dataset sintetico.

## Primer arranque (3 minutos)

```bash
# 1. Levantar postgres + backend + frontend + ml-service
docker-compose up -d --build

# 2. Sembrar las 4 cuentas admin (politica institucional: password = documento)
docker-compose exec backend node src/scripts/seed-admins.js

# 3. (Una vez) Cargar el dataset real desde el CSV
docker-compose --profile init run --rm init-data

# 4. (Una vez) Entrenar el modelo y persistir background_sample.pkl para SHAP
docker-compose --profile train run --rm ml-training
```

Login con cualquiera de las 4 cuentas admin:
- `rectoria@unac.edu.co` / `91497570`
- `facultad.ingenieria@unac.edu.co` / `91475722`
- `javierf.cordobap@unac.edu.co` / `7702661`
- `jhanc.mesae@unac.edu.co` / `1001417605`

## URLs

| Servicio | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend Express | http://localhost:4000 |
| FastAPI + Swagger | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 (user `postgres`, pass `modelopredictivo`, db `saberpro`) |

## Comandos utiles

```bash
# Ver logs en vivo
docker-compose logs -f backend

# Ver logs de todos los servicios
docker-compose logs -f

# Estado de los servicios
docker-compose ps

# Reiniciar un servicio (p. ej. tras cambiar env vars)
docker-compose restart backend

# Entrar a la consola del backend (debug)
docker-compose exec backend sh

# Acceder a postgres
docker-compose exec postgres psql -U postgres -d saberpro

# Parar todo (conserva datos en volumen `pgdata`)
docker-compose down

# Reset TOTAL: borra el volumen `pgdata` y el modelo entrenado
docker-compose down -v
rm -rf ml-training/trained_models/* ml-training/data/* ml-training/models/*

# Reconstruir imagenes (tras cambiar un Dockerfile o requirements)
docker-compose build --no-cache
```

## Hot-reload en desarrollo

| Servicio | Como se recarga |
|---|---|
| Backend | `node --watch` detecta cambios en `./backend/src` |
| Frontend | Vite HMR detecta cambios en `./frontend/src` |
| ml-service | uvicorn `--reload` detecta cambios en `./ml-service/app` |
| ml-training | Solo se ejecuta bajo demanda (perfil `train`) |

No hace falta reiniciar el contenedor para ver cambios de codigo.
Si modificas `requirements.txt` o un `Dockerfile`, ejecuta
`docker-compose build <servicio>` y luego `docker-compose up -d <servicio>`.

## Volumenes y datos

| Volumen / bind mount | Que guarda | Persiste entre `down`? |
|---|---|---|
| `pgdata` (nombrado) | Datos de PostgreSQL | SI |
| `frontend_node_modules` (nombrado) | node_modules del frontend | SI |
| `./ml-training/trained_models` (bind) | Modelo .pkl | SI |
| `./ml-training/data` (bind) | background_sample.pkl | SI |
| `./ml-training/analysis` (bind) | Graficos PNG | SI |
| `./backend/src` (bind) | Codigo del backend (hot-reload) | SI |

Reset completo: `docker-compose down -v` borra los volumenes nombrados y
los bind mounts se mantienen en el host.

## Troubleshooting

### `connection refused` al primer arranque
postgres aun no esta listo. Espera 5-10 segundos y reintenta. El `healthcheck`
de docker-compose deberia prevenir esto, pero en maquinas lentas puede pasar.

### ml-service arranca en modo demo (predicciones aleatorias)
No encuentra `./ml-training/trained_models/saberpro_model.pkl`.
Ejecuta `docker-compose --profile train run --rm ml-training` para entrenar.

### Frontend no detecta cambios (Windows)
Verifica que `CHOKIDAR_USEPOLLING=true` este definido en `docker-compose.yml`.
Vite necesita polling en Windows porque los bind mounts no generan inotify.

### Backend no reinicia tras editar archivos
`node --watch` requiere Node >=18.11. Verifica con `docker-compose exec backend node --version`.
Si falla, reconstruye: `docker-compose build backend`.

### `audit_log` FK violation al inicializar postgres
El orden de los archivos en `/docker-entrypoint-initdb.d/` es alfabetico.
Verifica que `01-usuarios.sql` se monte ANTES de `02-dataset.sql` (que
referencia `usuarios(id)`).

## Arquitectura (resumen)

```
+-------------------+      +-------------------+
|  Frontend (Vite)  | <--> |   Backend Express |
|  localhost:5173   |      |   localhost:4000  |
+-------------------+      +---------+---------+
                                       |
                                       v
                            +-------------------+
                            |  FastAPI ML svc   |
                            |  localhost:8000   |
                            +---------+---------+
                                      |
                                      v
                            +-------------------+
                            |   PostgreSQL 18   |
                            |   localhost:5432  |
                            +-------------------+
```

- Frontend hace peticiones HTTP al backend Express.
- Backend consulta PostgreSQL directamente.
- Backend llama al FastAPI por HTTP cuando necesita predecir.
- FastAPI carga el .pkl al arrancar y NO toca la BD para predecir
  (solo guarda resultados si `database_connected=True`).

## Lo que NO cubre docker-compose (intencional)

- **Produccion real**: el `JWT_SECRET` aqui es el de dev. Para produccion
  usar uno generado (`openssl rand -hex 32`) y pasarlo via `.env` o
  `docker-compose.override.yml`.
- **HTTPS**: el proxy inverso (nginx, Caddy, Traefik) va por delante.
- **Backups automaticos** del volumen `pgdata`. Para tesis esto no aplica,
  pero para produccion usar `pg_basebackup` o `wal-g`.
- **Tests automatizados**: fuera del scope de este docker-compose.