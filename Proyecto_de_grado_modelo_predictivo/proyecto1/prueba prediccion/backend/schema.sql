-- ============================================
-- Script SQL para crear la base de datos
-- Sistema Predictor Saber Pro
-- ============================================

-- Crear base de datos (ejecutar como superusuario)
-- CREATE DATABASE saberpro_db;

-- Conectar a la base de datos
-- \c saberpro_db;

-- ============================================
-- TABLA PRINCIPAL: resultados_saber_pro
-- ============================================

CREATE TABLE IF NOT EXISTS resultados_saber_pro (
    id SERIAL PRIMARY KEY,
    documento VARCHAR(20) NOT NULL,
    promedio_acumulado DECIMAL(3,2) NOT NULL CHECK (promedio_acumulado >= 0 AND promedio_acumulado <= 5),
    promedio_basicas DECIMAL(3,2) NOT NULL CHECK (promedio_basicas >= 0 AND promedio_basicas <= 5),
    promedio_ingenieria DECIMAL(3,2) NOT NULL CHECK (promedio_ingenieria >= 0 AND promedio_ingenieria <= 5),
    num_reprobadas INTEGER NOT NULL CHECK (num_reprobadas >= 0 AND num_reprobadas <= 20),
    pct_creditos DECIMAL(5,2) NOT NULL CHECK (pct_creditos >= 0 AND pct_creditos <= 100),
    semestre INTEGER NOT NULL CHECK (semestre >= 1 AND semestre <= 10),
    estrato INTEGER NOT NULL CHECK (estrato >= 1 AND estrato <= 6),
    genero CHAR(1) NOT NULL CHECK (genero IN ('M', 'F')),
    resultado VARCHAR(10) NOT NULL CHECK (resultado IN ('Bajo', 'Medio', 'Alto')),
    probabilidad DECIMAL(5,4) NOT NULL CHECK (probabilidad >= 0 AND probabilidad <= 1),
    confidence_pct DECIMAL(5,2) NOT NULL CHECK (confidence_pct >= 0 AND confidence_pct <= 100),
    recomendacion TEXT,
    model_version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================

-- Índice para búsqueda por documento
CREATE INDEX IF NOT EXISTS idx_resultados_documento ON resultados_saber_pro(documento);

-- Índice para búsqueda por fecha
CREATE INDEX IF NOT EXISTS idx_resultados_fecha ON resultados_saber_pro(created_at);

-- Índice para búsqueda por resultado
CREATE INDEX IF NOT EXISTS idx_resultados_resultado ON resultados_saber_pro(resultado);

-- Índice para búsqueda por semestre
CREATE INDEX IF NOT EXISTS idx_resultados_semestre ON resultados_saber_pro(semestre);

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_resultados_doc_fecha ON resultados_saber_pro(documento, created_at DESC);

-- ============================================
-- COMENTARIOS EN LA TABLA
-- ============================================

COMMENT ON TABLE resultados_saber_pro IS 'Tabla principal para almacenar predicciones del sistema Saber Pro';
COMMENT ON COLUMN resultados_saber_pro.documento IS 'Número de documento de identidad del estudiante';
COMMENT ON COLUMN resultados_saber_pro.promedio_acumulado IS 'Promedio académico acumulado del estudiante (escala 0-5)';
COMMENT ON COLUMN resultados_saber_pro.promedio_basicas IS 'Promedio de materias básicas (escala 0-5)';
COMMENT ON COLUMN resultados_saber_pro.promedio_ingenieria IS 'Promedio de materias de ingeniería (escala 0-5)';
COMMENT ON COLUMN resultados_saber_pro.num_reprobadas IS 'Cantidad de materias reprobadas';
COMMENT ON COLUMN resultados_saber_pro.pct_creditos IS 'Porcentaje de créditos aprobados (0-100)';
COMMENT ON COLUMN resultados_saber_pro.semestre IS 'Semestre actual del estudiante (1-10)';
COMMENT ON COLUMN resultados_saber_pro.estrato IS 'Estrato socioeconómico (1-6)';
COMMENT ON COLUMN resultados_saber_pro.genero IS 'Género del estudiante (M/F)';
COMMENT ON COLUMN resultados_saber_pro.resultado IS 'Resultado de la predicción: Bajo, Medio o Alto';
COMMENT ON COLUMN resultados_saber_pro.probabilidad IS 'Probabilidad/confianza de la predicción (0-1)';
COMMENT ON COLUMN resultados_saber_pro.confidence_pct IS 'Porcentaje de confianza de la predicción (0-100)';
COMMENT ON COLUMN resultados_saber_pro.recomendacion IS 'Recomendaciones personalizadas generadas';
COMMENT ON COLUMN resultados_saber_pro.model_version IS 'Versión del modelo ML utilizado';
COMMENT ON COLUMN resultados_saber_pro.created_at IS 'Fecha y hora de la predicción';

-- ============================================
-- EJEMPLO DE DATOS DE PRUEBA
-- ============================================

-- INSERT INTO resultados_saber_pro (
--     documento, promedio_acumulado, promedio_basicas, promedio_ingenieria,
--     num_reprobadas, pct_creditos, semestre, estrato, genero,
--     resultado, probabilidad, confidence_pct, recomendacion
-- ) VALUES (
--     '12345678', 4.2, 4.0, 4.3, 2, 75.5, 6, 3, 'M',
--     'Alto', 0.87, 87.0, 'Excelente rendimiento esperado...'
-- );
