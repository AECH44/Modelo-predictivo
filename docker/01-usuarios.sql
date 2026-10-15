-- Tabla usuarios: cuentas del sistema.
-- El backend la gestiona via backend/src/users.js.
-- El seed de las 4 cuentas admin se hace con `node src/scripts/seed-admins.js`.
--
-- Este DDL existe aparte de ddl.sql/apply-audit-ddl.sql porque ambos referencian
-- `usuarios(id)` con FK y deben correr despues de esta tabla. Postgres
-- autoejecuta archivos en /docker-entrypoint-initdb.d/ en orden alfabetico
-- (01, 02, 03), asi que queda:
--   01-usuarios.sql   <- este archivo
--   02-dataset.sql    <- ddl.sql (dataset_saber_pro_real + audit_log)
--   03-audit.sql      <- apply-audit-ddl.sql (idempotente)
--
-- Si `usuarios` ya existe, IF NOT EXISTS lo deja intacto.

CREATE TABLE IF NOT EXISTS usuarios (
    id                  SERIAL PRIMARY KEY,
    documento           VARCHAR(20)  UNIQUE NOT NULL,
    username            VARCHAR(255) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(50)  NOT NULL DEFAULT 'estudiante',
    program             VARCHAR(50)  NOT NULL DEFAULT 'sistemas',
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    is_synthetic        BOOLEAN      NOT NULL DEFAULT FALSE,
    age                 VARCHAR(10),
    student_record_id   VARCHAR(50),
    semester            VARCHAR(10),
    study_hours         VARCHAR(10),
    english_level       VARCHAR(10),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_role    ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_usuarios_program ON usuarios(program);
CREATE INDEX IF NOT EXISTS idx_usuarios_active  ON usuarios(is_active);