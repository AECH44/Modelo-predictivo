"""
Consultas SQL para el Sistema Predictor Saber Pro
Base de datos: PostgreSQL
Tabla principal: resultados_saber_pro
"""

# ============================================
# INSERCIONES
# ============================================

INSERT_PREDICTION = """
INSERT INTO resultados_saber_pro (
    documento,
    promedio_acumulado,
    promedio_basicas,
    promedio_ingenieria,
    num_reprobadas,
    pct_creditos,
    semestre,
    estrato,
    genero,
    resultado,
    probabilidad,
    confidence_pct,
    recomendacion,
    model_version,
    created_at
) VALUES (
    :documento,
    :promedio_acumulado,
    :promedio_basicas,
    :promedio_ingenieria,
    :num_reprobadas,
    :pct_creditos,
    :semestre,
    :estrato,
    :genero,
    :resultado,
    :probabilidad,
    :confidence_pct,
    :recomendacion,
    :model_version,
    NOW()
)
RETURNING id;
"""

# ============================================
# SELECCIONES
# ============================================

SELECT_PREDICTION_BY_ID = """
SELECT
    id,
    documento,
    promedio_acumulado,
    promedio_basicas,
    promedio_ingenieria,
    num_reprobadas,
    pct_creditos,
    semestre,
    estrato,
    genero,
    resultado,
    probabilidad,
    confidence_pct,
    recomendacion,
    model_version,
    created_at
FROM resultados_saber_pro
WHERE id = :id;
"""

SELECT_PREDICTIONS_BY_STUDENT = """
SELECT
    id,
    documento,
    promedio_acumulado,
    promedio_basicas,
    promedio_ingenieria,
    num_reprobadas,
    pct_creditos,
    semestre,
    estrato,
    genero,
    resultado,
    probabilidad,
    confidence_pct,
    recomendacion,
    model_version,
    created_at
FROM resultados_saber_pro
WHERE documento = :documento
ORDER BY created_at DESC
LIMIT :limit;
"""

SELECT_ALL_PREDICTIONS = """
SELECT
    id,
    documento,
    promedio_acumulado,
    promedio_basicas,
    promedio_ingenieria,
    num_reprobadas,
    pct_creditos,
    semestre,
    estrato,
    genero,
    resultado,
    probabilidad,
    confidence_pct,
    recomendacion,
    model_version,
    created_at
FROM resultados_saber_pro
ORDER BY created_at DESC
LIMIT :limit;
"""

SELECT_STATISTICS = """
SELECT
    resultado,
    COUNT(*) as total,
    AVG(confidence_pct) as avg_confidence,
    AVG(probabilidad) as avg_probability
FROM resultados_saber_pro
GROUP BY resultado;
"""

SELECT_STATISTICS_BY_DOCUMENT = """
SELECT
    documento,
    COUNT(*) as total_predictions,
    AVG(confidence_pct) as avg_confidence,
    AVG(probabilidad) as avg_probability,
    MAX(resultado) as last_result
FROM resultados_saber_pro
GROUP BY documento
ORDER BY total_predictions DESC
LIMIT :limit;
"""

SELECT_STATISTICS_BY_SEMESTRE = """
SELECT
    semestre,
    COUNT(*) as total,
    AVG(confidence_pct) as avg_confidence,
    AVG(promedio_acumulado) as avg_promedio,
    AVG(promedio_basicas) as avg_basicas,
    AVG(promedio_ingenieria) as avg_ingenieria
FROM resultados_saber_pro
GROUP BY semestre
ORDER BY semestre;
"""

SELECT_RECENT_PREDICTIONS = """
SELECT
    id,
    documento,
    resultado,
    probabilidad,
    confidence_pct,
    created_at
FROM resultados_saber_pro
ORDER BY created_at DESC
LIMIT :limit;
"""

# ============================================
# ACTUALIZACIONES
# ============================================

UPDATE_PREDICTION = """
UPDATE resultados_saber_pro
SET
    promedio_acumulado = :promedio_acumulado,
    promedio_basicas = :promedio_basicas,
    promedio_ingenieria = :promedio_ingenieria,
    num_reprobadas = :num_reprobadas,
    pct_creditos = :pct_creditos,
    semestre = :semestre,
    estrato = :estrato,
    genero = :genero,
    resultado = :resultado,
    probabilidad = :probabilidad,
    confidence_pct = :confidence_pct,
    recomendacion = :recomendacion
WHERE id = :id;
"""

# ============================================
# ELIMINACIONES
# ============================================

DELETE_PREDICTION = """
DELETE FROM resultados_saber_pro
WHERE id = :id;
"""

DELETE_OLD_PREDICTIONS = """
DELETE FROM resultados_saber_pro
WHERE created_at < NOW() - INTERVAL ':days days';
"""

DELETE_BY_DOCUMENT = """
DELETE FROM resultados_saber_pro
WHERE documento = :documento;
"""

# ============================================
# SCHEMA - Para crear la tabla
# ============================================

CREATE_TABLE_SCHEMA = """
CREATE TABLE IF NOT EXISTS resultados_saber_pro (
    id SERIAL PRIMARY KEY,
    documento VARCHAR(20) NOT NULL,
    promedio_acumulado DECIMAL(3,2) NOT NULL,
    promedio_basicas DECIMAL(3,2) NOT NULL,
    promedio_ingenieria DECIMAL(3,2) NOT NULL,
    num_reprobadas INTEGER NOT NULL,
    pct_creditos DECIMAL(5,2) NOT NULL,
    semestre INTEGER NOT NULL,
    estrato INTEGER NOT NULL,
    genero CHAR(1) NOT NULL,
    resultado VARCHAR(10) NOT NULL,
    probabilidad DECIMAL(5,4) NOT NULL,
    confidence_pct DECIMAL(5,2) NOT NULL,
    recomendacion TEXT,
    model_version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda por documento
CREATE INDEX IF NOT EXISTS idx_resultados_documento ON resultados_saber_pro(documento);

-- Índice para búsqueda por fecha
CREATE INDEX IF NOT EXISTS idx_resultados_fecha ON resultados_saber_pro(created_at);

-- Índice para búsqueda por resultado
CREATE INDEX IF NOT EXISTS idx_resultados_resultado ON resultados_saber_pro(resultado);
"""
