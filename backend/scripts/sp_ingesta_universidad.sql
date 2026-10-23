-- =====================================================================
-- Stored Procedures de ingesta del roster de la UNIVERSIDAD (UNAC)
-- =====================================================================
--
-- PROPOSITO
--   Permitir que los estudiantes que ingresan en el futuro se carguen
--   automaticamente desde la API de la universidad, sin rehacer el
--   import manual por CSV.
--
--   La cadena queda asi:
--
--     API de la UNAC  --(curl)-->  sp_sincronizar_desde_api()
--                                   |
--                                   v
--                            sp_ingestar_roster(jsonb)
--                                   |
--                    +--------------+--------------+
--                    v                             v
--             public.usuarios            public.student_profiles
--             (cuenta de acceso)          (perfil academico)
--
--   Y despues, para la prediccion:  POST /api/admin/recompute-predictions
--   (el modelo ML vive en FastAPI, no se puede ejecutar desde SQL).
--
-- REQUISITOS
--   - PostgreSQL 12+ (usa jsonb, gen_random_uuid no es necesario).
--   - Extension pgcrypto: genera el hash bcrypt de la contrasena
--     institucional (= numero de documento). El hash resultante ($2a$10$)
--     es compatible con bcryptjs, que es lo que usa el backend.
--   - curl en el PATH del servidor (Windows y Linux). Solo lo necesita
--     sp_sincronizar_desde_api(); el resto del archivo es SQL puro.
--   - Permisos: superusuario, o los roles pg_execute_server_program y
--     pg_write_server_files para las partes que usan COPY ... PROGRAM/TO.
--
-- COMO SE USA
--   1) El ingeniero configura la API (una sola vez, editando la tabla
--      ingesta_roster_config) y ajusta el mapeo de campos si su JSON
--      usa nombres distintos a los del export actual.
--   2) Se ejecuta:  SELECT * FROM sp_sincronizar_desde_api();
--   3) Se generan las predicciones:
--        curl -X POST http://localhost:4000/api/admin/recompute-predictions
--             -H "Authorization: Bearer <token de administrador>"
--
-- IDEMPOTENCIA
--   Todo el proceso es idempotente: se puede ejecutar tantas veces como
--   se quiera. Un estudiante que ya existe se ACTUALIZA (nunca se
--   duplica), identificado por su numero de documento. La contrasena
--   institucional NO se toca en las actualizaciones: si el estudiante la
--   cambio por su cuenta, se respeta.
--
-- APLICACION
--   psql -h localhost -U postgres -d saberpro -f backend/scripts/sp_ingesta_universidad.sql
--
--   El archivo es idempotente: se puede correr varias veces sin error.
-- =====================================================================


-- =====================================================================
-- 0. EXTENSION para el hash bcrypt de la contrasena institucional
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =====================================================================
-- 1. CONFIGURACION
-- =====================================================================

-- Configuracion singleton (id = 1). El ingeniero edita esta tabla en
-- pgAdmin para conectar la API: no hace falta tocar codigo.
CREATE TABLE IF NOT EXISTS ingesta_roster_config (
    id                SMALLINT     PRIMARY KEY DEFAULT 1,
    api_url           TEXT,
    api_metodo        TEXT         NOT NULL DEFAULT 'GET',
    api_headers       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    api_cuerpo        JSONB,
    api_ruta_datos    TEXT         NOT NULL DEFAULT 'data',
    api_timeout       INTEGER      NOT NULL DEFAULT 30,
    api_param_pagina  TEXT,
    api_param_limite  TEXT,
    api_max_paginas   INTEGER      NOT NULL DEFAULT 1,
    api_archivo       TEXT         NOT NULL DEFAULT 'ingesta_curl_args.txt',
    crear_cuentas     BOOLEAN      NOT NULL DEFAULT TRUE,
    registrar_en_dataset BOOLEAN   NOT NULL DEFAULT FALSE,
    ultima_sync       TIMESTAMP,
    CONSTRAINT ingesta_roster_config_unico CHECK (id = 1),
    CONSTRAINT ingesta_roster_config_metodo CHECK (api_metodo IN ('GET','POST','PUT')),
    CONSTRAINT ingesta_roster_config_timeout CHECK (api_timeout BETWEEN 1 AND 300),
    CONSTRAINT ingesta_roster_config_paginas CHECK (api_max_paginas BETWEEN 1 AND 1000)
);

COMMENT ON TABLE ingesta_roster_config IS
  'Configuracion de la API de la universidad para la ingesta del roster. Editar la fila id=1.';
COMMENT ON COLUMN ingesta_roster_config.api_ruta_datos IS
  'Ruta del array de estudiantes dentro del JSON de respuesta. Ej: "data", "resultados.items". Vacio si la respuesta ES el array.';
COMMENT ON COLUMN ingesta_roster_config.api_param_pagina IS
  'Nombre del parametro de paginacion. Si se define, se agrega a la URL y se itera api_max_paginas veces. En la URL se puede usar el marcador {{pagina}}.';
COMMENT ON COLUMN ingesta_roster_config.api_archivo IS
  'Nombre del archivo temporal donde se escriben los argumentos de curl. Solo letras, numeros, punto, guion y guion bajo (max 64). Es un nombre de archivo, nunca una ruta: el comando que ejecuta el servidor es "curl -sS -K <archivo>" y el nombre se valida para que no pueda inyectar comandos.';

-- Fila de configuracion por defecto (id = 1). El ingeniero solo tiene que
-- rellenar api_url con la URL real de la API de la universidad y, si su JSON
-- no usa la ruta "data", corregir api_ruta_datos.
--
-- Si la fila ya existe no se toca: las edits del ingeniero no se pisan al
-- reaplicar el archivo.
INSERT INTO ingesta_roster_config (id, api_metodo, api_ruta_datos, api_archivo)
VALUES (1, 'GET', 'data', 'ingesta_curl_args.txt')
ON CONFLICT (id) DO NOTHING;

-- Mapeo: campo del JSON de la API -> campo logico del sistema.
-- El engineer ajusta esta tabla si su API usa nombres distintos.
CREATE TABLE IF NOT EXISTS ingesta_roster_mapeo (
    campo_api    TEXT        PRIMARY KEY,
    columna_dest TEXT        NOT NULL,
    tipo         TEXT        NOT NULL DEFAULT 'texto',
    activo       BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT ingesta_roster_mapeo_tipo CHECK (tipo IN ('texto','entero','decimal','booleano','ingles','estrato')),
    CONSTRAINT ingesta_roster_mapeo_dest CHECK (columna_dest IN (
        'identificacion','correo','nombres','carnet',
        'edad','semestre','horas_estudio_semana','nivel_ingles',
        'promedio_acumulado','promedio_basicas','promedio_ingenieria',
        'promedio_programacion','promedio_matematica_estadistica',
        'num_reprobadas','pct_creditos','estrato',
        'acceso_internet','acceso_pc','trabaja','genero','ciudad',
        'simulacros_realizados','asistencia_pct',
        'creditos_aprobados','asignaturas_aprobadas',
        'anio_presentacion_saber_pro'
    ))
);

-- Varias filas pueden apuntar al mismo campo logico (por ejemplo el
-- nombre del export y su equivalente en camelCase). Cuando llega el dato
-- se usa el que exista en el JSON; si existen varios, gana el primero por
-- orden alfabetico, asi que el resultado es determinista.
--
-- Migracion: en versiones anteriores columna_dest era UNIQUE, lo que
-- impedia registrar alias. Se suelta la restriccion.
ALTER TABLE ingesta_roster_mapeo DROP CONSTRAINT IF EXISTS ingesta_roster_mapeo_columna_dest_key;

CREATE UNIQUE INDEX IF NOT EXISTS ingesta_roster_mapeo_dest_campo
    ON ingesta_roster_mapeo (columna_dest, campo_api);

COMMENT ON TABLE ingesta_roster_mapeo IS
  'Mapeo entre el nombre del campo en el JSON de la API y el campo logico del sistema. Varias filas pueden apuntar al mismo campo logico (alias).';

-- Mapeo por defecto: los nombres del export actual de la universidad
-- (los del CSV base-de-datos-para-proyecto-de-grado-Ing-_1_.csv).
INSERT INTO ingesta_roster_mapeo (campo_api, columna_dest, tipo) VALUES
  ('IDENTIFICACION',                      'identificacion',                   'texto'),
  ('CORREO',                              'correo',                           'texto'),
  ('NOMBRES',                             'nombres',                          'texto'),
  ('CARNET',                              'carnet',                           'texto'),
  ('EDAD',                                'edad',                             'entero'),
  ('SEMESTRE_ACTUAL',                     'semestre',                         'entero'),
  ('PROMEDIO_ACUMULADO',                  'promedio_acumulado',               'decimal'),
  ('PROMEDIO_MATERIAS_BASICAS',           'promedio_basicas',                 'decimal'),
  ('PROMEDIO_PROGRAMACION',               'promedio_programacion',            'decimal'),
  ('PROMEDIO_MATEMATICA_ESTADISTICA',     'promedio_matematica_estadistica',  'decimal'),
  ('ASIGNATURAS_REPROBADAS',              'num_reprobadas',                   'entero'),
  ('PORCENTAJE_AVANCE',                   'pct_creditos',                     'decimal'),
  ('ESTRATO',                             'estrato',                          'estrato'),
  ('CONDICION_LABORAL',                   'trabaja',                          'booleano'),
  ('GENERO',                              'genero',                           'texto'),
  ('CIUDAD_RESIDENCIA_ACTUAL',            'ciudad',                           'texto'),
  ('PROMEDIO_INGLES',                     'nivel_ingles',                     'ingles'),
  ('CREDITOS_APROBADOS',                  'creditos_aprobados',               'entero'),
  ('ASIGNATURAS_APROBADAS',               'asignaturas_aprobadas',            'entero'),
  ('ANIO_PRESENTACION_SABER_PRO',         'anio_presentacion_saber_pro',      'entero'),
  -- Alias en camelCase / snake_case por si la API usa esa convencion.
  ('identificacion',                      'identificacion',                   'texto'),
  ('correo',                              'correo',                           'texto'),
  ('nombres',                             'nombres',                          'texto'),
  ('edad',                                'edad',                             'entero'),
  ('semestre',                            'semestre',                         'entero'),
  ('promedio_acumulado',                  'promedio_acumulado',               'decimal'),
  ('promedio_basicas',                    'promedio_basicas',                 'decimal'),
  ('promedio_programacion',               'promedio_programacion',            'decimal'),
  ('promedio_matematica_estadistica',     'promedio_matematica_estadistica',  'decimal'),
  ('asignaturas_reprobadas',              'num_reprobadas',                   'entero'),
  ('porcentaje_avance',                   'pct_creditos',                     'decimal'),
  ('estrato',                             'estrato',                          'estrato'),
  ('condicion_laboral',                   'trabaja',                          'booleano'),
  ('genero',                              'genero',                           'texto'),
  ('nivel_ingles',                        'nivel_ingles',                     'ingles'),
  ('promedio_ingles',                     'nivel_ingles',                     'ingles')
ON CONFLICT (campo_api) DO NOTHING;


-- =====================================================================
-- 2. HELPERS de extraccion y normalizacion
-- =====================================================================

-- Valor crudo de un campo del JSON, segun el mapeo configurado.
CREATE OR REPLACE FUNCTION fn_ingesta_texto(p_datos jsonb, p_campo text)
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(btrim(coalesce(p_datos ->> m.campo_api, '')), '')
  FROM ingesta_roster_mapeo m
  WHERE m.columna_dest = p_campo AND m.activo
  ORDER BY (p_datos ? m.campo_api) DESC NULLS LAST, m.campo_api
  LIMIT 1
$$;

-- Numero: acepta "3.5", "3,5", "3.5%" y trata "NULL"/""/guion como nulo.
CREATE OR REPLACE FUNCTION fn_ingesta_numero(p_datos jsonb, p_campo text)
RETURNS numeric
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN fn_ingesta_texto(p_datos, p_campo) IS NULL THEN NULL
    WHEN fn_ingesta_texto(p_datos, p_campo) ~ '^-?[0-9]+([.,][0-9]+)?\s*%?$'
      THEN round(replace(replace(fn_ingesta_texto(p_datos, p_campo), ',', '.'), '%', '')::numeric, 3)
    ELSE NULL
  END
$$;

-- Entero: acepta "3" y extrae el numero final de textos como "ESTRATO 3".
CREATE OR REPLACE FUNCTION fn_ingesta_entero(p_datos jsonb, p_campo text)
RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN fn_ingesta_texto(p_datos, p_campo) IS NULL THEN NULL
    WHEN fn_ingesta_texto(p_datos, p_campo) ~ '^-?[0-9]+$'
      THEN fn_ingesta_texto(p_datos, p_campo)::integer
    WHEN fn_ingesta_texto(p_datos, p_campo) ~ '[0-9]+$'
      THEN (regexp_match(fn_ingesta_texto(p_datos, p_campo), '([0-9]+)$'))[1]::integer
    ELSE NULL
  END
$$;

-- Booleano: "Si"/"Sí"/"Yes"/"true"/"1" -> true; "No"/"false"/"0" -> false.
CREATE OR REPLACE FUNCTION fn_ingesta_booleano(p_datos jsonb, p_campo text)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT CASE lower(replace(fn_ingesta_texto(p_datos, p_campo), 'í', 'i'))
    WHEN 'si'   THEN true
    WHEN 'yes'  THEN true
    WHEN 'true' THEN true
    WHEN '1'    THEN true
    WHEN 'no'   THEN false
    WHEN 'false' THEN false
    WHEN '0'    THEN false
    ELSE NULL
  END
$$;

-- Nivel de ingles: acepta la escala 1-7 del export actual o el nivel
-- MCER ya listo (A1..C2). El 0 significa "sin dato" (no es A1).
CREATE OR REPLACE FUNCTION fn_ingesta_ingles(p_datos jsonb, p_campo text)
RETURNS varchar(4)
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN fn_ingesta_texto(p_datos, p_campo) IS NULL THEN NULL
    WHEN upper(fn_ingesta_texto(p_datos, p_campo)) IN ('A1','A2','B1','B2','C1','C2')
      THEN upper(fn_ingesta_texto(p_datos, p_campo))
    WHEN fn_ingesta_texto(p_datos, p_campo) ~ '^[0-9]+$'
      THEN CASE fn_ingesta_texto(p_datos, p_campo)::int
        WHEN 1 THEN 'A1' WHEN 2 THEN 'A2' WHEN 3 THEN 'B1'
        WHEN 4 THEN 'B2' WHEN 5 THEN 'C1' WHEN 6 THEN 'C2' WHEN 7 THEN 'C2'
        ELSE NULL END
    ELSE NULL
  END
$$;

-- Extrae un valor del JSON siguiendo una ruta con puntos ("data.items").
CREATE OR REPLACE FUNCTION fn_ingesta_extraer(p_doc jsonb, p_ruta text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  partes text[];
  actual jsonb := p_doc;
  i integer;
BEGIN
  IF p_ruta IS NULL OR btrim(p_ruta) = '' THEN
    RETURN p_doc;
  END IF;
  partes := string_to_array(btrim(p_ruta), '.');
  FOR i IN 1..coalesce(array_length(partes, 1), 0) LOOP
    IF actual IS NULL OR jsonb_typeof(actual) <> 'object' THEN
      RETURN NULL;
    END IF;
    actual := actual -> partes[i];
  END LOOP;
  RETURN actual;
END
$$;


-- =====================================================================
-- 3. SP PRINCIPAL: ingesta del roster
-- =====================================================================
--
--   sp_ingestar_roster(p_registros jsonb)
--     p_registros: array JSON con un objeto por estudiante. Cada objeto
--                  usa las claves segun la tabla ingesta_roster_mapeo.
--
--   Es idempotente: por numero de documento.
--   No toca la contrasena institucional en las actualizaciones.
-- =====================================================================
CREATE OR REPLACE FUNCTION sp_ingestar_roster(p_registros jsonb)
RETURNS TABLE (
    insertados    integer,
    actualizados  integer,
    omitidos      integer,
    rechazados    integer,
    detalle       jsonb
)
LANGUAGE plpgsql AS $$
DECLARE
    v_total      integer := 0;
    v_insertados integer := 0;
    v_actualizados integer := 0;
    v_omitidos   integer := 0;
    v_rechazados integer := 0;
    v_detalle    jsonb := '[]'::jsonb;
    v_crear      boolean;
    v_registrar_dataset boolean;
    v_ya_existia integer;
BEGIN
    IF p_registros IS NULL THEN
        RAISE EXCEPTION 'sp_ingestar_roster: el payload es NULL';
    END IF;

    IF jsonb_typeof(p_registros) = 'object' THEN
        -- Si llega un objeto, se busca el primer array que contenga.
        SELECT v.arr INTO p_registros
        FROM jsonb_each(p_registros) v(k, arr)
        WHERE jsonb_typeof(v.arr) = 'array'
        LIMIT 1;
    END IF;

    IF p_registros IS NULL OR jsonb_typeof(p_registros) <> 'array' THEN
        RAISE EXCEPTION 'sp_ingestar_roster: el payload no es un array JSON (revisa api_ruta_datos)';
    END IF;

    SELECT coalesce(c.crear_cuentas, true), coalesce(c.registrar_en_dataset, false)
      INTO v_crear, v_registrar_dataset
      FROM ingesta_roster_config c WHERE c.id = 1;

    -- ---------------------------------------------------------------
    -- 3.1 Area de trabajo: normalizar cada registro.
    -- ---------------------------------------------------------------
    CREATE TEMP TABLE IF NOT EXISTS tmp_ingesta_roster (
        fila serial,
        nombres text, identificacion text, correo text, carnet text,
        edad integer, semestre integer, horas_estudio_semana integer,
        nivel_ingles varchar(4),
        promedio_acumulado numeric(3,2),
        promedio_basicas numeric(3,2),
        promedio_ingenieria numeric(3,2),
        promedio_programacion numeric(3,2),
        promedio_matematica_estadistica numeric(3,2),
        num_reprobadas integer,
        pct_creditos numeric(5,2),
        estrato integer,
        acceso_internet boolean, acceso_pc boolean, trabaja boolean,
        genero char(1), ciudad text,
        simulacros_realizados integer, asistencia_pct numeric(5,2),
        creditos_aprobados integer, asignaturas_aprobadas integer,
        anio_presentacion_saber_pro integer,
        ok boolean, motivo text
    ) ON COMMIT DROP;
    TRUNCATE tmp_ingesta_roster;

    INSERT INTO tmp_ingesta_roster (
        nombres, identificacion, correo, carnet,
        edad, semestre, horas_estudio_semana, nivel_ingles,
        promedio_acumulado, promedio_basicas, promedio_programacion,
        promedio_matematica_estadistica, num_reprobadas, pct_creditos,
        estrato, acceso_internet, acceso_pc, trabaja, genero, ciudad,
        simulacros_realizados, asistencia_pct,
        creditos_aprobados, asignaturas_aprobadas, anio_presentacion_saber_pro)
    SELECT
        left(fn_ingesta_texto(r.datos, 'nombres'), 120),
        fn_ingesta_texto(r.datos, 'identificacion'),
        lower(fn_ingesta_texto(r.datos, 'correo')),
        left(fn_ingesta_texto(r.datos, 'carnet'), 20),
        -- rangos identicos a los del import por CSV
        CASE WHEN fn_ingesta_entero(r.datos,'edad') BETWEEN 14 AND 80
             THEN fn_ingesta_entero(r.datos,'edad') END,
        CASE WHEN fn_ingesta_entero(r.datos,'semestre') BETWEEN 1 AND 12
             THEN fn_ingesta_entero(r.datos,'semestre') END,
        coalesce(fn_ingesta_entero(r.datos,'horas_estudio_semana'), 8),
        fn_ingesta_ingles(r.datos, 'nivel_ingles'),
        CASE WHEN fn_ingesta_numero(r.datos,'promedio_acumulado') BETWEEN 0 AND 5
             THEN round(fn_ingesta_numero(r.datos,'promedio_acumulado'), 2) END,
        CASE WHEN fn_ingesta_numero(r.datos,'promedio_basicas') BETWEEN 0 AND 5
             THEN round(fn_ingesta_numero(r.datos,'promedio_basicas'), 2) END,
        CASE WHEN fn_ingesta_numero(r.datos,'promedio_programacion') BETWEEN 0 AND 5
             THEN round(fn_ingesta_numero(r.datos,'promedio_programacion'), 2) END,
        CASE WHEN fn_ingesta_numero(r.datos,'promedio_matematica_estadistica') BETWEEN 0 AND 5
             THEN round(fn_ingesta_numero(r.datos,'promedio_matematica_estadistica'), 2) END,
        CASE WHEN fn_ingesta_entero(r.datos,'num_reprobadas') BETWEEN 0 AND 50
             THEN fn_ingesta_entero(r.datos,'num_reprobadas') END,
        CASE WHEN fn_ingesta_numero(r.datos,'pct_creditos') BETWEEN 0 AND 100
             THEN round(fn_ingesta_numero(r.datos,'pct_creditos'), 2) END,
        CASE WHEN fn_ingesta_entero(r.datos,'estrato') BETWEEN 1 AND 6
             THEN fn_ingesta_entero(r.datos,'estrato') END,
        coalesce(fn_ingesta_booleano(r.datos,'acceso_internet'), true),
        coalesce(fn_ingesta_booleano(r.datos,'acceso_pc'), true),
        fn_ingesta_booleano(r.datos,'trabaja'),
        CASE WHEN upper(coalesce(fn_ingesta_texto(r.datos,'genero'),'')) IN ('M','F','O')
             THEN upper(fn_ingesta_texto(r.datos,'genero')) END,
        left(fn_ingesta_texto(r.datos,'ciudad'), 60),
        coalesce(fn_ingesta_entero(r.datos,'simulacros_realizados'), 0),
        coalesce(fn_ingesta_numero(r.datos,'asistencia_pct'), 85),
        CASE WHEN fn_ingesta_entero(r.datos,'creditos_aprobados') BETWEEN 0 AND 300
             THEN fn_ingesta_entero(r.datos,'creditos_aprobados') END,
        CASE WHEN fn_ingesta_entero(r.datos,'asignaturas_aprobadas') BETWEEN 0 AND 80
             THEN fn_ingesta_entero(r.datos,'asignaturas_aprobadas') END,
        CASE WHEN fn_ingesta_entero(r.datos,'anio_presentacion_saber_pro') BETWEEN 1900 AND 2100
             THEN fn_ingesta_entero(r.datos,'anio_presentacion_saber_pro') END
    FROM jsonb_array_elements(p_registros) AS r(datos);

    -- promedio_ingenieria: si la API no lo manda, se deriva como el
    -- promedio de programacion y matematica/estadistica (igual que el
    -- import por CSV, porque en el export de la universidad no existe).
    UPDATE tmp_ingesta_roster
       SET promedio_ingenieria = round(
             (coalesce(promedio_programacion,0) + coalesce(promedio_matematica_estadistica,0))
             / nullif((CASE WHEN promedio_programacion IS NOT NULL THEN 1 ELSE 0 END
                     + CASE WHEN promedio_matematica_estadistica IS NOT NULL THEN 1 ELSE 0 END), 0), 2)
     WHERE promedio_ingenieria IS NULL
       AND (promedio_programacion IS NOT NULL OR promedio_matematica_estadistica IS NOT NULL);

    -- Validacion: documento y correo son obligatorios y deben tener forma
    -- valida. Sin documento no se puede crear la cuenta institucional.
    --
    -- `ok` arranca en NULL y aqui se resuelve a TRUE (valido) o FALSE (con
    -- motivo). Los dos CASE van separados porque `ok` es boolean y `motivo`
    -- es text: mezclar los tipos en un solo CASE rompe la sentencia.
    UPDATE tmp_ingesta_roster
       SET ok = CASE
             WHEN identificacion IS NULL THEN false
             WHEN identificacion !~ '^[0-9]{5,15}$' THEN false
             WHEN correo IS NULL THEN false
             WHEN correo !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN false
             ELSE true
         END,
           motivo = CASE
             WHEN identificacion IS NULL THEN 'sin numero de documento'
             WHEN identificacion !~ '^[0-9]{5,15}$' THEN 'documento con formato invalido: ' || identificacion
             WHEN correo IS NULL THEN 'sin correo'
             WHEN correo !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN 'correo con formato invalido: ' || correo
             ELSE NULL
         END
     WHERE ok IS DISTINCT FROM false;

    -- El correo es la clave de acceso del estudiante y es UNIQUE: si ya
    -- pertenece a OTRO documento, no se puede crear la cuenta.
    UPDATE tmp_ingesta_roster t
       SET ok = false,
           motivo = 'el correo ya pertenece a otro documento'
      FROM usuarios u
     WHERE t.ok IS DISTINCT FROM false
       AND lower(u.email) = t.correo
       AND u.documento <> t.identificacion;

    -- Una cuenta institucional (rector, decano, administrador) NO se puede
    -- tomar por un estudiante. Si el documento ya existe con un rol distinto
    -- de 'estudiante', el registro se rechaza: de lo contrario el ON CONFLICT
    -- de la seccion 3.2 reescribiria el correo de un administrador y el
    -- estudiante podria quedarse con su identidad.
    UPDATE tmp_ingesta_roster t
       SET ok = false,
           motivo = 'el documento ya pertenece a una cuenta institucional (rol ' || u.role || ')'
      FROM usuarios u
     WHERE t.ok IS DISTINCT FROM false
       AND u.documento = t.identificacion
       AND u.role <> 'estudiante';

    -- Duplicados dentro del mismo payload: el mismo documento o el mismo
    -- correo dos veces haria fallar el INSERT por violacion de unicidad, asi
    -- que se rechaza la segunda aparicion y se conserva la primera.
    WITH dup AS (
        SELECT fila, identificacion,
               row_number() OVER (PARTITION BY identificacion ORDER BY fila) AS rn_doc,
               row_number() OVER (PARTITION BY correo        ORDER BY fila) AS rn_correo
          FROM tmp_ingesta_roster
         WHERE ok IS NOT false
    )
    UPDATE tmp_ingesta_roster t
       SET ok = false,
           motivo = CASE
                     WHEN dup.rn_doc > 1 THEN 'documento duplicado en el mismo payload'
                     WHEN dup.rn_correo > 1 THEN 'correo duplicado en el mismo payload'
                   END
      FROM dup
     WHERE t.fila = dup.fila
       AND (dup.rn_doc > 1 OR dup.rn_correo > 1);

    SELECT count(*) INTO v_total FROM tmp_ingesta_roster;
    SELECT count(*) INTO v_rechazados FROM tmp_ingesta_roster WHERE ok = false;

    IF v_rechazados > 0 THEN
        SELECT jsonb_agg(jsonb_build_object(
                   'identificacion', t.identificacion,
                   'correo', t.correo,
                   'motivo', t.motivo) ORDER BY t.fila)
          INTO v_detalle
          FROM tmp_ingesta_roster t WHERE t.ok = false;
    END IF;

    -- ---------------------------------------------------------------
    -- 3.2 Cuenta de acceso (public.usuarios).
    --     La contrasena institucional es el numero de documento. En las
    --     actualizaciones NO se regenera el hash: si el estudiante la
    --     cambio, se respeta.
    -- ---------------------------------------------------------------
    IF v_crear THEN
        WITH ins AS (
            INSERT INTO usuarios (
                documento, username, email, password_hash, role, program,
                age, semester, study_hours, english_level, is_active, is_synthetic)
            SELECT t.identificacion,
                   coalesce(nullif(t.nombres, ''), t.identificacion),
                   t.correo,
                   crypt(t.identificacion, gen_salt('bf', 10)),
                   'estudiante', 'sistemas',
                   t.edad, t.semestre, t.horas_estudio_semana, t.nivel_ingles,
                   true, false
            FROM tmp_ingesta_roster t
            WHERE t.ok IS NOT false
            ON CONFLICT (documento) DO UPDATE
                SET username       = EXCLUDED.username,
                    email          = EXCLUDED.email,
                    age            = EXCLUDED.age,
                    semester       = EXCLUDED.semester,
                    study_hours    = EXCLUDED.study_hours,
                    english_level  = EXCLUDED.english_level,
                    updated_at     = NOW()
                -- Defensa en profundidad: aunque la validacion de la seccion
                -- 3.1 ya rechaza los documentos que pertenecen a una cuenta
                -- institucional, aqui solo se actualizan filas que son
                -- estudiantes. Una cuenta de rector, decano o administrador
                -- jamas se reescribe desde la ingesta.
                WHERE usuarios.role = 'estudiante'
            RETURNING (xmax = 0) AS fue_insertado
        )
        SELECT count(*) FILTER (WHERE fue_insertado),
               count(*) FILTER (WHERE NOT fue_insertado)
          INTO v_insertados, v_actualizados
          FROM ins;
    END IF;

    -- ---------------------------------------------------------------
    -- 3.3 Perfil academico (public.student_profiles).
    -- ---------------------------------------------------------------
    IF v_crear THEN
        INSERT INTO student_profiles (
            user_id, promedio_acumulado, promedio_basicas, promedio_ingenieria,
            promedio_programacion, promedio_matematica_estadistica,
            num_reprobadas, pct_creditos, semestre, estrato,
            acceso_internet, acceso_pc, trabaja, genero, edad, ciudad,
            horas_estudio_semana, nivel_ingles, simulacros_realizados,
            asistencia_pct, creditos_aprobados, asignaturas_aprobadas, completed)
        SELECT u.id, t.promedio_acumulado, t.promedio_basicas, t.promedio_ingenieria,
               t.promedio_programacion, t.promedio_matematica_estadistica,
               t.num_reprobadas, t.pct_creditos, t.semestre, t.estrato,
               t.acceso_internet, t.acceso_pc, t.trabaja, t.genero, t.edad, t.ciudad,
               t.horas_estudio_semana, t.nivel_ingles, t.simulacros_realizados,
               t.asistencia_pct, t.creditos_aprobados, t.asignaturas_aprobadas, true
        FROM tmp_ingesta_roster t
        JOIN usuarios u ON u.documento = t.identificacion
        WHERE t.ok IS NOT false
        ON CONFLICT (user_id) DO UPDATE
            SET promedio_acumulado = EXCLUDED.promedio_acumulado,
                promedio_basicas = EXCLUDED.promedio_basicas,
                promedio_ingenieria = EXCLUDED.promedio_ingenieria,
                promedio_programacion = EXCLUDED.promedio_programacion,
                promedio_matematica_estadistica = EXCLUDED.promedio_matematica_estadistica,
                num_reprobadas = EXCLUDED.num_reprobadas,
                pct_creditos = EXCLUDED.pct_creditos,
                semestre = EXCLUDED.semestre,
                estrato = EXCLUDED.estrato,
                acceso_internet = EXCLUDED.acceso_internet,
                acceso_pc = EXCLUDED.acceso_pc,
                trabaja = EXCLUDED.trabaja,
                genero = EXCLUDED.genero,
                edad = EXCLUDED.edad,
                ciudad = EXCLUDED.ciudad,
                horas_estudio_semana = EXCLUDED.horas_estudio_semana,
                nivel_ingles = EXCLUDED.nivel_ingles,
                simulacros_realizados = EXCLUDED.simulacros_realizados,
                asistencia_pct = EXCLUDED.asistencia_pct,
                creditos_aprobados = EXCLUDED.creditos_aprobados,
                asignaturas_aprobadas = EXCLUDED.asignaturas_aprobadas,
                completed = true,
                updated_at = NOW();
    END IF;

    -- ---------------------------------------------------------------
    -- 3.4 Opcional: dejar el roster tambien en el dataset de
    --     entrenamiento (dataset_saber_pro_real). Por defecto NO: ese
    --     dataset tiene un tamaño documentado (736 filas) que se usa en
    --     el trabajo de grado. Si se activa, las filas nuevas quedan
    --     marcadas con fuente_dato = 'api-universidad'.
    -- ---------------------------------------------------------------
    IF v_registrar_dataset THEN
        -- Indice unico (no parcial): las filas actuales del dataset tienen
        -- identificacion NULL y en un indice unico los NULL son distintos
        -- entre si, asi que no se rompen. Se usa indice y no constraint
        -- porque ON CONFLICT necesita inferir un indice, no un parcial.
        EXECUTE $ddl$
            CREATE UNIQUE INDEX IF NOT EXISTS idx_dataset_real_identificacion
                ON dataset_saber_pro_real (identificacion)
        $ddl$;

        INSERT INTO dataset_saber_pro_real (
            fila_csv, semestre_actual, porcentaje_avance, promedio_acumulado,
            promedio_materias_basicas, promedio_programacion,
            promedio_matematica_estadistica, promedio_ingenieria,
            creditos_aprobados, asignaturas_reprobadas, asignaturas_aprobadas,
            estrato, trabaja, genero, edad, ciudad_residencia_actual,
            acceso_internet, acceso_pc, horas_estudio_semana, asistencia_pct,
            promedio_ingles_nivel, nombres, identificacion, correo, carnet,
            fuente_dato)
        SELECT
            (SELECT coalesce(max(fila_csv), 0) FROM dataset_saber_pro_real)
              + row_number() OVER (),
            t.semestre, t.pct_creditos, t.promedio_acumulado,
            t.promedio_basicas, t.promedio_programacion,
            t.promedio_matematica_estadistica, t.promedio_ingenieria,
            t.creditos_aprobados, t.num_reprobadas, t.asignaturas_aprobadas,
            t.estrato, t.trabaja, t.genero, t.edad, t.ciudad,
            t.acceso_internet, t.acceso_pc, t.horas_estudio_semana, t.asistencia_pct,
            t.nivel_ingles, t.nombres, t.identificacion, t.correo, t.carnet,
            'api-universidad'
        FROM tmp_ingesta_roster t
        WHERE t.ok IS NOT false
          AND t.identificacion IS NOT NULL
        ON CONFLICT (identificacion) DO UPDATE
            SET semestre_actual = EXCLUDED.semestre_actual,
                porcentaje_avance = EXCLUDED.porcentaje_avance,
                promedio_acumulado = EXCLUDED.promedio_acumulado,
                promedio_materias_basicas = EXCLUDED.promedio_materias_basicas,
                promedio_programacion = EXCLUDED.promedio_programacion,
                promedio_matematica_estadistica = EXCLUDED.promedio_matematica_estadistica,
                promedio_ingenieria = EXCLUDED.promedio_ingenieria,
                creditos_aprobados = EXCLUDED.creditos_aprobados,
                asignaturas_reprobadas = EXCLUDED.asignaturas_reprobadas,
                asignaturas_aprobadas = EXCLUDED.asignaturas_aprobadas,
                estrato = EXCLUDED.estrato,
                trabaja = EXCLUDED.trabaja,
                genero = EXCLUDED.genero,
                edad = EXCLUDED.edad,
                ciudad_residencia_actual = EXCLUDED.ciudad_residencia_actual,
                promedio_ingles_nivel = EXCLUDED.promedio_ingles_nivel,
                nombres = EXCLUDED.nombres,
                correo = EXCLUDED.correo,
                carnet = EXCLUDED.carnet;
    END IF;

    -- Los que no se pudieron procesar por datos invalidos.
    -- `omitidos` deja el total cuadrado: insertados + actualizados + omitidos
    -- = total recibido. `rechazados` es el subconjunto con motivo de rechazo.
    v_omitidos := v_total - v_insertados - v_actualizados;

    RETURN QUERY SELECT v_insertados, v_actualizados, v_omitidos, v_rechazados, v_detalle;
END
$$;

COMMENT ON FUNCTION sp_ingestar_roster(jsonb) IS
  'Ingesta idempotente del roster: crea/actualiza usuarios y perfiles desde un array JSON. Devuelve el resumen de la operacion.';


-- =====================================================================
-- 4. SP DE SINCRONIZACION: descarga la API y llama a la ingesta
-- =====================================================================
--
--   sp_sincronizar_desde_api()
--
--   Descarga el roster de la API configurada en ingesta_roster_config y
--   lo ingesta. Soporta paginacion.
--
--   COMO FUNCIONA (por que usa un archivo y no la URL en la linea de
--   comandos): PostgreSQL ejecuta COPY ... PROGRAM a traves de cmd.exe en
--   Windows, donde "|" y "&" separan comandos y las comillas internas se
--   eliminan. Escribir los argumentos de curl en un archivo y pasar solo
--   el nombre del archivo con "curl -K" evita por completo esos problemas
--   y funciona igual en Linux.
--
--   El archivo se escribe en el directorio de datos del servidor (que es
--   tambien su directorio de trabajo), asi que el comando no lleva ruta.
-- =====================================================================
CREATE OR REPLACE FUNCTION sp_sincronizar_desde_api(
    p_url        text   DEFAULT NULL,
    p_metodo     text   DEFAULT NULL,
    p_headers    jsonb  DEFAULT NULL,
    p_ruta_datos text   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    c            ingesta_roster_config%ROWTYPE;
    v_url        text;
    v_url_base   text;
    v_metodo     text;
    v_headers    jsonb;
    v_ruta       text;
    v_timeout    integer;
    v_pagina     text;
    v_limite     text;
    v_max_pag    integer;
    v_archivo    text;
    v_dir        text;
    v_acc        jsonb := '[]'::jsonb;
    v_arr        jsonb;
    v_raw        text;
    v_pag        integer := 1;
    v_total_reg  integer := 0;
    v_resultado  jsonb;
    v_curl_ok    boolean;
BEGIN
    SELECT * INTO c FROM ingesta_roster_config WHERE id = 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'sp_sincronizar_desde_api: falta configurar ingesta_roster_config (fila id=1)';
    END IF;

    v_url     := coalesce(p_url, c.api_url);
    v_metodo  := coalesce(p_metodo, c.api_metodo, 'GET');
    v_headers := coalesce(p_headers, c.api_headers, '{}'::jsonb);
    v_ruta    := coalesce(p_ruta_datos, c.api_ruta_datos, 'data');
    v_timeout := coalesce(c.api_timeout, 30);
    v_pagina  := c.api_param_pagina;
    v_limite  := c.api_param_limite;
    v_max_pag := coalesce(c.api_max_paginas, 1);
    v_archivo := coalesce(c.api_archivo, 'ingesta_curl_args.txt');

    IF v_url IS NULL OR btrim(v_url) = '' THEN
        RAISE EXCEPTION 'sp_sincronizar_desde_api: falta configurar api_url en ingesta_roster_config';
    END IF;

    IF v_url !~ '^https?://' THEN
        RAISE EXCEPTION 'sp_sincronizar_desde_api: api_url debe empezar por http:// o https://';
    END IF;

    -- El archivo de argumentos se escribe en el directorio de datos, que es
    -- el directorio de trabajo del servidor (comportamiento del postmaster).
    v_dir := current_setting('data_directory');

    -- SEGURIDAD: el nombre del archivo se concatena en un comando de shell
    -- ("curl -sS -K <archivo>"). Se permite SOLO un conjunto de caracteres
    -- inocuo, para que ningun valor de configuracion pueda inyectar un
    -- comando. Cualquier otra cosa se rechaza con un error claro.
    IF v_archivo !~ '^[A-Za-z0-9._-]{1,64}$' THEN
        RAISE EXCEPTION 'sp_sincronizar_desde_api: api_archivo solo admite letras, numeros, punto, guion y guion bajo (max 64 caracteres). Valor recibido: %', v_archivo;
    END IF;

    -- La URL y las cabeceras se escriben en el archivo de argumentos de curl,
    -- no en la linea de comandos, pero un salto de linea allows injecting
    -- otra directiva de curl. Se rechazan los caracteres de control.
    IF v_url ~ '[\n\r\0]' THEN
        RAISE EXCEPTION 'sp_sincronizar_desde_api: api_url no puede contener saltos de linea ni caracteres de control';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_each_text(v_headers) h WHERE h.value ~ '[\n\r\0]') THEN
        RAISE EXCEPTION 'sp_sincronizar_desde_api: las cabeceras no pueden contener saltos de linea ni caracteres de control';
    END IF;

    -- ---------------------------------------------------------------
    -- Descarga paginada.
    -- ---------------------------------------------------------------
    -- Tablas temporales del intercambio con curl. Se crean una sola vez
    -- (fuera del bucle) y se vacian en cada iteracion.
    CREATE TEMP TABLE IF NOT EXISTS _curl_args (line text) ON COMMIT DROP;
    CREATE TEMP TABLE IF NOT EXISTS _curl_out (line text) ON COMMIT DROP;
    v_url_base := v_url;

    LOOP
        -- La URL se reconstruye en cada pagina desde la original: si se
        -- sustituyera en Site, la pagina 2 ya no tendria el marcador.
        v_url := v_url_base;
        IF v_pagina IS NOT NULL AND v_pagina <> '' THEN
            IF position('{{pagina}}' in v_url) > 0 THEN
                v_url := replace(v_url, '{{pagina}}', v_pag::text);
            ELSE
                v_url := v_url || case when position('?' in v_url) > 0 then '&' else '?' end
                                      || v_pagina || '=' || v_pag::text;
            END IF;
        END IF;
        IF v_limite IS NOT NULL AND v_limite <> '' AND position(v_limite || '=' in v_url) = 0 THEN
            v_url := v_url || case when position('?' in v_url) > 0 then '&' else '?' end
                                  || v_limite || '=500';
        END IF;

        -- Argumentos de curl, uno por linea, en el formato del archivo -K.
        TRUNCATE _curl_args;

        INSERT INTO _curl_args (line) VALUES ('url = "' || replace(v_url, '"', '') || '"');
        INSERT INTO _curl_args (line)
        SELECT 'header = "' || replace(h.key || ': ' || h.value, '"', '') || '"'
          FROM jsonb_each_text(v_headers) h(k, v)
         WHERE h.value IS NOT NULL AND h.value <> '';
        INSERT INTO _curl_args (line) VALUES
            ('silent'),
            ('show-error'),
            ('max-time = ' || v_timeout::text),
            ('retry = 2'),
            ('retry-delay = 2');
        IF v_metodo IN ('POST','PUT') AND c.api_cuerpo IS NOT NULL THEN
            INSERT INTO _curl_args (line)
            VALUES ('header = "Content-Type: application/json"'),
                   ('data = "' || replace(c.api_cuerpo::text, '"', '') || '"');
        END IF;

        -- El comando que ve el shell es unicamente:
        --     curl -sS -K <archivo>
        -- sin comillas, sin rutas y sin metacaracteres.
        EXECUTE format('COPY (SELECT line FROM _curl_args) TO %L',
                       v_dir || '/' || v_archivo);

        TRUNCATE _curl_out;
        v_curl_ok := true;
        BEGIN
            EXECUTE format('COPY _curl_out FROM PROGRAM %L',
                           'curl -sS -K ' || v_archivo);
        EXCEPTION WHEN OTHERS THEN
            v_curl_ok := false;
            v_raw := '';
        END;

        SELECT string_agg(line, E'\n') INTO v_raw FROM _curl_out;

        IF NOT v_curl_ok THEN
            RAISE EXCEPTION 'sp_sincronizar_desde_api: no se pudo ejecutar curl. Verifica que curl este en el PATH del servidor y que el usuario tenga permiso pg_execute_server_program.';
        END IF;

        IF v_raw IS NULL OR btrim(v_raw) = '' THEN
            -- Pagina sin contenido: se termino la paginacion.
            EXIT;
        END IF;

        BEGIN
            v_arr := fn_ingesta_extraer(v_raw::jsonb, v_ruta);
        EXCEPTION WHEN OTHERS THEN
            v_arr := NULL;
        END;

        IF v_arr IS NULL OR jsonb_typeof(v_arr) <> 'array' THEN
            IF v_pag = 1 THEN
                RAISE EXCEPTION 'sp_sincronizar_desde_api: no se encontro un array en la ruta "%" de la respuesta. Revisa api_ruta_datos. Respuesta recibida: %', v_ruta, left(v_raw, 300);
            END IF;
            EXIT;
        END IF;

        v_total_reg := v_total_reg + jsonb_array_length(v_arr);
        v_acc := v_acc || v_arr;

        EXIT WHEN v_pag >= v_max_pag;
        EXIT WHEN jsonb_array_length(v_arr) = 0;
        v_pag := v_pag + 1;
    END LOOP;

    -- Limpieza del archivo temporal de argumentos.
    BEGIN
        EXECUTE format('COPY (SELECT 1) TO PROGRAM %L', 'cmd /c del ' || v_archivo);
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            EXECUTE format('COPY (SELECT 1) TO PROGRAM %L', 'rm -f ' || v_archivo);
        EXCEPTION WHEN OTHERS THEN
            NULL;  -- si no se puede borrar, se sobrescribe en la proxima corrida.
        END;
    END;

    -- ---------------------------------------------------------------
    -- Ingesta.
    -- ---------------------------------------------------------------
    IF v_total_reg = 0 THEN
        RETURN jsonb_build_object(
            'ok', true,
            'mensaje', 'La API no devolvio estudiantes.',
            'descargados', 0,
            'ingesta', NULL);
    END IF;

    SELECT to_jsonb(r.*) INTO v_resultado
      FROM sp_ingestar_roster(v_acc) r;

    UPDATE ingesta_roster_config SET ultima_sync = NOW() WHERE id = 1;

    RETURN jsonb_build_object(
        'ok', true,
        'descargados', v_total_reg,
        'paginas', v_pag,
        'ingesta', v_resultado);
END
$$;

COMMENT ON FUNCTION sp_sincronizar_desde_api(text, text, jsonb, text) IS
  'Descarga el roster de la API de la universidad (configurada en ingesta_roster_config) y lo ingesta. Devuelve el resumen en JSON.';


-- =====================================================================
-- 5. SP DE CONSULTA
-- =====================================================================
--
--   sp_consultar_estudiantes(...)
--     Consulta la informacion de los estudiantes directamente en la base
--     de datos, con su ultima prediccion del modelo.
--
--   Parametros:
--     p_programa      'all' | 'sistemas' | 'industrial'  (NULL = todos)
--     p_semestre      filtro opcional
--     p_clase         'alto' | 'medio' | 'bajo' (NULL = todas)
--     p_busqueda      busca en nombre, correo o documento
--     p_solo_sin_datos  true = solo estudiantes sin historial academico
--     p_limite        maximo de filas (NULL = sin limite)
-- =====================================================================
CREATE OR REPLACE FUNCTION sp_consultar_estudiantes(
    p_programa       text    DEFAULT NULL,
    p_semestre       integer DEFAULT NULL,
    p_clase          text    DEFAULT NULL,
    p_busqueda       text    DEFAULT NULL,
    p_solo_sin_datos boolean DEFAULT FALSE,
    p_limite         integer DEFAULT NULL
)
RETURNS TABLE (
    id                integer,
    documento         varchar,
    nombres           varchar,
    correo            varchar,
    programa          varchar,
    semestre          integer,
    promedio_acumulado numeric,
    promedio_ingenieria numeric,
    num_reprobadas    integer,
    pct_creditos      numeric,
    nivel_ingles      varchar,
    clase             varchar,
    puntaje_estimado  integer,
    probabilidad       numeric,
    model_version     varchar,
    con_prediccion    boolean,
    updated_at        timestamp
)
LANGUAGE sql STABLE AS $$
    SELECT u.id,
           u.documento,
           u.username,
           u.email,
           u.program,
           sp.semestre,
           sp.promedio_acumulado,
           sp.promedio_ingenieria,
           sp.num_reprobadas,
           sp.pct_creditos,
           sp.nivel_ingles,
           p.clase,
           p.puntaje_estimado,
           p.probabilidad,
           p.model_version,
           (p.clase IS NOT NULL) AS con_prediccion,
           coalesce(sp.updated_at, u.updated_at)
    FROM usuarios u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    LEFT JOIN LATERAL (
        SELECT clase, puntaje_estimado, probabilidad, model_version
        FROM predictions
        WHERE user_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
    ) p ON TRUE
    WHERE u.role = 'estudiante'
      AND (p_programa IS NULL OR p_programa = 'all' OR u.program = p_programa)
      AND (p_semestre IS NULL OR sp.semestre = p_semestre)
      AND (p_clase IS NULL OR p.clase = p_clase)
      AND (p_busqueda IS NULL OR u.username ILIKE '%' || p_busqueda || '%'
                             OR u.email    ILIKE '%' || p_busqueda || '%'
                             OR u.documento ILIKE '%' || p_busqueda || '%')
      AND (NOT p_solo_sin_datos OR p.clase IS NULL)
    ORDER BY p.puntaje_estimado DESC NULLS LAST, u.username
    LIMIT CASE WHEN p_limite IS NULL THEN NULL ELSE greatest(p_limite, 0) END
$$;

COMMENT ON FUNCTION sp_consultar_estudiantes(text, integer, text, text, boolean, integer) IS
  'Consulta la cohorte de estudiantes con su ultima prediccion del modelo, directamente en SQL.';


-- =====================================================================
-- 6. VISTA DE CONVENIENCIA: estado de la ingesta
-- =====================================================================
CREATE OR REPLACE VIEW v_ingesta_roster_estado AS
SELECT
    (SELECT count(*) FROM ingesta_roster_mapeo WHERE activo)                        AS campos_mapeados,
    (SELECT count(*) FROM public.usuarios WHERE role = 'estudiante')                 AS estudiantes,
    (SELECT count(*) FROM public.student_profiles WHERE completed)                  AS con_perfil,
    (SELECT count(DISTINCT p.user_id) FROM public.predictions p
       JOIN public.student_profiles sp ON sp.user_id = p.user_id)                   AS con_prediccion,
    (SELECT count(*) FROM public.student_profiles sp
       WHERE sp.completed AND coalesce(sp.promedio_acumulado, 0) <= 0)              AS sin_datos_academicos,
    (SELECT api_url FROM ingesta_roster_config WHERE id = 1)                        AS api_url,
    (SELECT ultima_sync FROM ingesta_roster_config WHERE id = 1)                    AS ultima_sync;
