--
-- PostgreSQL database dump
--

\restrict RUn8hhwLFMRHRHHU1jKNrUz4cDAXrfjnzcY8IfavJxutbzJfSyMvJDaQFki8HIC

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-05-19 20:15:18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 7 (class 2615 OID 16390)
-- Name: academico; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA academico;


ALTER SCHEMA academico OWNER TO postgres;

--
-- TOC entry 11 (class 2615 OID 16394)
-- Name: configuracion; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA configuracion;


ALTER SCHEMA configuracion OWNER TO postgres;

--
-- TOC entry 10 (class 2615 OID 16393)
-- Name: logs; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA logs;


ALTER SCHEMA logs OWNER TO postgres;

--
-- TOC entry 8 (class 2615 OID 16391)
-- Name: modelo_ml; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA modelo_ml;


ALTER SCHEMA modelo_ml OWNER TO postgres;

--
-- TOC entry 9 (class 2615 OID 16392)
-- Name: reportes; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA reportes;


ALTER SCHEMA reportes OWNER TO postgres;

--
-- TOC entry 6 (class 2615 OID 16389)
-- Name: seguridad; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA seguridad;


ALTER SCHEMA seguridad OWNER TO postgres;

--
-- TOC entry 247 (class 1255 OID 16474)
-- Name: insertar_estudiante(character varying, character varying, character varying, character varying, integer, character varying, character varying, numeric); Type: PROCEDURE; Schema: academico; Owner: postgres
--

CREATE PROCEDURE academico.insertar_estudiante(IN p_codigo character varying, IN p_nombres character varying, IN p_apellidos character varying, IN p_genero character varying, IN p_estrato integer, IN p_ciudad character varying, IN p_programa character varying, IN p_promedio numeric)
    LANGUAGE plpgsql
    AS $$

BEGIN

    INSERT INTO academico.estudiantes(

        codigo,
        nombres,
        apellidos,
        genero,
        estrato,
        ciudad,
        programa,
        promedio_academico

    )

    VALUES(

        p_codigo,
        p_nombres,
        p_apellidos,
        p_genero,
        p_estrato,
        p_ciudad,
        p_programa,
        p_promedio

    );

END;
$$;


ALTER PROCEDURE academico.insertar_estudiante(IN p_codigo character varying, IN p_nombres character varying, IN p_apellidos character varying, IN p_genero character varying, IN p_estrato integer, IN p_ciudad character varying, IN p_programa character varying, IN p_promedio numeric) OWNER TO postgres;

--
-- TOC entry 248 (class 1255 OID 16475)
-- Name: calcular_nivel_riesgo(numeric); Type: FUNCTION; Schema: modelo_ml; Owner: postgres
--

CREATE FUNCTION modelo_ml.calcular_nivel_riesgo(promedio numeric) RETURNS text
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF promedio >= 4.0 THEN
        RETURN 'BAJO RIESGO';

    ELSIF promedio >= 3.0 THEN
        RETURN 'RIESGO MEDIO';

    ELSE
        RETURN 'ALTO RIESGO';

    END IF;

END;
$$;


ALTER FUNCTION modelo_ml.calcular_nivel_riesgo(promedio numeric) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 16426)
-- Name: estudiantes; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.estudiantes (
    id_estudiante integer NOT NULL,
    codigo character varying(20),
    nombres character varying(100),
    apellidos character varying(100),
    genero character varying(20),
    estrato integer,
    ciudad character varying(100),
    programa character varying(100),
    promedio_academico numeric(4,2)
);


ALTER TABLE academico.estudiantes OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16425)
-- Name: estudiantes_id_estudiante_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.estudiantes_id_estudiante_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.estudiantes_id_estudiante_seq OWNER TO postgres;

--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 229
-- Name: estudiantes_id_estudiante_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.estudiantes_id_estudiante_seq OWNED BY academico.estudiantes.id_estudiante;


--
-- TOC entry 232 (class 1259 OID 16434)
-- Name: pruebas_saber_pro; Type: TABLE; Schema: academico; Owner: postgres
--

CREATE TABLE academico.pruebas_saber_pro (
    id_prueba integer NOT NULL,
    id_estudiante integer,
    lectura_critica numeric(5,2),
    matematicas numeric(5,2),
    competencias_ciudadanas numeric(5,2),
    ingles numeric(5,2),
    razonamiento_cuantitativo numeric(5,2),
    puntaje_global numeric(5,2),
    periodo character varying(20)
);


ALTER TABLE academico.pruebas_saber_pro OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16433)
-- Name: pruebas_saber_pro_id_prueba_seq; Type: SEQUENCE; Schema: academico; Owner: postgres
--

CREATE SEQUENCE academico.pruebas_saber_pro_id_prueba_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE academico.pruebas_saber_pro_id_prueba_seq OWNER TO postgres;

--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 231
-- Name: pruebas_saber_pro_id_prueba_seq; Type: SEQUENCE OWNED BY; Schema: academico; Owner: postgres
--

ALTER SEQUENCE academico.pruebas_saber_pro_id_prueba_seq OWNED BY academico.pruebas_saber_pro.id_prueba;


--
-- TOC entry 238 (class 1259 OID 16464)
-- Name: log_modelo; Type: TABLE; Schema: logs; Owner: postgres
--

CREATE TABLE logs.log_modelo (
    id_log integer NOT NULL,
    proceso character varying(100),
    descripcion text,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE logs.log_modelo OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16463)
-- Name: log_modelo_id_log_seq; Type: SEQUENCE; Schema: logs; Owner: postgres
--

CREATE SEQUENCE logs.log_modelo_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE logs.log_modelo_id_log_seq OWNER TO postgres;

--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 237
-- Name: log_modelo_id_log_seq; Type: SEQUENCE OWNED BY; Schema: logs; Owner: postgres
--

ALTER SEQUENCE logs.log_modelo_id_log_seq OWNED BY logs.log_modelo.id_log;


--
-- TOC entry 234 (class 1259 OID 16447)
-- Name: dataset_sintetico; Type: TABLE; Schema: modelo_ml; Owner: postgres
--

CREATE TABLE modelo_ml.dataset_sintetico (
    id_dato integer NOT NULL,
    estrato integer,
    promedio numeric(4,2),
    horas_estudio integer,
    acceso_internet boolean,
    puntaje_estimado numeric(5,2)
);


ALTER TABLE modelo_ml.dataset_sintetico OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16446)
-- Name: dataset_sintetico_id_dato_seq; Type: SEQUENCE; Schema: modelo_ml; Owner: postgres
--

CREATE SEQUENCE modelo_ml.dataset_sintetico_id_dato_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE modelo_ml.dataset_sintetico_id_dato_seq OWNER TO postgres;

--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 233
-- Name: dataset_sintetico_id_dato_seq; Type: SEQUENCE OWNED BY; Schema: modelo_ml; Owner: postgres
--

ALTER SEQUENCE modelo_ml.dataset_sintetico_id_dato_seq OWNED BY modelo_ml.dataset_sintetico.id_dato;


--
-- TOC entry 236 (class 1259 OID 16455)
-- Name: predicciones; Type: TABLE; Schema: modelo_ml; Owner: postgres
--

CREATE TABLE modelo_ml.predicciones (
    id_prediccion integer NOT NULL,
    id_estudiante integer,
    modelo_usado character varying(100),
    puntaje_predicho numeric(5,2),
    precision_modelo numeric(5,2),
    fecha_prediccion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE modelo_ml.predicciones OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16454)
-- Name: predicciones_id_prediccion_seq; Type: SEQUENCE; Schema: modelo_ml; Owner: postgres
--

CREATE SEQUENCE modelo_ml.predicciones_id_prediccion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE modelo_ml.predicciones_id_prediccion_seq OWNER TO postgres;

--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 235
-- Name: predicciones_id_prediccion_seq; Type: SEQUENCE OWNED BY; Schema: modelo_ml; Owner: postgres
--

ALTER SEQUENCE modelo_ml.predicciones_id_prediccion_seq OWNED BY modelo_ml.predicciones.id_prediccion;


--
-- TOC entry 228 (class 1259 OID 16412)
-- Name: login_logs; Type: TABLE; Schema: seguridad; Owner: postgres
--

CREATE TABLE seguridad.login_logs (
    id_log integer NOT NULL,
    id_usuario integer,
    fecha_login timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip character varying(50),
    exitoso boolean
);


ALTER TABLE seguridad.login_logs OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16411)
-- Name: login_logs_id_log_seq; Type: SEQUENCE; Schema: seguridad; Owner: postgres
--

CREATE SEQUENCE seguridad.login_logs_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE seguridad.login_logs_id_log_seq OWNER TO postgres;

--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 227
-- Name: login_logs_id_log_seq; Type: SEQUENCE OWNED BY; Schema: seguridad; Owner: postgres
--

ALTER SEQUENCE seguridad.login_logs_id_log_seq OWNED BY seguridad.login_logs.id_log;


--
-- TOC entry 244 (class 1259 OID 16509)
-- Name: permisos; Type: TABLE; Schema: seguridad; Owner: postgres
--

CREATE TABLE seguridad.permisos (
    id_permiso integer NOT NULL,
    nombre_permiso character varying(100),
    descripcion text
);


ALTER TABLE seguridad.permisos OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16508)
-- Name: permisos_id_permiso_seq; Type: SEQUENCE; Schema: seguridad; Owner: postgres
--

CREATE SEQUENCE seguridad.permisos_id_permiso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE seguridad.permisos_id_permiso_seq OWNER TO postgres;

--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 243
-- Name: permisos_id_permiso_seq; Type: SEQUENCE OWNED BY; Schema: seguridad; Owner: postgres
--

ALTER SEQUENCE seguridad.permisos_id_permiso_seq OWNED BY seguridad.permisos.id_permiso;


--
-- TOC entry 246 (class 1259 OID 16519)
-- Name: rol_permiso; Type: TABLE; Schema: seguridad; Owner: postgres
--

CREATE TABLE seguridad.rol_permiso (
    id_rol_permiso integer NOT NULL,
    id_rol integer,
    id_permiso integer
);


ALTER TABLE seguridad.rol_permiso OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16518)
-- Name: rol_permiso_id_rol_permiso_seq; Type: SEQUENCE; Schema: seguridad; Owner: postgres
--

CREATE SEQUENCE seguridad.rol_permiso_id_rol_permiso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE seguridad.rol_permiso_id_rol_permiso_seq OWNER TO postgres;

--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 245
-- Name: rol_permiso_id_rol_permiso_seq; Type: SEQUENCE OWNED BY; Schema: seguridad; Owner: postgres
--

ALTER SEQUENCE seguridad.rol_permiso_id_rol_permiso_seq OWNED BY seguridad.rol_permiso.id_rol_permiso;


--
-- TOC entry 240 (class 1259 OID 16477)
-- Name: roles; Type: TABLE; Schema: seguridad; Owner: postgres
--

CREATE TABLE seguridad.roles (
    id_rol integer NOT NULL,
    nombre_rol character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE seguridad.roles OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16476)
-- Name: roles_id_rol_seq; Type: SEQUENCE; Schema: seguridad; Owner: postgres
--

CREATE SEQUENCE seguridad.roles_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE seguridad.roles_id_rol_seq OWNER TO postgres;

--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 239
-- Name: roles_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: seguridad; Owner: postgres
--

ALTER SEQUENCE seguridad.roles_id_rol_seq OWNED BY seguridad.roles.id_rol;


--
-- TOC entry 242 (class 1259 OID 16491)
-- Name: usuario_rol; Type: TABLE; Schema: seguridad; Owner: postgres
--

CREATE TABLE seguridad.usuario_rol (
    id_usuario_rol integer NOT NULL,
    id_usuario integer,
    id_rol integer
);


ALTER TABLE seguridad.usuario_rol OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16490)
-- Name: usuario_rol_id_usuario_rol_seq; Type: SEQUENCE; Schema: seguridad; Owner: postgres
--

CREATE SEQUENCE seguridad.usuario_rol_id_usuario_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE seguridad.usuario_rol_id_usuario_rol_seq OWNER TO postgres;

--
-- TOC entry 5145 (class 0 OID 0)
-- Dependencies: 241
-- Name: usuario_rol_id_usuario_rol_seq; Type: SEQUENCE OWNED BY; Schema: seguridad; Owner: postgres
--

ALTER SEQUENCE seguridad.usuario_rol_id_usuario_rol_seq OWNED BY seguridad.usuario_rol.id_usuario_rol;


--
-- TOC entry 226 (class 1259 OID 16396)
-- Name: usuarios; Type: TABLE; Schema: seguridad; Owner: postgres
--

CREATE TABLE seguridad.usuarios (
    id_usuario integer NOT NULL,
    nombres character varying(100),
    apellidos character varying(100),
    correo character varying(150) NOT NULL,
    password_hash text NOT NULL,
    rol character varying(50),
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    activo boolean DEFAULT true
);


ALTER TABLE seguridad.usuarios OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16395)
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: seguridad; Owner: postgres
--

CREATE SEQUENCE seguridad.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE seguridad.usuarios_id_usuario_seq OWNER TO postgres;

--
-- TOC entry 5146 (class 0 OID 0)
-- Dependencies: 225
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: seguridad; Owner: postgres
--

ALTER SEQUENCE seguridad.usuarios_id_usuario_seq OWNED BY seguridad.usuarios.id_usuario;


--
-- TOC entry 4919 (class 2604 OID 16429)
-- Name: estudiantes id_estudiante; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.estudiantes ALTER COLUMN id_estudiante SET DEFAULT nextval('academico.estudiantes_id_estudiante_seq'::regclass);


--
-- TOC entry 4920 (class 2604 OID 16437)
-- Name: pruebas_saber_pro id_prueba; Type: DEFAULT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.pruebas_saber_pro ALTER COLUMN id_prueba SET DEFAULT nextval('academico.pruebas_saber_pro_id_prueba_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 16467)
-- Name: log_modelo id_log; Type: DEFAULT; Schema: logs; Owner: postgres
--

ALTER TABLE ONLY logs.log_modelo ALTER COLUMN id_log SET DEFAULT nextval('logs.log_modelo_id_log_seq'::regclass);


--
-- TOC entry 4921 (class 2604 OID 16450)
-- Name: dataset_sintetico id_dato; Type: DEFAULT; Schema: modelo_ml; Owner: postgres
--

ALTER TABLE ONLY modelo_ml.dataset_sintetico ALTER COLUMN id_dato SET DEFAULT nextval('modelo_ml.dataset_sintetico_id_dato_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 16458)
-- Name: predicciones id_prediccion; Type: DEFAULT; Schema: modelo_ml; Owner: postgres
--

ALTER TABLE ONLY modelo_ml.predicciones ALTER COLUMN id_prediccion SET DEFAULT nextval('modelo_ml.predicciones_id_prediccion_seq'::regclass);


--
-- TOC entry 4917 (class 2604 OID 16415)
-- Name: login_logs id_log; Type: DEFAULT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.login_logs ALTER COLUMN id_log SET DEFAULT nextval('seguridad.login_logs_id_log_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 16512)
-- Name: permisos id_permiso; Type: DEFAULT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.permisos ALTER COLUMN id_permiso SET DEFAULT nextval('seguridad.permisos_id_permiso_seq'::regclass);


--
-- TOC entry 4929 (class 2604 OID 16522)
-- Name: rol_permiso id_rol_permiso; Type: DEFAULT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.rol_permiso ALTER COLUMN id_rol_permiso SET DEFAULT nextval('seguridad.rol_permiso_id_rol_permiso_seq'::regclass);


--
-- TOC entry 4926 (class 2604 OID 16480)
-- Name: roles id_rol; Type: DEFAULT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.roles ALTER COLUMN id_rol SET DEFAULT nextval('seguridad.roles_id_rol_seq'::regclass);


--
-- TOC entry 4927 (class 2604 OID 16494)
-- Name: usuario_rol id_usuario_rol; Type: DEFAULT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.usuario_rol ALTER COLUMN id_usuario_rol SET DEFAULT nextval('seguridad.usuario_rol_id_usuario_rol_seq'::regclass);


--
-- TOC entry 4914 (class 2604 OID 16399)
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('seguridad.usuarios_id_usuario_seq'::regclass);


--
-- TOC entry 5114 (class 0 OID 16426)
-- Dependencies: 230
-- Data for Name: estudiantes; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.estudiantes (id_estudiante, codigo, nombres, apellidos, genero, estrato, ciudad, programa, promedio_academico) FROM stdin;
1	2025001	Jhan	Mesa	Masculino	3	Medellin	Ingenieria Sistemas	4.20
\.


--
-- TOC entry 5116 (class 0 OID 16434)
-- Dependencies: 232
-- Data for Name: pruebas_saber_pro; Type: TABLE DATA; Schema: academico; Owner: postgres
--

COPY academico.pruebas_saber_pro (id_prueba, id_estudiante, lectura_critica, matematicas, competencias_ciudadanas, ingles, razonamiento_cuantitativo, puntaje_global, periodo) FROM stdin;
\.


--
-- TOC entry 5122 (class 0 OID 16464)
-- Dependencies: 238
-- Data for Name: log_modelo; Type: TABLE DATA; Schema: logs; Owner: postgres
--

COPY logs.log_modelo (id_log, proceso, descripcion, fecha) FROM stdin;
\.


--
-- TOC entry 5118 (class 0 OID 16447)
-- Dependencies: 234
-- Data for Name: dataset_sintetico; Type: TABLE DATA; Schema: modelo_ml; Owner: postgres
--

COPY modelo_ml.dataset_sintetico (id_dato, estrato, promedio, horas_estudio, acceso_internet, puntaje_estimado) FROM stdin;
\.


--
-- TOC entry 5120 (class 0 OID 16455)
-- Dependencies: 236
-- Data for Name: predicciones; Type: TABLE DATA; Schema: modelo_ml; Owner: postgres
--

COPY modelo_ml.predicciones (id_prediccion, id_estudiante, modelo_usado, puntaje_predicho, precision_modelo, fecha_prediccion) FROM stdin;
\.


--
-- TOC entry 5112 (class 0 OID 16412)
-- Dependencies: 228
-- Data for Name: login_logs; Type: TABLE DATA; Schema: seguridad; Owner: postgres
--

COPY seguridad.login_logs (id_log, id_usuario, fecha_login, ip, exitoso) FROM stdin;
\.


--
-- TOC entry 5128 (class 0 OID 16509)
-- Dependencies: 244
-- Data for Name: permisos; Type: TABLE DATA; Schema: seguridad; Owner: postgres
--

COPY seguridad.permisos (id_permiso, nombre_permiso, descripcion) FROM stdin;
1	VER_DASHBOARD	\N
2	GESTIONAR_USUARIOS	\N
3	VER_REPORTES	\N
4	GENERAR_PREDICCIONES	\N
5	VER_ESTUDIANTES	\N
6	EDITAR_ESTUDIANTES	\N
\.


--
-- TOC entry 5130 (class 0 OID 16519)
-- Dependencies: 246
-- Data for Name: rol_permiso; Type: TABLE DATA; Schema: seguridad; Owner: postgres
--

COPY seguridad.rol_permiso (id_rol_permiso, id_rol, id_permiso) FROM stdin;
1	1	1
2	1	2
3	1	3
4	1	4
5	1	5
6	1	6
\.


--
-- TOC entry 5124 (class 0 OID 16477)
-- Dependencies: 240
-- Data for Name: roles; Type: TABLE DATA; Schema: seguridad; Owner: postgres
--

COPY seguridad.roles (id_rol, nombre_rol, descripcion) FROM stdin;
1	ADMIN	Control total del sistema
2	RECTOR	Acceso global académico
3	DECANO	Gestión por facultad
4	COORDINADOR	Gestión de programa
5	ESTUDIANTE	Consulta académica
\.


--
-- TOC entry 5126 (class 0 OID 16491)
-- Dependencies: 242
-- Data for Name: usuario_rol; Type: TABLE DATA; Schema: seguridad; Owner: postgres
--

COPY seguridad.usuario_rol (id_usuario_rol, id_usuario, id_rol) FROM stdin;
\.


--
-- TOC entry 5110 (class 0 OID 16396)
-- Dependencies: 226
-- Data for Name: usuarios; Type: TABLE DATA; Schema: seguridad; Owner: postgres
--

COPY seguridad.usuarios (id_usuario, nombres, apellidos, correo, password_hash, rol, fecha_creacion, activo) FROM stdin;
\.


--
-- TOC entry 5147 (class 0 OID 0)
-- Dependencies: 229
-- Name: estudiantes_id_estudiante_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.estudiantes_id_estudiante_seq', 1, true);


--
-- TOC entry 5148 (class 0 OID 0)
-- Dependencies: 231
-- Name: pruebas_saber_pro_id_prueba_seq; Type: SEQUENCE SET; Schema: academico; Owner: postgres
--

SELECT pg_catalog.setval('academico.pruebas_saber_pro_id_prueba_seq', 1, false);


--
-- TOC entry 5149 (class 0 OID 0)
-- Dependencies: 237
-- Name: log_modelo_id_log_seq; Type: SEQUENCE SET; Schema: logs; Owner: postgres
--

SELECT pg_catalog.setval('logs.log_modelo_id_log_seq', 1, false);


--
-- TOC entry 5150 (class 0 OID 0)
-- Dependencies: 233
-- Name: dataset_sintetico_id_dato_seq; Type: SEQUENCE SET; Schema: modelo_ml; Owner: postgres
--

SELECT pg_catalog.setval('modelo_ml.dataset_sintetico_id_dato_seq', 1, false);


--
-- TOC entry 5151 (class 0 OID 0)
-- Dependencies: 235
-- Name: predicciones_id_prediccion_seq; Type: SEQUENCE SET; Schema: modelo_ml; Owner: postgres
--

SELECT pg_catalog.setval('modelo_ml.predicciones_id_prediccion_seq', 1, false);


--
-- TOC entry 5152 (class 0 OID 0)
-- Dependencies: 227
-- Name: login_logs_id_log_seq; Type: SEQUENCE SET; Schema: seguridad; Owner: postgres
--

SELECT pg_catalog.setval('seguridad.login_logs_id_log_seq', 1, false);


--
-- TOC entry 5153 (class 0 OID 0)
-- Dependencies: 243
-- Name: permisos_id_permiso_seq; Type: SEQUENCE SET; Schema: seguridad; Owner: postgres
--

SELECT pg_catalog.setval('seguridad.permisos_id_permiso_seq', 6, true);


--
-- TOC entry 5154 (class 0 OID 0)
-- Dependencies: 245
-- Name: rol_permiso_id_rol_permiso_seq; Type: SEQUENCE SET; Schema: seguridad; Owner: postgres
--

SELECT pg_catalog.setval('seguridad.rol_permiso_id_rol_permiso_seq', 6, true);


--
-- TOC entry 5155 (class 0 OID 0)
-- Dependencies: 239
-- Name: roles_id_rol_seq; Type: SEQUENCE SET; Schema: seguridad; Owner: postgres
--

SELECT pg_catalog.setval('seguridad.roles_id_rol_seq', 5, true);


--
-- TOC entry 5156 (class 0 OID 0)
-- Dependencies: 241
-- Name: usuario_rol_id_usuario_rol_seq; Type: SEQUENCE SET; Schema: seguridad; Owner: postgres
--

SELECT pg_catalog.setval('seguridad.usuario_rol_id_usuario_rol_seq', 1, false);


--
-- TOC entry 5157 (class 0 OID 0)
-- Dependencies: 225
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: seguridad; Owner: postgres
--

SELECT pg_catalog.setval('seguridad.usuarios_id_usuario_seq', 1, false);


--
-- TOC entry 4937 (class 2606 OID 16432)
-- Name: estudiantes estudiantes_pkey; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (id_estudiante);


--
-- TOC entry 4939 (class 2606 OID 16440)
-- Name: pruebas_saber_pro pruebas_saber_pro_pkey; Type: CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.pruebas_saber_pro
    ADD CONSTRAINT pruebas_saber_pro_pkey PRIMARY KEY (id_prueba);


--
-- TOC entry 4945 (class 2606 OID 16473)
-- Name: log_modelo log_modelo_pkey; Type: CONSTRAINT; Schema: logs; Owner: postgres
--

ALTER TABLE ONLY logs.log_modelo
    ADD CONSTRAINT log_modelo_pkey PRIMARY KEY (id_log);


--
-- TOC entry 4941 (class 2606 OID 16453)
-- Name: dataset_sintetico dataset_sintetico_pkey; Type: CONSTRAINT; Schema: modelo_ml; Owner: postgres
--

ALTER TABLE ONLY modelo_ml.dataset_sintetico
    ADD CONSTRAINT dataset_sintetico_pkey PRIMARY KEY (id_dato);


--
-- TOC entry 4943 (class 2606 OID 16462)
-- Name: predicciones predicciones_pkey; Type: CONSTRAINT; Schema: modelo_ml; Owner: postgres
--

ALTER TABLE ONLY modelo_ml.predicciones
    ADD CONSTRAINT predicciones_pkey PRIMARY KEY (id_prediccion);


--
-- TOC entry 4935 (class 2606 OID 16419)
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id_log);


--
-- TOC entry 4953 (class 2606 OID 16517)
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id_permiso);


--
-- TOC entry 4955 (class 2606 OID 16525)
-- Name: rol_permiso rol_permiso_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.rol_permiso
    ADD CONSTRAINT rol_permiso_pkey PRIMARY KEY (id_rol_permiso);


--
-- TOC entry 4947 (class 2606 OID 16488)
-- Name: roles roles_nombre_rol_key; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.roles
    ADD CONSTRAINT roles_nombre_rol_key UNIQUE (nombre_rol);


--
-- TOC entry 4949 (class 2606 OID 16486)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- TOC entry 4951 (class 2606 OID 16497)
-- Name: usuario_rol usuario_rol_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.usuario_rol
    ADD CONSTRAINT usuario_rol_pkey PRIMARY KEY (id_usuario_rol);


--
-- TOC entry 4931 (class 2606 OID 16410)
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- TOC entry 4933 (class 2606 OID 16408)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 4957 (class 2606 OID 16441)
-- Name: pruebas_saber_pro fk_estudiante_prueba; Type: FK CONSTRAINT; Schema: academico; Owner: postgres
--

ALTER TABLE ONLY academico.pruebas_saber_pro
    ADD CONSTRAINT fk_estudiante_prueba FOREIGN KEY (id_estudiante) REFERENCES academico.estudiantes(id_estudiante);


--
-- TOC entry 4956 (class 2606 OID 16420)
-- Name: login_logs fk_usuario_login; Type: FK CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.login_logs
    ADD CONSTRAINT fk_usuario_login FOREIGN KEY (id_usuario) REFERENCES seguridad.usuarios(id_usuario);


--
-- TOC entry 4960 (class 2606 OID 16531)
-- Name: rol_permiso rol_permiso_id_permiso_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.rol_permiso
    ADD CONSTRAINT rol_permiso_id_permiso_fkey FOREIGN KEY (id_permiso) REFERENCES seguridad.permisos(id_permiso);


--
-- TOC entry 4961 (class 2606 OID 16526)
-- Name: rol_permiso rol_permiso_id_rol_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.rol_permiso
    ADD CONSTRAINT rol_permiso_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES seguridad.roles(id_rol);


--
-- TOC entry 4958 (class 2606 OID 16503)
-- Name: usuario_rol usuario_rol_id_rol_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.usuario_rol
    ADD CONSTRAINT usuario_rol_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES seguridad.roles(id_rol);


--
-- TOC entry 4959 (class 2606 OID 16498)
-- Name: usuario_rol usuario_rol_id_usuario_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: postgres
--

ALTER TABLE ONLY seguridad.usuario_rol
    ADD CONSTRAINT usuario_rol_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES seguridad.usuarios(id_usuario);


-- Completed on 2026-05-19 20:15:18

--
-- PostgreSQL database dump complete
--

\unrestrict RUn8hhwLFMRHRHHU1jKNrUz4cDAXrfjnzcY8IfavJxutbzJfSyMvJDaQFki8HIC

