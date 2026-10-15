-- =====================================================================
-- Migracion idempotente: extender tablas con campos del CSV identificado.
--
-- - student_profiles: 4 columnas que el CSV trae pero la tabla no tenia
--   (promedio_programacion, promedio_matematica_estadistica,
--    creditos_aprobados, asignaturas_aprobadas).
-- - dataset_saber_pro_real: 4 columnas de identificacion institucional
--   (nombres, identificacion, correo, carnet) + indice para login rapido.
--
-- Aplicacion:
--   psql -h localhost -U postgres -d saberpro -f backend/scripts/apply-student-profiles-ddl.sql
--
-- Idempotente: se puede correr varias veces sin error.
-- =====================================================================

-- ---------------------------------------------------------------------
-- student_profiles: columnas faltantes para alinear con el CSV.
-- ---------------------------------------------------------------------
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS promedio_programacion         NUMERIC(3,2);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS promedio_matematica_estadistica NUMERIC(3,2);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS creditos_aprobados             INTEGER;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS asignaturas_aprobadas         INTEGER;

COMMENT ON COLUMN student_profiles.promedio_programacion          IS 'Promedio del area de programacion (CSV PROMEDIO_PROGRAMACION).';
COMMENT ON COLUMN student_profiles.promedio_matematica_estadistica IS 'Promedio del area de matematicas/estadistica (CSV PROMEDIO_MATEMATICA_ESTADISTICA).';
COMMENT ON COLUMN student_profiles.creditos_aprobados             IS 'Creditos aprobados al momento de la captura (CSV CREDITOS_APROBADOS).';
COMMENT ON COLUMN student_profiles.asignaturas_aprobadas         IS 'Asignaturas aprobadas al momento de la captura (CSV ASIGNATURAS_APROBADAS).';

-- ---------------------------------------------------------------------
-- dataset_saber_pro_real: identificacion institucional del estudiante.
-- ---------------------------------------------------------------------
ALTER TABLE dataset_saber_pro_real ADD COLUMN IF NOT EXISTS nombres        VARCHAR(120);
ALTER TABLE dataset_saber_pro_real ADD COLUMN IF NOT EXISTS identificacion VARCHAR(20);
ALTER TABLE dataset_saber_pro_real ADD COLUMN IF NOT EXISTS correo         VARCHAR(120);
ALTER TABLE dataset_saber_pro_real ADD COLUMN IF NOT EXISTS carnet         VARCHAR(20);

COMMENT ON COLUMN dataset_saber_pro_real.nombres        IS 'Nombre completo del estudiante (CSV NOMBRES).';
COMMENT ON COLUMN dataset_saber_pro_real.identificacion IS 'Numero de documento del estudiante (CSV IDENTIFICACION). Tambien es la contrasena institucional.';
COMMENT ON COLUMN dataset_saber_pro_real.correo         IS 'Correo electronico registrado (CSV CORREO). Cualquier dominio: el CSV es el roster autoritativo.';
COMMENT ON COLUMN dataset_saber_pro_real.carnet         IS 'Codigo de carnet institucional (CSV CARNET).';

-- Indice para el lookup por correo en el login.
CREATE INDEX IF NOT EXISTS idx_dataset_real_correo_lower ON dataset_saber_pro_real (LOWER(correo));

-- ---------------------------------------------------------------------
-- Actualizar fuente_dato default para el CSV nuevo.
-- (Solo aplica a filas NUEVAS; las existentes conservan su valor.)
-- ---------------------------------------------------------------------
ALTER TABLE dataset_saber_pro_real
  ALTER COLUMN fuente_dato SET DEFAULT 'base-de-datos-para-proyecto-de-grado-Ing-_1_.csv';

COMMENT ON TABLE dataset_saber_pro_real IS
  'Dataset real (identificado) cargado desde base-de-datos-para-proyecto-de-grado-Ing-_1_.csv. Ahora incluye nombre, identificacion, correo y carnet de cada estudiante. Las 13 features del modelo ML se mantienen iguales.';