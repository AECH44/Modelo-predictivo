-- DDL idempotente para audit_log.
-- Esta tabla ya existe en la BD con el schema detectado via \d audit_log:
--   id (integer, PK, sequence), admin_id (integer, FK usuarios),
--   admin_email (varchar(255)), accion (varchar(60) NOT NULL),
--   target_id (integer), target_documento (varchar(20)),
--   detalles (jsonb NOT NULL DEFAULT '{}'), created_at (timestamp NOT NULL DEFAULT NOW()).
--
-- Este script es SEGURO de correr varias veces:
--   1) CREATE TABLE IF NOT EXISTS: no-op si ya existe.
--   2) ALTER TABLE ADD COLUMN IF NOT EXISTS: solo agrega columnas faltantes.
--   3) CREATE INDEX IF NOT EXISTS: solo crea indices faltantes.
--
-- Aplicar con:
--   psql -h localhost -U postgres -d saberpro -f backend/scripts/apply-audit-ddl.sql

CREATE TABLE IF NOT EXISTS audit_log (
    id               INTEGER       PRIMARY KEY,
    admin_id         INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
    admin_email      VARCHAR(255),
    accion           VARCHAR(60)   NOT NULL,
    target_id        INTEGER,
    target_documento VARCHAR(20),
    detalles         JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Columnas nuevas (agregadas en la sesion de mejoras 2026-10-09).
-- user_agent: navegador/cliente del usuario que hizo la accion.
-- No guardamos ip_address por ahora: req.ip en Express requiere configurar
-- `app.set('trust proxy', ...)` y no queremos PII innecesaria.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Indices nuevos para los filtros que agrega la UI de auditoria.
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_email ON audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_accion     ON audit_log(accion);