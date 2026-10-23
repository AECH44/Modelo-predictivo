-- =====================================================================
-- DDL: columnas del intervalo de prediccion (modelo v2)
-- =====================================================================
--
-- El modelo v2 (`saberpro-v2`) devuelve un puntaje estimado con un
-- intervalo de prediccion (el margen de error empirico del modelo, MAE
-- medido en validacion cruzada). Sin esas dos columnas, el intervalo se
-- perderia al guardar la prediccion.
--
-- La tabla `predictions` no tiene DDL en el repo (solo se conoce del
-- backup), asi que este archivo es idempotente y se puede correr varias
-- veces:
--
--   psql -h localhost -U postgres -d saberpro -f backend/scripts/apply-predictions-v2-ddl.sql
-- =====================================================================

ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS puntaje_minimo INTEGER,
    ADD COLUMN IF NOT EXISTS puntaje_maximo INTEGER;

COMMENT ON COLUMN predictions.puntaje_minimo IS
  'Extremo inferior del intervalo de prediccion del puntaje (modelo v2).';
COMMENT ON COLUMN predictions.puntaje_maximo IS
  'Extremo superior del intervalo de prediccion del puntaje (modelo v2).';

-- ---------------------------------------------------------------------------
-- Escala del puntaje estimado.
--
-- El Saber Pro se puntua sobre 300: tres areas (matematicas, lectura critica
-- e ingles) de 100 puntos cada una, y el global es su suma. El modelo v2
-- guarda exactamente esa suma, asi que el rango 0..300 es el correcto.
--
-- La columna `puntaje_global_saber11` del CSV NO se usa como target: esta en
-- otra escala (un indice ponderado que llega a 409) y producia predicciones
-- por encima de 300.
--
-- ORDEN IMPORTANTE: las filas del modelo anterior (escala 0-450) no cumplen
-- el rango nuevo, asi que se eliminan ANTES de poner la constraint. Se
-- borran solo las que lo violan; las del modelo actual se conservan. Para
-- repoblarlas despues: POST /api/admin/recompute-predictions.
-- ---------------------------------------------------------------------------
DELETE FROM predictions
 WHERE puntaje_estimado > 300 OR puntaje_estimado < 0;

ALTER TABLE predictions
    DROP CONSTRAINT IF EXISTS predictions_puntaje_estimado_check;

ALTER TABLE predictions
    ADD CONSTRAINT predictions_puntaje_estimado_check
    CHECK (puntaje_estimado >= 0 AND puntaje_estimado <= 300);

COMMENT ON COLUMN predictions.puntaje_estimado IS
  'Puntaje global estimado en el Saber Pro (modelo v2). Escala 0-300: suma de las tres areas de 100.';

