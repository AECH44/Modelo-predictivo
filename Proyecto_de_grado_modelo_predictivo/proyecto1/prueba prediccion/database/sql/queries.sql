-- ============================================
-- QUERIES ÚTILES PARA ANÁLISIS
-- ============================================

-- 1. OBTENER ÚLTIMO PROMEDIO DE UN ESTUDIANTE
-- ¿Cuál fue el desempeño predicho la última vez?

SELECT s.id, s.carrera, s.promedio, p.categoria, p.probabilidad, p.created_at
FROM students s
LEFT JOIN predictions p ON s.id = p.student_id
WHERE s.id = 1
ORDER BY p.created_at DESC
LIMIT 1;


-- 2. ESTADÍSTICAS GLOBALES

SELECT 
    COUNT(DISTINCT s.id) as total_estudiantes,
    COUNT(p.id) as total_predicciones,
    ROUND(AVG(p.probabilidad)::numeric, 4) as confianza_promedio,
    MIN(p.created_at) as primera_prediccion,
    MAX(p.created_at) as ultima_prediccion
FROM students s
LEFT JOIN predictions p ON s.id = p.student_id;


-- 3. DISTRIBUCIÓN DE CATEGORÍAS

SELECT categoria, COUNT(*) as total, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
FROM predictions
GROUP BY categoria
ORDER BY total DESC;


-- 4. PROMEDIO ACADÉMICO POR CATEGORÍA PREDICHA

SELECT 
    p.categoria,
    ROUND(AVG(s.promedio)::numeric, 2) as promedio_promedio,
    ROUND(AVG(p.probabilidad)::numeric, 4) as confianza_promedio,
    COUNT(DISTINCT s.id) as estudiantes
FROM students s
JOIN predictions p ON s.id = p.student_id
GROUP BY p.categoria
ORDER BY p.categoria;


-- 5. ESTUDIANTES CON BAJO RENDIMIENTO PREDICHO

SELECT s.id, s.carrera, s.promedio, s.horas_estudio, p.categoria, p.probabilidad
FROM students s
JOIN predictions p ON s.id = p.student_id
WHERE p.categoria = 'Bajo'
ORDER BY p.probabilidad DESC;


-- 6. MEJOR DESEMPEÑO POR CARRERA

SELECT 
    s.carrera,
    COUNT(DISTINCT s.id) as estudiantes,
    ROUND(AVG(s.promedio)::numeric, 2) as promedio_carrera,
    ROUND(AVG(s.horas_estudio)::numeric, 1) as horas_promedio,
    ROUND(AVG(p.probabilidad)::numeric, 4) as confianza_promedio
FROM students s
LEFT JOIN predictions p ON s.id = p.student_id
GROUP BY s.carrera
ORDER BY confianza_promedio DESC NULLS LAST;


-- 7. PREDICCIONES EN ÚLTIMOS 7 DÍAS

SELECT 
    DATE(created_at) as fecha,
    COUNT(*) as predicciones,
    ROUND(AVG(probabilidad)::numeric, 4) as confianza_promedio,
    STRING_AGG(DISTINCT categoria, ', ') as categorias
FROM predictions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;


-- 8. ESTUDIANTES SIN PREDICCIONES AÚN

SELECT s.id, s.carrera, s.promedio, s.semestre
FROM students s
LEFT JOIN predictions p ON s.id = p.student_id
WHERE p.id IS NULL;


-- 9. IMPACTO DE HORAS DE ESTUDIO EN PREDICCIÓN

SELECT 
    CASE
        WHEN s.horas_estudio < 15 THEN '< 15 horas'
        WHEN s.horas_estudio BETWEEN 15 AND 24 THEN '15-24 horas'
        WHEN s.horas_estudio > 24 THEN '> 24 horas'
    END as rango_horas,
    COUNT(*) as estudiantes,
    ROUND(AVG(s.promedio)::numeric, 2) as promedio_promedio,
    ROUND(AVG(p.probabilidad)::numeric, 4) as confianza,
    STRING_AGG(DISTINCT p.categoria, ', ') as categorias
FROM students s
JOIN predictions p ON s.id = p.student_id
GROUP BY rango_horas
ORDER BY rango_horas;


-- 10. ACCESO A INTERNET Y SU RELACIÓN CON PREDICCIONES

SELECT 
    s.acceso_internet,
    COUNT(DISTINCT s.id) as estudiantes,
    ROUND(AVG(s.promedio)::numeric, 2) as promedio_promedio,
    ROUND(AVG(p.probabilidad)::numeric, 4) as confianza_promedio,
    STRING_AGG(DISTINCT p.categoria, ', ') as categorias
FROM students s
JOIN predictions p ON s.id = p.student_id
GROUP BY s.acceso_internet;


-- 11. ESTUDIANTES DE MEJOR DESEMPEÑO

SELECT s.id, s.carrera, s.promedio, p.categoria, p.probabilidad, s.semestre
FROM students s
JOIN predictions p ON s.id = p.student_id
WHERE p.categoria = 'Alto'
ORDER BY p.probabilidad DESC, s.promedio DESC
LIMIT 10;


-- 12. HISTORIAL COMPLETO DE UN ESTUDIANTE

SELECT 
    p.id as pred_id,
    p.categoria,
    p.probabilidad,
    p.recomendacion,
    p.created_at,
    p.model_version
FROM predictions p
WHERE p.student_id = 1  -- Cambiar ID
ORDER BY p.created_at DESC;


-- 13. CONFIABILIDAD DEL MODELO POR CATEGORÍA

SELECT 
    categoria,
    COUNT(*) as total_predicciones,
    MIN(probabilidad) as confianza_minima,
    MAX(probabilidad) as confianza_maxima,
    ROUND(AVG(probabilidad)::numeric, 4) as confianza_promedio,
    ROUND(STDDEV(probabilidad)::numeric, 4) as desviacion_estandar
FROM predictions
GROUP BY categoria;


-- 14. COMPARAR MODELOS (si hay múltiples versiones)

SELECT 
    model_version,
    COUNT(*) as predicciones,
    ROUND(AVG(probabilidad)::numeric, 4) as confianza_promedio,
    STRING_AGG(DISTINCT categoria, ', ') as categorias
FROM predictions
GROUP BY model_version;


-- 15. CORRELACIÓN: ESTRATO Y RENDIMIENTO PREDICHO

SELECT 
    s.estrato,
    COUNT(DISTINCT s.id) as estudiantes,
    ROUND(AVG(s.promedio)::numeric, 2) as promedio_promedio,
    ROUND(AVG(p.probabilidad)::numeric, 4) as confianza,
    STRING_AGG(DISTINCT p.categoria, ', ') as categorias
FROM students s
JOIN predictions p ON s.id = p.student_id
GROUP BY s.estrato
ORDER BY s.estrato;


-- ============================================
-- QUERIES DE MANTENIMIENTO
-- ============================================

-- CONTAR REGISTROS POR TABLA

SELECT 'students' as tabla, COUNT(*) as registros FROM students
UNION ALL
SELECT 'predictions' as tabla, COUNT(*) as registros FROM predictions;


-- ELIMINAR PREDICCIONES ANTIGUAS (> 90 días)

-- DELETE FROM predictions WHERE created_at < NOW() - INTERVAL '90 days';


-- REORGANIZAR IDS (si es necesario)

-- ALTER SEQUENCE students_id_seq RESTART WITH 1;
-- ALTER SEQUENCE predictions_id_seq RESTART WITH 1;


-- ANÁLISIS DE TAMAÑO DE BD

SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
