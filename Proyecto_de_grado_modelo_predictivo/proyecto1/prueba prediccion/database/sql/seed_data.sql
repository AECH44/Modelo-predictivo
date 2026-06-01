-- ============================================
-- DATOS DE SEMILLA (SEED DATA)
-- ============================================

-- Limpiar datos previos (si existen)
TRUNCATE predictions CASCADE;
TRUNCATE students CASCADE;

-- ============================================
-- INSERTAR ESTUDIANTES DE PRUEBA
-- ============================================

INSERT INTO students (edad, promedio, horas_estudio, estrato, carrera, acceso_internet, semestre)
VALUES
-- Ingeniería de Sistemas
(22, 4.5, 30, 3, 'Ingeniería de Sistemas', TRUE, 7),
(20, 3.8, 20, 2, 'Ingeniería de Sistemas', TRUE, 4),
(23, 4.2, 25, 4, 'Ingeniería de Sistemas', TRUE, 8),
(19, 2.9, 15, 1, 'Ingeniería de Sistemas', FALSE, 2),
(24, 4.8, 35, 5, 'Ingeniería de Sistemas', TRUE, 9),

-- Administración
(21, 3.9, 18, 3, 'Administración', TRUE, 6),
(22, 3.5, 16, 2, 'Administración', TRUE, 5),
(20, 4.1, 22, 4, 'Administración', TRUE, 3),
(23, 2.8, 12, 1, 'Administración', FALSE, 7),
(25, 4.3, 28, 5, 'Administración', TRUE, 10),

-- Psicología
(21, 4.0, 21, 3, 'Psicología', TRUE, 5),
(22, 3.7, 19, 2, 'Psicología', TRUE, 6),
(20, 4.3, 26, 4, 'Psicología', TRUE, 4),
(23, 3.1, 14, 1, 'Psicología', FALSE, 8),
(24, 4.6, 32, 5, 'Psicología', TRUE, 9),

-- Medicina
(22, 4.7, 40, 4, 'Medicina', TRUE, 7),
(21, 4.4, 35, 3, 'Medicina', TRUE, 6),
(23, 4.5, 38, 5, 'Medicina', TRUE, 8),
(20, 3.9, 30, 2, 'Medicina', TRUE, 5);


-- ============================================
-- INSERTAR PREDICCIONES DE PRUEBA
-- ============================================

INSERT INTO predictions (student_id, categoria, probabilidad, recomendacion, model_version)
VALUES
-- Estudiante 1: Ingeniería, Promedio 4.5, Alto rendimiento esperado
(1, 'Alto', 0.92, 'Excelente desempeño esperado. Mantén tu nivel de estudio y considera ser tutor de otros estudiantes.', '1.0.0'),
(1, 'Alto', 0.89, 'Predicción consistente: continuarás con buen desempeño.', '1.0.0'),

-- Estudiante 2: Ingeniería, Promedio 3.8, Rendimiento Medio
(2, 'Medio', 0.78, 'Desempeño esperado medio. Incrementa a 25 horas de estudio semanales.', '1.0.0'),

-- Estudiante 3: Ingeniería, Promedio 4.2, Rendimiento Alto
(3, 'Alto', 0.85, 'Buen pronóstico. Mantén consistencia en horas de estudio.', '1.0.0'),

-- Estudiante 4: Ingeniería, Promedio 2.9, Rendimiento Bajo
(4, 'Bajo', 0.76, 'Desempeño bajo predicho. Busca apoyo académico urgentemente. Aumenta horas de estudio a 25/semana.', '1.0.0'),

-- Estudiante 5: Ingeniería, Promedio 4.8, Rendimiento Alto
(5, 'Alto', 0.95, 'Excelente predicción. Podrías ser monitor académico.', '1.0.0'),

-- Administración samples
(6, 'Medio', 0.81, 'Predicción media. Mantén dedicación actual.', '1.0.0'),
(7, 'Medio', 0.75, 'Rendimiento medio esperado. Refuerza matemáticas.', '1.0.0'),
(8, 'Alto', 0.88, 'Buen pronóstico de desempeño.', '1.0.0'),
(9, 'Bajo', 0.72, 'Bajo rendimiento predicho. Busca asesoría académica.', '1.0.0'),
(10, 'Alto', 0.90, 'Excelente pronóstico de desempeño.', '1.0.0'),

-- Psicología samples
(11, 'Medio', 0.82, 'Predicción media-alta. Buen desempeño esperado.', '1.0.0'),
(12, 'Medio', 0.77, 'Rendimiento medio esperado.', '1.0.0'),
(13, 'Alto', 0.87, 'Excelente predicción.', '1.0.0'),
(14, 'Bajo', 0.74, 'Bajo rendimiento predicho. Aumenta horas de estudio.', '1.0.0'),
(15, 'Alto', 0.93, 'Sobresaliente pronóstico.', '1.0.0'),

-- Medicina samples
(16, 'Alto', 0.94, 'Excelente desempeño esperado en Saber Pro.', '1.0.0'),
(17, 'Alto', 0.89, 'Buen pronóstico. Mantén dedicación.', '1.0.0'),
(18, 'Alto', 0.91, 'Excelente predicción de desempeño.', '1.0.0'),
(19, 'Medio', 0.80, 'Rendimiento medio esperado. Incrementa estudio.', '1.0.0');


-- ============================================
-- VERIFICAR DATOS INSERTADOS
-- ============================================

-- Ver resumen de estudiantes
SELECT '=== RESUMEN ESTUDIANTES ===' as info;
SELECT carrera, COUNT(*) as total, AVG(promedio) as promedio_promedio
FROM students
GROUP BY carrera
ORDER BY carrera;

-- Ver resumen de predicciones
SELECT '=== RESUMEN PREDICCIONES ===' as info;
SELECT categoria, COUNT(*) as total, ROUND(AVG(probabilidad)::numeric, 4) as confidence_promedio
FROM predictions
GROUP BY categoria
ORDER BY categoria;

-- Ver distribución por carrera y categoría
SELECT '=== DISTRIBUCION CARRERA-CATEGORÍA ===' as info;
SELECT s.carrera, p.categoria, COUNT(*) as total, ROUND(AVG(p.probabilidad)::numeric, 4) as avg_confidence
FROM students s
JOIN predictions p ON s.id = p.student_id
GROUP BY s.carrera, p.categoria
ORDER BY s.carrera, p.categoria;
