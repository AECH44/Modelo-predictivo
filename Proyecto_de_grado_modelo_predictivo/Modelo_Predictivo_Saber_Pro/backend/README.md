# Backend — Modelo Predictivo Saber Pro

API REST en **Node.js + Express + PostgreSQL** para autenticación
(login y registro) del proyecto **Modelo Predictivo Saber Pro**.

## Requisitos

- Node.js 18+
- PostgreSQL 13+ corriendo en `localhost:5432`
- Una base de datos PostgreSQL ya creada (por defecto `saberpro`)

## Configuración

1. **Variables de entorno** — `backend/.env`:

   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=saberpro
   DB_USER=postgres
   DB_PASSWORD=tu_password

   PORT=4000
   FRONTEND_ORIGIN=http://localhost:5173

   JWT_SECRET=super-secret-change-me-in-production
   JWT_EXPIRES_IN=8h
   ```

2. **Aplicar el esquema** (tabla `usuarios`):

   ```bash
   psql -h localhost -p 5432 -U postgres -d saberpro -f backend/schema.sql
   ```

3. **Instalar dependencias**:

   ```bash
   cd backend
   npm install
   ```

4. **Sembrar usuarios demo** (rector, decano, profesor, estudiante con password `123456`):

   ```bash
   npm run seed
   ```

5. **Iniciar el servidor**:

   ```bash
   npm start            # producción
   npm run dev          # con hot-reload
   ```

   El backend queda escuchando en `http://localhost:4000`.

## Endpoints

| Método | Ruta              | Descripción                                |
|--------|-------------------|--------------------------------------------|
| GET    | /api/health       | Estado del servidor + conexión a BD        |
| POST   | /api/auth/register| Registro de nuevo estudiante               |
| POST   | /api/auth/login   | Iniciar sesión                             |
| POST   | /api/auth/recover | Verificar existencia de correo             |
| GET    | /api/auth/me      | Perfil del usuario autenticado (Bearer)    |
| PATCH  | /api/profile      | Actualizar datos del estudiante (Bearer)   |

## Cuentas de prueba (tras correr `npm run seed`)

| Rol         | Email                          | Password |
|-------------|--------------------------------|----------|
| Rector      | rector@saberpro.edu.co         | 123456   |
| Decano      | decano@saberpro.edu.co         | 123456   |
| Profesor    | profesor@saberpro.edu.co       | 123456   |
| Estudiante  | jhan.mesa@saberpro.edu.co      | 123456   |
