-- Tabla para dataset real (training) del Modelo Predictivo Saber Pro.
-- Independiente de `usuarios`: el CSV no trae PII, por lo que estos registros
-- son solo datos de entrenamiento, no cuentas del sistema.

CREATE TABLE IF NOT EXISTS dataset_saber_pro_real (
    id                              SERIAL PRIMARY KEY,
    fila_csv                        INTEGER NOT NULL,

    -- Campos crudos del CSV
    semestre_actual                 INTEGER,
    porcentaje_avance               NUMERIC(5,2),
    puntaje_global_saber11          INTEGER,
    puntaje_matematicas_saber11     NUMERIC(5,2),
    puntaje_lectura_critica_saber11 INTEGER,
    puntaje_ingles_saber11          INTEGER,
    promedio_ingles_raw             INTEGER,                -- Escala 1-7
    promedio_ingles_nivel           VARCHAR(4),             -- Mapeado A1-C2
    participo_preparacion           BOOLEAN,
    numero_simulacros_realizados    INTEGER,
    puntaje_promedio_simulacros     NUMERIC(5,2),
    anio_presentacion_saber_pro     INTEGER,
    promedio_acumulado              NUMERIC(3,2),
    promedio_materias_basicas       NUMERIC(3,2),
    promedio_programacion           NUMERIC(3,2),
    promedio_matematica_estadistica NUMERIC(3,2),
    promedio_ingenieria             NUMERIC(3,2),           -- Derivado
    creditos_aprobados              INTEGER,
    asignaturas_reprobadas          INTEGER,
    asignaturas_aprobadas           INTEGER,
    numero_asignaturas_repetidas    INTEGER,
    estrato_raw                     VARCHAR(20),            -- "ESTRATO N"
    estrato                         INTEGER,                 -- Entero extraido
    tipo_financiacion               TEXT,
    condicion_laboral_raw           VARCHAR(5),             -- "Si"/"No"
    trabaja                         BOOLEAN,
    genero                          CHAR(1),
    edad                            INTEGER,
    procedencia                     VARCHAR(60),
    ciudad_residencia_actual        VARCHAR(60),

    -- Campos asumidos (documentados): el CSV no los trae, se usaron defaults.
    acceso_internet                 BOOLEAN,
    acceso_pc                       BOOLEAN,
    horas_estudio_semana            INTEGER,
    asistencia_pct                  NUMERIC(5,2),

    -- Trazabilidad
    fuente_dato                     VARCHAR(80) NOT NULL DEFAULT 'base-de-datos-para-proyecto-de-grado-Ing.csv',
    created_at                      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_dataset_saber_pro_real_fila UNIQUE (fila_csv)
);

CREATE INDEX IF NOT EXISTS idx_dataset_real_genero  ON dataset_saber_pro_real(genero);
CREATE INDEX IF NOT EXISTS idx_dataset_real_estrato ON dataset_saber_pro_real(estrato);
CREATE INDEX IF NOT EXISTS idx_dataset_real_edad    ON dataset_saber_pro_real(edad);

COMMENT ON TABLE dataset_saber_pro_real IS
  'Dataset real (anonimo) cargado desde base-de-datos-para-proyecto-de-grado-Ing.csv para entrenamiento/validacion del Modelo Predictivo Saber Pro. No contiene PII.';
-- =====================================================================
-- Tabla de auditoria (audit_log).
-- Schema original (2026-10-02) + columna user_agent agregada 2026-10-09.
-- Aplicar de forma idempotente: este DDL es seguro de correr varias veces.
-- =====================================================================

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

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id    ON audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id   ON audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_email ON audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_accion      ON audit_log(accion);

COMMENT ON TABLE audit_log IS
  'Bitacora de acciones: logins, cambios de password, recuperacion, gestion admin, exports CSV.';
