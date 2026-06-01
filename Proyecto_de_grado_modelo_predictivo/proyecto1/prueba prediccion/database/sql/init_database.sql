-- =============================================================================
-- BASE DE DATOS: Sistema Predictor de Resultados Saber Pro
-- Descripcion: Sistema para predecir resultados de pruebas Saber Pro
--              para estudiantes de Ingenieria de Sistemas e Industrial
-- Autor: Sistema Predictor
-- Fecha: 2026-05-26
-- =============================================================================

-- =============================================================================
-- TABLA: usuarios
-- Descripcion: Usuarios del sistema predictor
-- =============================================================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- ELIMINAR TABLAS EXISTENTES (en orden inverso de dependencias)
-- =============================================================================
DROP TABLE IF EXISTS resultados_saber_pro CASCADE;
DROP TABLE IF EXISTS notas CASCADE;
DROP TABLE IF EXISTS asignaturas CASCADE;
DROP TABLE IF EXISTS estudiantes CASCADE;

-- =============================================================================
-- TABLA: estudiantes
-- Descripcion: Almacena la informacion personal y academica de los estudiantes
-- =============================================================================
CREATE TABLE estudiantes (
    id SERIAL PRIMARY KEY,
    documento VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    genero VARCHAR(1) CHECK (genero IN ('M', 'F')),
    fecha_nacimiento DATE,
    estrato INTEGER CHECK (estrato BETWEEN 1 AND 6),
    programa VARCHAR(50) NOT NULL CHECK (programa IN ('Ingenieria de Sistemas', 'Ingenieria Industrial')),
    semestre_actual INTEGER CHECK (semestre_actual BETWEEN 1 AND 10),
    fecha_ingreso DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indices para la tabla estudiantes
CREATE INDEX idx_estudiantes_documento ON estudiantes(documento);
CREATE INDEX idx_estudiantes_programa ON estudiantes(programa);
CREATE INDEX idx_estudiantes_semestre ON estudiantes(semestre_actual);

-- =============================================================================
-- TABLA: asignaturas
-- Descripcion: Catalogo de asignaturas por programa academico
--              Incluye informacion de creditos, area y semestre al que pertenece
-- =============================================================================
CREATE TABLE asignaturas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    creditos INTEGER NOT NULL,
    area VARCHAR(50) NOT NULL CHECK (area IN ('basicas', 'ingenieria', 'formacion')),
    semestre INTEGER NOT NULL CHECK (semestre BETWEEN 1 AND 10),
    programa VARCHAR(50) NOT NULL CHECK (programa IN ('Ingenieria de Sistemas', 'Ingenieria Industrial'))
);

-- Indices para la tabla asignaturas
CREATE INDEX idx_asignaturas_codigo ON asignaturas(codigo);
CREATE INDEX idx_asignaturas_programa ON asignaturas(programa);
CREATE INDEX idx_asignaturas_semestre ON asignaturas(semestre);
CREATE INDEX idx_asignaturas_area ON asignaturas(area);

-- =============================================================================
-- TABLA: notas
-- Descripcion: Registro de calificaciones de estudiantes por asignatura
-- =============================================================================
CREATE TABLE notas (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    asignatura_id INTEGER NOT NULL REFERENCES asignaturas(id) ON DELETE CASCADE,
    nota DECIMAL(4,2) CHECK (nota BETWEEN 0 AND 5),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('aprobada', 'reprobada', 'cursando')),
    periodo VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(estudiante_id, asignatura_id, periodo)
);

-- Indices para la tabla notas
CREATE INDEX idx_notas_estudiante ON notas(estudiante_id);
CREATE INDEX idx_notas_asignatura ON notas(asignatura_id);
CREATE INDEX idx_notas_periodo ON notas(periodo);
CREATE INDEX idx_notas_estado ON notas(estado);

-- =============================================================================
-- TABLA: resultados_saber_pro
-- Descripcion: Almacena las predicciones de resultados Saber Pro
-- =============================================================================
CREATE TABLE resultados_saber_pro (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    resultado VARCHAR(10) NOT NULL CHECK (resultado IN ('Bajo', 'Medio', 'Alto')),
    probabilidad DECIMAL(5,4) CHECK (probabilidad BETWEEN 0 AND 1),
    periodo VARCHAR(10) NOT NULL,
    fecha_prediccion TIMESTAMP DEFAULT NOW()
);

-- Indices para la tabla resultados_saber_pro
CREATE INDEX idx_resultados_estudiante ON resultados_saber_pro(estudiante_id);
CREATE INDEX idx_resultados_periodo ON resultados_saber_pro(periodo);
CREATE INDEX idx_resultados_resultado ON resultados_saber_pro(resultado);

-- =============================================================================
-- DATOS INICIALES: Asignaturas de Ingenieria de Sistemas
-- Programa: 10 semestres, 170 creditos
-- =============================================================================

-- SEMESTRE 1
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('MAT1001', 'Calculo I', 4, 'basicas', 1, 'Ingenieria de Sistemas'),
('MAT1002', 'Algebra Lineal', 3, 'basicas', 1, 'Ingenieria de Sistemas'),
('FIS1001', 'Fisica I', 4, 'basicas', 1, 'Ingenieria de Sistemas'),
('INF1001', 'Introduccion a la Programacion', 4, 'ingenieria', 1, 'Ingenieria de Sistemas'),
('LIN1001', 'Algebra y Calculo', 3, 'basicas', 1, 'Ingenieria de Sistemas'),
('HUM1001', 'Catedra Universitaria', 2, 'formacion', 1, 'Ingenieria de Sistemas'),
('HUM1002', 'Comunicacion y Escritura', 3, 'formacion', 1, 'Ingenieria de Sistemas');

-- SEMESTRE 2
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('MAT1003', 'Calculo II', 4, 'basicas', 2, 'Ingenieria de Sistemas'),
('FIS1002', 'Fisica II', 4, 'basicas', 2, 'Ingenieria de Sistemas'),
('INF1002', 'Programacion Orientada a Objetos', 4, 'ingenieria', 2, 'Ingenieria de Sistemas'),
('INF1003', 'Estructuras de Datos', 4, 'ingenieria', 2, 'Ingenieria de Sistemas'),
('MAT1004', 'Matematicas Discretas', 3, 'basicas', 2, 'Ingenieria de Sistemas'),
('HUM1003', 'Sociedad y Cultura', 2, 'formacion', 2, 'Ingenieria de Sistemas');

-- SEMESTRE 3
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('MAT2001', 'Calculo III', 4, 'basicas', 3, 'Ingenieria de Sistemas'),
('INF2001', 'Algoritmos y Complejidad', 4, 'ingenieria', 3, 'Ingenieria de Sistemas'),
('INF2002', 'Arquitectura de Computadores', 4, 'ingenieria', 3, 'Ingenieria de Sistemas'),
('INF2003', 'Sistemas Operativos', 4, 'ingenieria', 3, 'Ingenieria de Sistemas'),
('MAT2002', 'Ecuaciones Diferenciales', 3, 'basicas', 3, 'Ingenieria de Sistemas'),
('HUM2001', 'Etica y Profesionalismo', 2, 'formacion', 3, 'Ingenieria de Sistemas');

-- SEMESTRE 4
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('MAT2003', 'Estadistica y Probabilidad', 4, 'basicas', 4, 'Ingenieria de Sistemas'),
('INF2004', 'Teoria de Lenguajes', 3, 'ingenieria', 4, 'Ingenieria de Sistemas'),
('INF2005', 'Ingenieria de Software I', 4, 'ingenieria', 4, 'Ingenieria de Sistemas'),
('INF2006', 'Redes de Computadores', 4, 'ingenieria', 4, 'Ingenieria de Sistemas'),
('INF2007', 'Base de Datos I', 4, 'ingenieria', 4, 'Ingenieria de Sistemas'),
('HUM2002', 'Proyecto Comunitario', 2, 'formacion', 4, 'Ingenieria de Sistemas');

-- SEMESTRE 5
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('MAT3001', 'Metodos Numericos', 3, 'basicas', 5, 'Ingenieria de Sistemas'),
('INF3001', 'Ingenieria de Software II', 4, 'ingenieria', 5, 'Ingenieria de Sistemas'),
('INF3002', 'Base de Datos II', 3, 'ingenieria', 5, 'Ingenieria de Sistemas'),
('INF3003', 'Redes y Comunicaciones', 4, 'ingenieria', 5, 'Ingenieria de Sistemas'),
('INF3004', 'Inteligencia Artificial', 4, 'ingenieria', 5, 'Ingenieria de Sistemas'),
('ING3001', 'Investigacion de Operaciones', 3, 'ingenieria', 5, 'Ingenieria de Sistemas');

-- SEMESTRE 6
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('INF3005', 'Computacion Grafica', 3, 'ingenieria', 6, 'Ingenieria de Sistemas'),
('INF3006', 'Ingenieria de Software III', 4, 'ingenieria', 6, 'Ingenieria de Sistemas'),
('INF3007', 'Sistemas Distribuidos', 4, 'ingenieria', 6, 'Ingenieria de Sistemas'),
('INF3008', 'Seguridad Informatica', 3, 'ingenieria', 6, 'Ingenieria de Sistemas'),
('INF3009', 'Machine Learning', 4, 'ingenieria', 6, 'Ingenieria de Sistemas'),
('ING3002', 'Economia para Ingenieros', 3, 'ingenieria', 6, 'Ingenieria de Sistemas');

-- SEMESTRE 7
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('INF4001', 'Arquitectura de Software', 4, 'ingenieria', 7, 'Ingenieria de Sistemas'),
('INF4002', 'Desarrollo Web Avanzado', 4, 'ingenieria', 7, 'Ingenieria de Sistemas'),
('INF4003', 'Gestion de Proyectos', 3, 'ingenieria', 7, 'Ingenieria de Sistemas'),
('INF4004', 'Optativa I', 3, 'ingenieria', 7, 'Ingenieria de Sistemas'),
('INF4005', 'Optativa II', 3, 'ingenieria', 7, 'Ingenieria de Sistemas'),
('HUM3001', 'Electiva Sociohumanistica', 2, 'formacion', 7, 'Ingenieria de Sistemas');

-- SEMESTRE 8
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('INF4006', 'Sistemas de Informacion', 4, 'ingenieria', 8, 'Ingenieria de Sistemas'),
('INF4007', 'Optativa III', 3, 'ingenieria', 8, 'Ingenieria de Sistemas'),
('INF4008', 'Optativa IV', 3, 'ingenieria', 8, 'Ingenieria de Sistemas'),
('INF4009', 'Proyecto de Grado I', 4, 'ingenieria', 8, 'Ingenieria de Sistemas'),
('ING3003', 'Gerencia y Emprendimiento', 3, 'ingenieria', 8, 'Ingenieria de Sistemas');

-- SEMESTRE 9
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('INF5001', 'Optativa V', 3, 'ingenieria', 9, 'Ingenieria de Sistemas'),
('INF5002', 'Optativa VI', 3, 'ingenieria', 9, 'Ingenieria de Sistemas'),
('INF5003', 'Proyecto de Grado II', 6, 'ingenieria', 9, 'Ingenieria de Sistemas'),
('ING3004', 'Practica Profesional', 12, 'ingenieria', 9, 'Ingenieria de Sistemas');

-- SEMESTRE 10
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('INF5004', 'Auditoria Informatica', 3, 'ingenieria', 10, 'Ingenieria de Sistemas'),
('INF5005', 'Impacto Ambiental', 2, 'ingenieria', 10, 'Ingenieria de Sistemas'),
('INF5006', 'Trabajo de Grado', 12, 'ingenieria', 10, 'Ingenieria de Sistemas');

-- =============================================================================
-- DATOS INICIALES: Asignaturas de Ingenieria Industrial
-- Programa: 9 semestres, 156 creditos
-- =============================================================================

-- SEMESTRE 1
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND1001', 'Calculo I', 4, 'basicas', 1, 'Ingenieria Industrial'),
('IND1002', 'Algebra y Trigonometria', 3, 'basicas', 1, 'Ingenieria Industrial'),
('IND1003', 'Fisica I', 4, 'basicas', 1, 'Ingenieria Industrial'),
('IND1004', 'Quimica General', 3, 'basicas', 1, 'Ingenieria Industrial'),
('IND1005', 'Dibujo Tecnico', 2, 'ingenieria', 1, 'Ingenieria Industrial'),
('IND1006', 'Catedra Industrial', 2, 'formacion', 1, 'Ingenieria Industrial'),
('IND1007', 'Comunicacion Empresarial', 3, 'formacion', 1, 'Ingenieria Industrial');

-- SEMESTRE 2
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND1008', 'Calculo II', 4, 'basicas', 2, 'Ingenieria Industrial'),
('IND1009', 'Fisica II', 4, 'basicas', 2, 'Ingenieria Industrial'),
('IND1010', 'Algebra Lineal', 3, 'basicas', 2, 'Ingenieria Industrial'),
('IND1011', 'Programacion para Ingenieros', 3, 'ingenieria', 2, 'Ingenieria Industrial'),
('IND1012', 'Estadistica Descriptiva', 3, 'basicas', 2, 'Ingenieria Industrial'),
('IND1013', 'Procesos Administrativos', 3, 'formacion', 2, 'Ingenieria Industrial');

-- SEMESTRE 3
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND2001', 'Calculo III', 4, 'basicas', 3, 'Ingenieria Industrial'),
('IND2002', 'Fisica III', 4, 'basicas', 3, 'Ingenieria Industrial'),
('IND2003', 'Ecuaciones Diferenciales', 3, 'basicas', 3, 'Ingenieria Industrial'),
('IND2004', 'Estadistica Inferencial', 4, 'basicas', 3, 'Ingenieria Industrial'),
('IND2005', 'Ciencia de Materiales', 3, 'ingenieria', 3, 'Ingenieria Industrial'),
('IND2006', 'Gestion Empresarial', 3, 'formacion', 3, 'Ingenieria Industrial');

-- SEMESTRE 4
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND2007', 'Termodinamica', 4, 'ingenieria', 4, 'Ingenieria Industrial'),
('IND2008', 'Mecanica de Fluidos', 4, 'ingenieria', 4, 'Ingenieria Industrial'),
('IND2009', 'Investigacion de Operaciones I', 4, 'ingenieria', 4, 'Ingenieria Industrial'),
('IND2010', 'Economia para Ingenieros', 3, 'ingenieria', 4, 'Ingenieria Industrial'),
('IND2011', 'Electrotecnia', 3, 'ingenieria', 4, 'Ingenieria Industrial'),
('IND2012', 'Etica Profesional', 2, 'formacion', 4, 'Ingenieria Industrial');

-- SEMESTRE 5
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND3001', 'Investigacion de Operaciones II', 4, 'ingenieria', 5, 'Ingenieria Industrial'),
('IND3002', 'Procesos de Manufactura', 4, 'ingenieria', 5, 'Ingenieria Industrial'),
('IND3003', 'Gestion de la Produccion', 4, 'ingenieria', 5, 'Ingenieria Industrial'),
('IND3004', 'Gestion de Calidad', 3, 'ingenieria', 5, 'Ingenieria Industrial'),
('IND3005', 'Metrologia Industrial', 3, 'ingenieria', 5, 'Ingenieria Industrial'),
('IND3006', 'Seguridad Industrial', 2, 'ingenieria', 5, 'Ingenieria Industrial');

-- SEMESTRE 6
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND3007', 'Gestion de Inventarios', 3, 'ingenieria', 6, 'Ingenieria Industrial'),
('IND3008', 'Logistica y Cadena de Suministros', 4, 'ingenieria', 6, 'Ingenieria Industrial'),
('IND3009', 'Ingenieria de Metodos', 4, 'ingenieria', 6, 'Ingenieria Industrial'),
('IND3010', 'Simulacion de Sistemas', 3, 'ingenieria', 6, 'Ingenieria Industrial'),
('IND3011', 'Diseño de Plantas', 4, 'ingenieria', 6, 'Ingenieria Industrial'),
('IND3012', 'Legislacion Industrial', 2, 'formacion', 6, 'Ingenieria Industrial');

-- SEMESTRE 7
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND4001', 'Gestion de Proyectos', 4, 'ingenieria', 7, 'Ingenieria Industrial'),
('IND4002', 'Mantenimiento Industrial', 3, 'ingenieria', 7, 'Ingenieria Industrial'),
('IND4003', 'Ingenieria Economica', 4, 'ingenieria', 7, 'Ingenieria Industrial'),
('IND4004', 'Optativa I', 3, 'ingenieria', 7, 'Ingenieria Industrial'),
('IND4005', 'Optativa II', 3, 'ingenieria', 7, 'Ingenieria Industrial'),
('IND4006', 'Electiva Sociohumanistica', 2, 'formacion', 7, 'Ingenieria Industrial');

-- SEMESTRE 8
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND4007', 'Direccion y Liderazgo', 3, 'ingenieria', 8, 'Ingenieria Industrial'),
('IND4008', 'Gerencia de Operaciones', 4, 'ingenieria', 8, 'Ingenieria Industrial'),
('IND4009', 'Optativa III', 3, 'ingenieria', 8, 'Ingenieria Industrial'),
('IND4010', 'Optativa IV', 3, 'ingenieria', 8, 'Ingenieria Industrial'),
('IND4011', 'Proyecto de Grado I', 6, 'ingenieria', 8, 'Ingenieria Industrial');

-- SEMESTRE 9
INSERT INTO asignaturas (codigo, nombre, creditos, area, semestre, programa) VALUES
('IND5001', 'Optativa V', 3, 'ingenieria', 9, 'Ingenieria Industrial'),
('IND5002', 'Optativa VI', 3, 'ingenieria', 9, 'Ingenieria Industrial'),
('IND5003', 'Proyecto de Grado II', 6, 'ingenieria', 9, 'Ingenieria Industrial'),
('IND5004', 'Practica Profesional', 14, 'ingenieria', 9, 'Ingenieria Industrial');

-- =============================================================================
-- MENSAJE DE CONFIRMACION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Base de datos inicializada correctamente';
    RAISE NOTICE 'Tablas creadas: estudiantes, asignaturas, notas, resultados_saber_pro';
    RAISE NOTICE 'Asignaturas cargadas: %', (SELECT COUNT(*) FROM asignaturas);
END $$;
