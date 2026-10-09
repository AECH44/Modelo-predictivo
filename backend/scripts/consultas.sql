-- =====================================================================
-- CONSULTAS PARA VISUALIZAR EL DATASET REAL DE SABER PRO
-- Tabla: public.dataset_saber_pro_real (736 filas cargadas el 2026-09-17)
-- =====================================================================

-- 1) Resumen general: conteo + rangos de variables clave
SELECT
    COUNT(*)                                                     AS total_filas,
    MIN(fila_csv)                                                AS fila_min,
    MAX(fila_csv)                                                AS fila_max,
    COUNT(promedio_ingles_nivel)                                 AS con_nivel_ingles,
    COUNT(anio_presentacion_saber_pro)                           AS presentaron_saber_pro,
    COUNT(estrato)                                               AS con_estrato,
    ROUND(AVG(promedio_acumulado)::numeric, 2)                    AS promedio_acumulado_general,
    ROUND(AVG(promedio_ingenieria)::numeric, 2)                  AS promedio_ingenieria_general,
    MIN(edad)                                                    AS edad_min,
    MAX(edad)                                                    AS edad_max,
    ROUND(AVG(edad)::numeric, 1)                                 AS edad_promedio
FROM dataset_saber_pro_real;

-- 2) Distribucion por nivel de ingles (mapeo 1-7 -> A1-C2)
SELECT
    promedio_ingles_nivel                         AS nivel_mcer,
    COUNT(*)                                      AS n,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM dataset_saber_pro_real
GROUP BY promedio_ingles_nivel
ORDER BY promedio_ingles_nivel NULLS FIRST;

-- 3) Distribucion por estrato socioeconomico
SELECT
    estrato,
    COUNT(*)                                      AS n,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM dataset_saber_pro_real
WHERE estrato IS NOT NULL
GROUP BY estrato
ORDER BY estrato;

-- 4) Distribucion por genero
SELECT
    genero,
    COUNT(*)                                      AS n,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM dataset_saber_pro_real
WHERE genero IS NOT NULL
GROUP BY genero
ORDER BY genero;

-- 5) Distribucion por condicion laboral (trabaja si/no)
SELECT
    CASE WHEN trabaja THEN 'Si' ELSE 'No' END      AS trabaja,
    COUNT(*)                                       AS n,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM dataset_saber_pro_real
WHERE trabaja IS NOT NULL
GROUP BY trabaja;

-- 6) Estudiantes que presentaron Saber Pro (tienen anio valido)
SELECT
    anio_presentacion_saber_pro   AS anio,
    COUNT(*)                      AS n,
    ROUND(AVG(puntaje_global_saber11)::numeric, 1) AS promedio_global
FROM dataset_saber_pro_real
WHERE anio_presentacion_saber_pro IS NOT NULL
GROUP BY anio_presentacion_saber_pro
ORDER BY anio_presentacion_saber_pro;

-- 7) Cobertura de variables predictoras (cuantas filas tienen dato util)
SELECT
    'promedio_acumulado'           AS variable, COUNT(promedio_acumulado)            AS con_dato, COUNT(*) - COUNT(promedio_acumulado)            AS sin_dato FROM dataset_saber_pro_real
UNION ALL SELECT 'promedio_ingenieria',    COUNT(promedio_ingenieria),       COUNT(*)-COUNT(promedio_ingenieria)       FROM dataset_saber_pro_real
UNION ALL SELECT 'pct_creditos',           COUNT(porcentaje_avance),         COUNT(*)-COUNT(porcentaje_avance)         FROM dataset_saber_pro_real
UNION ALL SELECT 'semestre',               COUNT(semestre_actual),           COUNT(*)-COUNT(semestre_actual)           FROM dataset_saber_pro_real
UNION ALL SELECT 'estrato',                COUNT(estrato),                   COUNT(*)-COUNT(estrato)                   FROM dataset_saber_pro_real
UNION ALL SELECT 'horas_estudio_semana',   COUNT(horas_estudio_semana),      COUNT(*)-COUNT(horas_estudio_semana)      FROM dataset_saber_pro_real
UNION ALL SELECT 'simulacros_realizados',  COUNT(numero_simulacros_realizados), COUNT(*)-COUNT(numero_simulacros_realizados) FROM dataset_saber_pro_real
UNION ALL SELECT 'asistencia_pct',         COUNT(asistencia_pct),            COUNT(*)-COUNT(asistencia_pct)            FROM dataset_saber_pro_real
UNION ALL SELECT 'nivel_ingles',           COUNT(promedio_ingles_nivel),     COUNT(*)-COUNT(promedio_ingles_nivel)     FROM dataset_saber_pro_real
UNION ALL SELECT 'trabaja',                COUNT(trabaja),                   COUNT(*)-COUNT(trabaja)                   FROM dataset_saber_pro_real
UNION ALL SELECT 'edad',                   COUNT(edad),                      COUNT(*)-COUNT(edad)                      FROM dataset_saber_pro_real
ORDER BY sin_dato DESC;

-- 8) Top 20 por puntaje global Saber 11 (entre quienes lo presentaron)
SELECT
    fila_csv,
    semestre_actual,
    promedio_acumulado,
    promedio_ingenieria,
    puntaje_global_saber11,
    puntaje_matematicas_saber11,
    puntaje_lectura_critica_saber11,
    puntaje_ingles_saber11,
    promedio_ingles_nivel,
    genero,
    edad,
    estrato,
    trabaja
FROM dataset_saber_pro_real
WHERE puntaje_global_saber11 > 0
ORDER BY puntaje_global_saber11 DESC
LIMIT 20;

-- 9) Cobertura cruzada: cuantos tienen las 4 variables criticas del predictor
SELECT
    COUNT(*) FILTER (
        WHERE promedio_acumulado > 0
          AND promedio_ingenieria IS NOT NULL
          AND promedio_ingles_nivel IS NOT NULL
          AND estrato IS NOT NULL
    ) AS dataset_listo_para_predecir,
    COUNT(*) AS total
FROM dataset_saber_pro_real;

-- 10) (Bonus) Una fila aleatoria del dataset para inspeccion rapida
SELECT *
FROM dataset_saber_pro_real
ORDER BY random()
LIMIT 1;