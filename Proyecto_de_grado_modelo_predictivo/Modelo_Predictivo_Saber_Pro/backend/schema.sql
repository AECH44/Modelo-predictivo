-- =====================================================
-- Esquema de usuarios para Modelo Predictivo Saber Pro
-- BD: saberpro (PostgreSQL)
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    documento VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'estudiante'
        CHECK (role IN ('rector', 'decano', 'profesor', 'administrador', 'estudiante')),
    program VARCHAR(20) NOT NULL DEFAULT 'sistemas'
        CHECK (program IN ('sistemas', 'industrial', 'all')),
    age VARCHAR(10),
    student_record_id VARCHAR(40),
    semester VARCHAR(10),
    study_hours VARCHAR(10),
    english_level VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migración no destructiva para instalaciones existentes
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS documento VARCHAR(20);

-- Soft delete: cuentas desactivadas no pueden iniciar sesion.
-- DEFAULT TRUE asegura que las filas existentes y nuevos INSERTs queden activas.
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_usuarios_is_active
    ON usuarios(is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_documento
    ON usuarios(documento);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role  ON usuarios(role);

-- Auditoria: registro persistente de las acciones administrativas
-- (asignacion de roles, ediciones, activaciones/desactivaciones).
CREATE TABLE IF NOT EXISTS audit_log (
    id               SERIAL PRIMARY KEY,
    admin_id         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    admin_email      VARCHAR(255),
    accion           VARCHAR(60) NOT NULL,
    target_id        INTEGER,
    target_documento VARCHAR(20),
    detalles         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
    ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id
    ON audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id
    ON audit_log(admin_id);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION trg_usuarios_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS usuarios_set_updated_at ON usuarios;
CREATE TRIGGER usuarios_set_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION trg_usuarios_set_updated_at();
