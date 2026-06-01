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
        CHECK (role IN ('rector', 'decano', 'profesor', 'estudiante')),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_documento
    ON usuarios(documento);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role  ON usuarios(role);

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
