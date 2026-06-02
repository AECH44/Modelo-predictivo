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

> Para los usuarios reales (no demo) cualquier persona se registra desde
> `/register` o desde `POST /api/auth/register`. Los siguientes son los
> usuarios sembrados como demo del sistema.

| Rol         | Programa   | Correo                              | Documento  | Contraseña       |
|-------------|------------|-------------------------------------|------------|-------------------|
| Rector      | —          | rector@unac.edu.co                  | 1000000001 | `@7&arST76M&zS4` |
| Decano      | Sistemas   | decano.sistemas@unac.edu.co         | 1000000002 | `He%343b8c&2B#m` |
| Profesor    | Sistemas   | profesor.sistemas@unac.edu.co       | 1000000003 | `Dwu955j_4yY48v` |
| Decano      | Industrial | decano.industrial@unac.edu.co       | 1000000005 | `sGst&Gd8Gu#_tX` |
| Profesor    | Industrial | profesor.industrial@unac.edu.co     | 1000000006 | `Wt9&&X#8m638d8` |
| Estudiante  | Industrial | jhan.mesa@saberpro.edu.co           | 1000000004 | `123456`          |

El login acepta tanto el **correo** como el **documento** como identificador.

Cualquier usuario puede entrar a su cuenta y desde el botón **"Mi cuenta"**
del topbar/sidebar puede:

- Cambiar su **nombre completo** (mismas reglas que en registro: solo letras y espacios; permite abreviaciones tipo `Dr.`, `Prof.`).
- Cambiar su **documento de identidad** (5–15 dígitos; debe ser único). Una vez cambiado, el login también funciona con el nuevo documento.
- Cambiar su **contraseña** (requiere la contraseña actual + nueva con mínimo 6 caracteres).
