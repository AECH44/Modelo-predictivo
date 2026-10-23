# Ingesta del roster de estudiantes desde la API de la UNAC

Procedimiento almacenado para que la universidad cargue automáticamente los
estudiantes nuevos, sin rehacer el import manual por CSV.

- **Archivo que se entrega:** `backend/scripts/sp_ingesta_universidad.sql`
- **Base de datos destino:** PostgreSQL `saberpro`
- **Motor:** PostgreSQL 12 o superior

---

## 1. Que hace

```
API de la UNAC  ──curl──►  sp_sincronizar_desde_api()
                                     │
                                     ▼
                            sp_ingestar_roster(jsonb)
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
            public.usuarios                  public.student_profiles
            (cuenta de acceso)              (perfil academico)
```

Despues, para generar la prediccion del modelo:

```bash
curl -X POST http://localhost:4000/api/admin/recompute-predictions \
     -H "Authorization: Bearer <token de administrador>"
```

El modelo ML vive en el servicio FastAPI, no se puede ejecutar desde SQL.

---

## 2. Instalacion (una vez, la hace el administrador del sistema)

```bash
psql -h localhost -U postgres -d saberpro -f backend/scripts/sp_ingesta_universidad.sql
```

El archivo es **idempotente**: se puede aplicar varias veces sin error.

Crea:

| Objeto | Que es |
|---|---|
| `ingesta_roster_config` | Tabla de configuracion (una sola fila, `id = 1`). El ingeniero la edita. |
| `ingesta_roster_mapeo` | Tabla de mapeo: nombre del campo en el JSON de la API -> campo logico del sistema. |
| `fn_ingesta_texto/numero/entero/booleano/ingles/extraer` | Helpers de normalizacion. |
| `sp_ingestar_roster(jsonb)` | **SP principal.** Recibe los estudiantes y los escribe. |
| `sp_sincronizar_desde_api(...)` | SP de sincronizacion. Descarga la API con `curl` y llama al anterior. |
| `sp_consultar_estudiantes(...)` | Consulta el roster ingerido. |
| `v_ingesta_roster_estado` | Vista de estado de la ingesta. |

**Requisitos del servidor:**

- Extension `pgcrypto` (la instala el propio archivo).
- `curl` en el PATH del servidor.
- Para `sp_sincronizar_desde_api`: superusuario, o los roles
  `pg_execute_server_program` y `pg_write_server_files`.

---

## 3. Lo que el ingeniero de la UNAC tiene que definir

### 3.1 La URL de la API

```sql
UPDATE ingesta_roster_config
   SET api_url         = 'https://api.unac.edu.co/estudiantes',
       api_metodo      = 'GET',
       api_ruta_datos  = 'data',        -- donde esta el array de estudiantes dentro del JSON
       api_headers     = '{"Authorization": "Bearer ...", "Accept": "application/json"}',
       api_param_pagina = 'page',       -- NULL si la API no pagina
       api_param_limite = 'limit',      -- NULL si la API no pagina
       api_max_paginas = 1,             -- cuantas paginas traer
       api_timeout     = 30
 WHERE id = 1;
```

`api_ruta_datos` es la ruta dentro del JSON donde empieza el array de
estudiantes, con puntos como separador:

| Respuesta de la API | `api_ruta_datos` |
|---|---|
| `[{...}, {...}]` (el array es la respuesta entera) | `''` (vacio) |
| `{"data": [{...}]}` | `data` |
| `{"resultado": {"items": [{...}]}}` | `resultado.items` |

Si la API pagina, se admite el marcador `{{pagina}}` dentro de la URL:

```sql
UPDATE ingesta_roster_config
   SET api_url = 'https://api.unac.edu.co/estudiantes?page={{pagina}}&size=500',
       api_param_limite = 'size',
       api_max_paginas = 10
 WHERE id = 1;
```

### 3.2 El mapeo de campos

Por defecto ya vienen mapeados los nombres del export actual de la universidad
(los del CSV). **Si la API usa otros nombres, se ajustan en esta tabla:**

```sql
-- Ejemplo: la API devuelve "num_doc" y "email" en vez de "IDENTIFICACION" y "CORREO"
INSERT INTO ingesta_roster_mapeo (campo_api, columna_dest, tipo) VALUES
  ('num_doc', 'identificacion', 'texto'),
  ('email',   'correo',         'texto')
ON CONFLICT (campo_api) DO NOTHING;
```

Se pueden dejar filas viejas inactivas en vez de borrarlas:

```sql
UPDATE ingesta_roster_mapeo SET activo = FALSE WHERE campo_api = 'IDENTIFICACION';
```

Varias filas pueden apuntar al mismo campo logico (alias). Si llegan los dos
nombres, gana el primero en orden alfabetico: el resultado es determinista.

**Campos logicos disponibles** (`columna_dest`):

```
identificacion  correo  nombres  carnet
edad  semestre  horas_estudio_semana  nivel_ingles
promedio_acumulado  promedio_basicas  promedio_ingenieria
promedio_programacion  promedio_matematica_estadistica
num_reprobadas  pct_creditos  estrato
acceso_internet  acceso_pc  trabaja  genero  ciudad
simulacros_realizados  asistencia_pct
creditos_aprobados  asignaturas_aprobadas  anio_presentacion_saber_pro
```

**Tipos admitidos** (`tipo`): `texto`, `entero`, `decimal`, `booleano`,
`ingles`, `estrato`.

La normalizacion es tolerante: `"3,5"` y `"3.5"` se leen igual, `"ESTRATO 3"`
se entiende, el ingles acepta la escala `1-7` del export o el nivel MCER
`A1..C2` listo, y las booleanas aceptan `Si/Yes/true/1` y `No/false/0`.

### 3.3 Campos obligatorios

Solo dos: **documento** (5 a 15 digitos) y **correo** (formato valido). Sin
ellos el registro se rechaza y aparece en el detalle del resultado de la
ingesta. Todo lo mas es opcional.

---

## 4. Como se ejecuta

### Sincronizacion completa (descarga + ingesta)

```sql
SELECT * FROM sp_sincronizar_desde_api();
```

Devuelve un JSON con el resultado:

```json
{
  "ok": true,
  "descargados": 120,
  "paginas": 1,
  "ingesta": {
    "insertados": 95,
    "actualizados": 25,
    "omitidos": 0,
    "rechazados": 0,
    "detalle": []
  }
}
```

- `descargados`: registros que trajo la API.
- `insertados`: estudiantes nuevos con cuenta creada.
- `actualizados`: estudiantes que ya existian y se actualizaron.
- `omitidos`: los que no quedaron procesados.
- `rechazados`: los que tenian datos invalidos.
- `detalle`: lista de los rechazados, con `identificacion`, `correo` y `motivo`.

Tambien se puede pasar la URL como parametro, sin tocar la configuracion:

```sql
SELECT * FROM sp_sincronizar_desde_api(
    p_url        = 'https://api.unac.edu.co/estudiantes',
    p_metodo     = 'GET',
    p_headers    = '{"Authorization": "Bearer ..."}',
    p_ruta_datos = 'data');
```

- `omitidos`: los que no quedaron procesados.
- `rechazados`: los que tenian datos invalidos.
- `detalle`: lista de los rechazados, con `identificacion`, `correo` y `motivo`.

Motivos de rechazo posibles:

| Motivo | Que significa |
|---|---|
| `sin numero de documento` | El registro no trae documento. |
| `documento con formato invalido: X` | El documento no tiene entre 5 y 15 digitos. |
| `sin correo` | El registro no trae correo. |
| `correo con formato invalido: X` | El correo no tiene forma de correo valido. |
| `el correo ya pertenece a otro documento` | Ese correo ya esta en uso por otra persona. |
| `el documento ya pertenece a una cuenta institucional (rol X)` | El documento es de un rector, decano o administrador: la ingesta no toca esas cuentas. |
| `documento duplicado en el mismo payload` | El documento aparecio dos veces en el mismo envio. |
| `correo duplicado en el mismo payload` | El correo aparecio dos veces en el mismo envio. |

### Solo la ingesta (si la API ya se consulto por otro lado)

```sql
SELECT * FROM sp_ingestar_roster(
  '[
    {"IDENTIFICACION":"1000000001","CORREO":"estudiante@unac.edu.co","NOMBRES":"NOMBRE APELLIDO",
     "EDAD":20,"SEMESTRE_ACTUAL":3,"PROMEDIO_ACUMULADO":3.8,"PORCENTAJE_AVANCE":45.5,
     "ESTRATO":"ESTRATO 3","GENERO":"M","PROMEDIO_INGLES":4}
  ]'::jsonb);
```

### Ver el estado

```sql
SELECT * FROM v_ingesta_roster_estado;
-- campos_mapeados | estudiantes | con_perfil | con_prediccion | sin_datos_academicos
```

### Ver los estudiantes ingeridos

```sql
SELECT * FROM sp_consultar_estudiantes(p_programa => 'all', p_limite => 50);
```

---

## 5. Reglas de la ingesta

- **Es idempotente.** Se puede correr tantas veces como se quiera. El
  estudiante se identifica por su numero de documento: si ya existe se
  actualiza, nunca se duplica.
- **La contrasena institucional es el numero de documento.** Se crea sola la
  primera vez. En las actualizaciones **no se regenera el hash**: si el
  estudiante la cambio, se respeta.
- **El correo es la clave de acceso del estudiante** y es unico. Si un correo
  ya pertenece a otro documento, el registro se rechaza.
- **Las cuentas institucionales estan protegidas.** Si el documento recibido
  ya pertenece a una cuenta que no es de estudiante (rector, decano,
  administrador), el registro se rechaza con el motivo
  `el documento ya pertenece a una cuenta institucional (rol ...)`. La ingesta
  **nunca** reescribe una cuenta institucional.
- **Los duplicados dentro del mismo envio se rechazan**, con el motivo
  `documento duplicado en el mismo payload` o `correo duplicado en el mismo
  payload`. Se conserva la primera aparicion.
- **Sin historial academico no hay prediccion.** Si el estudiante llega con
  `PROMEDIO_ACUMULADO` en 0 o vacio, se guarda el perfil pero el modelo no le
  emite prediccion (no tendria con que trabajar). Se detecta con
  `v_ingesta_roster_estado.sin_datos_academicos`.
- **El dataset de entrenamiento no se toca** por defecto
  (`registrar_en_dataset = FALSE`). Es el que tiene el tamano documentado del
  trabajo de grado. Si se activa, las filas nuevas quedan marcadas con
  `fuente_dato = 'api-universidad'`.
- **La prediccion se genera despues**, con
  `POST /api/admin/recompute-predictions`.

---

## 6. Prueba de humo sin depender de la API real

Para validar el SP antes de conectarlo a la API de la universidad, con un
estudiante ficticio (despues se puede borrar):

```sql
BEGIN;
SELECT * FROM sp_ingestar_roster(
  '[{"IDENTIFICACION":"999999999","CORREO":"prueba.ingesta@unac.edu.co",
     "NOMBRES":"ESTUDIANTE PRUEBA","EDAD":21,"SEMESTRE_ACTUAL":3,
     "PROMEDIO_ACUMULADO":3.8,"PROMEDIO_MATERIAS_BASICAS":3.5,
     "PROMEDIO_PROGRAMACION":3.9,"PROMEDIO_MATEMATICA_ESTADISTICA":3.7,
     "ASIGNATURAS_REPROBADAS":1,"PORCENTAJE_AVANCE":45.5,"ESTRATO":"ESTRATO 3",
     "CONDICION_LABORAL":"NO","GENERO":"M","CIUDAD_RESIDENCIA_ACTUAL":"Bogota",
     "PROMEDIO_INGLES":4,"CREDITOS_APROBADOS":60,"ASIGNATURAS_APROBADAS":24,
     "ANIO_PRESENTACION_SABER_PRO":2027}]'::jsonb);

SELECT u.documento, u.email, u.role, sp.promedio_acumulado, sp.promedio_ingenieria,
       sp.estrato, sp.nivel_ingles, sp.completed
  FROM usuarios u JOIN student_profiles sp ON sp.user_id = u.id
 WHERE u.documento = '999999999';
ROLLBACK;
```

---

## 7. Seguridad

- El archivo de argumentos de `curl` se escribe en el directorio de datos del
  servidor, con un nombre **validado** (`[A-Za-z0-9._-]`, max 64 caracteres).
  La URL y las cabeceras nunca se interpolan en la linea de comandos.
- La URL y las cabeceras no pueden contener saltos de linea ni caracteres de
  control (se rechazan con un error claro).
- El comando que ve el shell es unicamente `curl -sS -K <archivo>`, sin comillas,
  sin rutas y sin metacaracteres.
- El archivo temporal se borra al terminar la sincronizacion.
- Las cabeceras con el token de la API se guardan en la tabla de configuracion,
  que es de la base de datos del sistema: no se versionan ni se comparten.

---

## 8. Notas para el ingeniero de la UNAC

1. Se necesita **un endpoint que devuelva un array JSON de estudiantes** con al
   menos documento y correo. Si hoy la informacion vive en varias fuentes
   (sistema academico, admisiones, etc.), lo mas simple es exponer un endpoint
   que ya consolide el roster con los campos de la tabla `ingesta_roster_mapeo`.
2. **El sistema de destino es el que decide los nombres**, no al reves: si la
   API ya usa los nombres del CSV (`IDENTIFICACION`, `CORREO`, `PROMEDIO_ACUMULADO`,
   ...), el mapeo por defecto funciona sin tocar nada.
3. **Como hacer la prueba antes de produccion**: levantar el SP, correr la
   prueba de humo de la seccion 6, y despues apuntar `api_url` a un ambiente de
   pruebas de la API con `api_max_paginas = 1` y revisar el detalle de
   rechazados.
4. **La sincronizacion se puede automatizar** con un `pg_cron` o una tarea
   programada que llame `SELECT sp_sincronizar_desde_api();` cada noche.
