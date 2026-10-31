// =====================================================================
// Mapper puro CSV → student_profiles.
//
// Convierte una fila cruda del CSV identificado (DictReader output) a
// un objeto con los nombres EXACTOS que espera `student_profiles` y
// que `upsertProfile` puede persistir. Tambien devuelve metadata de
// identificacion (`nombres`, `identificacion`, `correo`, `carnet`) que
// NO va al perfil sino a `usuarios`.
//
// Es una funcion pura: no toca la BD, no toca la red. Asi es facil de
// testear con `npm run test` sin red ni Docker ni Postgres.
//
// Reglas clave (verificadas contra backend/scripts/cargar_dataset.py
// para mantener consistencia con el loader del CSV anonimo):
//
//   - promedio_ingenieria se DERIVA del CSV como promedio(programacion,
//     matematica_estadistica). Si ambos son null -> null.
//   - promedio_basicas  <- PROMEDIO_MATERIAS_BASICAS
//   - num_reprobadas    <- ASIGNATURAS_REPROBADAS
//   - pct_creditos      <- PORCENTAJE_AVANCE
//   - estrato           <- "ESTRATO N" -> N
//   - nivel_ingles      <- escala 1-7 -> A1/A2/B1 (ver INGLES_MAP)
////   - trabaja           <- boolean desde CONDICION_LABORAL (acepta acentos)
//   - genero            <- 'M' | 'F' | 'O' | null
//
// Defaults que el CSV NO trae (alineados con el DDL):
//   acceso_internet = true, acceso_pc = true,
//   horas_estudio_semana = 8, asistencia_pct = 85,
//   simulacros_realizados = 0.
// =====================================================================

// Escala de ingles del CSV (PROMEDIO_INGLES) -> nivel MCER.
//
// La escala real del export va de 1 a 7 y NO es una escala MCER: el
// nivel 6 o 7 significa "B1" (no "C2", como se mapeaba antes y hacia que
// 211 estudiantes aparecieran con nivel C2).
//
//   1 y 2   -> A1
//   3, 4, 5 -> A2
//   6 y 7   -> B1
//   > 7     -> banda C (8 -> C1, 9 o mas -> C2)
//
// El export trae algun valor por encima de 7 (hay filas con 8 y una con 11),
// asi que la regla se aplica por rango y no con una tabla cerrada.
export function nivelInglesDesdeEscala(n) {
  if (n === 1 || n === 2) return 'A1'
  if (n >= 3 && n <= 5) return 'A2'
  if (n === 6 || n === 7) return 'B1'
  if (n === 8) return 'C1'
  if (n >= 9) return 'C2'
  return null
}

// CSV usa "CONDICION_LABORAL" en el archivo nuevo; el viejo usaba
// "CONDICION_LABORAL (¿Trabaja?)". Aceptamos ambos.
const CONDICION_KEYS = ['CONDICION_LABORAL', 'CONDICION_LABORAL (¿Trabaja?)']

const NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?)*$/
// Documento: la cendecilla es numerica, pero hay estudiantes con pasaporte
// (ej: "PA1296057"). La columna `usuarios.documento` es VARCHAR(20) con
// indice unico, asi que admite ambos formatos. El login acepta correo o
// documento, de modo que estos estudiantes pueden entrar con su correo.
const DOCUMENTO_RE = /^[A-Za-z0-9]{5,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Normaliza un nombre del CSV: colapsa espacios repetidos.
// El export de la universidad trae nombres como
// "OCAMPO  QUIROGA  JUAN  SEBASTIAN" (doble espacio), que el regex de
// nombres rechaza y dejaba a 9 estudiantes fuera del sistema.
export function normalizarNombre(nombres) {
  return (nombres || '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim()
}

// Repara un correo con el dominio truncado.
// El export trae correos como "victormanuelrochamorante@gmail" o
// "GUARINPAREDESJESUSMARIO@GMAIL." (cortados en el dominio).
//
// SOLO se completa cuando el dominio truncado es un prefijo recognizable de
// un proveedor conocido (gmail, hotmail, outlook, yahoo...). No se inventa
// ningun dominio: "algo@GMA" se completa a gmail.com porque "gma" es prefijo
// de "gmail", pero "algo@EMPRESA" se deja como esta (fallara la validacion
// y se reportara, en vez de crear un correo falso).
// Devuelve { correo, reparado }.
const PROVEEDORES_EMAIL = ['gmail', 'hotmail', 'outlook', 'yahoo', 'icloud', 'live']

export function normalizarCorreo(correo) {
  const original = (correo || '').toString().trim()
  if (!original) return { correo: original, reparado: false }
  const arroba = original.lastIndexOf('@')
  if (arroba < 0) return { correo: original, reparado: false }
  const local = original.slice(0, arroba)
  const dominio = original.slice(arroba + 1).replace(/\.+$/, '').toLowerCase()
  if (!dominio) return { correo: original, reparado: false }
  if (dominio.includes('.')) return { correo: original, reparado: false }
  if (dominio.length < 3) return { correo: original, reparado: false }
  const proveedor = PROVEEDORES_EMAIL.find((p) => p.startsWith(dominio))
  if (!proveedor) return { correo: original, reparado: false }
  return { correo: `${local}@${proveedor}.com`, reparado: true }
}

function toInt(raw, lo, hi) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number.parseInt(String(raw).trim(), 10)
  if (!Number.isFinite(n)) return null
  if (lo != null && n < lo) return null
  if (hi != null && n > hi) return null
  return n
}

function toNum(raw, places, lo, hi) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = Number.parseFloat(String(raw).trim().replace(',', '.'))
  if (!Number.isFinite(n)) return null
  if (lo != null && n < lo) return null
  if (hi != null && n > hi) return null
  return Number(n.toFixed(places))
}

function toStr(raw, maxlen) {
  if (raw === null || raw === undefined) return null
  let s = String(raw).trim()
  if (!s) return null
  if (maxlen && s.length > maxlen) s = s.slice(0, maxlen)
  return s
}

function parseEstrato(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const m = s.match(/(\d+)/)
  if (m) {
    const n = Number.parseInt(m[1], 10)
    if (n >= 1 && n <= 6) return n
  }
  return null
}

function parseBoolYes(raw) {
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim().toLowerCase().replace('í', 'i').replace('Í', 'i')
  if (['si', 'yes', 'true', '1'].includes(s)) return true
  if (['no', 'false', '0'].includes(s)) return false
  return null
}

function parseGenero(raw) {
  if (!raw) return null
  const s = String(raw).trim().toUpperCase()
  if (['M', 'F', 'O'].includes(s)) return s
  return null
}

function parseIngles(raw) {
  // El rango llega hasta 20 para no descartar los niveles "C" (8, 9, 10, 11)
  // que aparecen en el export y pueden venir de la API de la universidad.
  const n = toInt(raw, 0, 20)
  if (n === null || n === 0) return null
  return nivelInglesDesdeEscala(n)
}

function derivePromedioIngenieria(prog, mate) {
  const vals = [prog, mate].filter((v) => v !== null)
  if (vals.length === 0) return null
  const sum = vals.reduce((a, b) => a + b, 0)
  return Number((sum / vals.length).toFixed(2))
}

// =====================================================================
// parseCsvRow(raw) → objeto con campos de student_profiles + metadata
// =====================================================================
export function parseCsvRow(raw) {
  if (!raw || typeof raw !== 'object') return null

  const nombresRaw = toStr(raw['NOMBRES'])
  const identificacionRaw = toStr(raw['IDENTIFICACION'])
  const correoRaw = toStr(raw['CORREO'])
  const carnetRaw = toStr(raw['CARNET'])

  const promedio_basicas = toNum(raw['PROMEDIO_MATERIAS_BASICAS'], 2, 0, 5)
  const promedio_programacion = toNum(raw['PROMEDIO_PROGRAMACION'], 2, 0, 5)
  const promedio_matematica_estadistica = toNum(
    raw['PROMEDIO_MATEMATICA_ESTADISTICA'],
    2,
    0,
    5,
  )
  const promedio_ingenieria = derivePromedioIngenieria(
    promedio_programacion,
    promedio_matematica_estadistica,
  )

  const num_reprobadas = toInt(raw['ASIGNATURAS_REPROBADAS'], 0, 30)
  const pct_creditos = toNum(raw['PORCENTAJE_AVANCE'], 2, 0, 100)
  const semestre = toInt(raw['SEMESTRE_ACTUAL'], 1, 12)
  const estrato = parseEstrato(raw['ESTRATO'])
  const creditos_aprobados = toInt(raw['CREDITOS_APROBADOS'], 0, 300)
  const asignaturas_aprobadas = toInt(raw['ASIGNATURAS_APROBADAS'], 0, 80)
  const edad = toInt(raw['EDAD'], 14, 80)
  const genero = parseGenero(raw['GENERO'])

  // CONDICION_LABORAL puede venir con la clave vieja o nueva.
  const condRaw = CONDICION_KEYS.map((k) => raw[k]).find((v) => v != null)
  const trabaja = parseBoolYes(condRaw)

  const promedio_acumulado = toNum(raw['PROMEDIO_ACUMULADO'], 2, 0, 5)
  const ciudad = toStr(raw['CIUDAD_RESIDENCIA_ACTUAL'], 60)
  const nivel_ingles = parseIngles(raw['PROMEDIO_INGLES'])

  return {
    // Perfil academico (mismos nombres que student_profiles).
    promedio_acumulado,
    promedio_basicas,
    promedio_ingenieria,
    promedio_programacion,
    promedio_matematica_estadistica,
    num_reprobadas,
    pct_creditos,
    semestre,
    estrato,
    acceso_internet: true,
    acceso_pc: true,
    trabaja,
    genero,
    edad,
    ciudad,
    horas_estudio_semana: 8,
    nivel_ingles,
    simulacros_realizados: 0,
    asistencia_pct: 85,
    creditos_aprobados,
    asignaturas_aprobadas,
    // Metadata de identificacion (NO se mete en student_profiles).
    _identificacion: identificacionRaw,
    _correo: correoRaw,
    _nombres: nombresRaw,
    _carnet: carnetRaw,
  }
}

// =====================================================================
// validateRow(parsed) → { ok: true, data } | { ok: false, reason }
// Normaliza identificacion/correo (trim + lowercase en correo) y
// rechaza filas con campos criticos invalidos o faltantes.
// =====================================================================
export function validateRow(parsed) {
  if (!parsed) return { ok: false, reason: 'parse_null' }

  const identificacion = parsed._identificacion
  // Normalizaciones: nombres con espacios repetidos y correos con el dominio
  // truncado. Sin esto, 13 estudiantes reales del roster quedaban fuera.
  const { correo: correoAjustado, reparado } = normalizarCorreo(parsed._correo)
  const nombresAjustados = normalizarNombre(parsed._nombres)
  const correo = correoAjustado
  const nombres = nombresAjustados

  if (!identificacion) {
    return { ok: false, reason: 'identificacion_vacia' }
  }
  if (!DOCUMENTO_RE.test(identificacion)) {
    return { ok: false, reason: 'identificacion_invalida' }
  }

  if (!correo) {
    return { ok: false, reason: 'correo_vacio' }
  }
  const correoNorm = correo.toLowerCase()
  if (!EMAIL_RE.test(correoNorm)) {
    return { ok: false, reason: 'correo_invalido' }
  }

  if (!nombres || nombres.length < 3 || !NAME_RE.test(nombres)) {
    return { ok: false, reason: 'nombres_invalidos' }
  }

  // Devuelve una copia normalizada: identificacion trim, correo lower.
  return {
    ok: true,
    data: {
      ...parsed,
      _identificacion: identificacion.trim(),
      _correo: correoNorm,
      _nombres: nombres,
      _reparaciones: reparado ? ['correo'] : [],
    },
  }
}

// Helper para separar metadata de campos de perfil. Útil cuando el
// caller quiere construir un INSERT a `usuarios` y otro a `student_profiles`.
export function splitMetadata(parsed) {
  const {
    _identificacion,
    _correo,
    _nombres,
    _carnet,
    _reparaciones,
    ...profileFields
  } = parsed
  return {
    identificacion: _identificacion,
    correo: _correo,
    nombres: _nombres,
    carnet: _carnet,
    profileFields,
  }
}
// =====================================================================
// DEDUPLICACION DEL ROSTER
// =====================================================================
//
// El export de la universidad trae a algunos estudiantes MAS DE UNA VEZ:
// una fila por cada corte de su carrera. Ejemplo real:
//
//   ESPEJO RODRIGUEZ JOHN STIVEN | sem 1  | prom_acum 0.00 | avance 0.00%
//   ESPEJO RODRIGUEZ JOHN STIVEN | sem 10 | prom_acum 4.10 | avance 91.18%
//
// Si se procesan las dos, el mismo estudiante queda con la fila de primer
// semestre (sin notas) y por lo tanto SIN prediccion, cuando en realidad
// tiene 10 semestres de informacion. En el dataset de entrenamiento tambien
// cuenta como dos personas y se pierde el dato bueno.
//
// Aqui se conserva UNA fila por estudiante, con esta prioridad:
//
//   1. la que tiene datos academicos (PROMEDIO_ACUMULADO > 0);
//   2. a igualdad de datos, la de SEMESTRE mas alto (estado mas avanzado).
//
// Funcion pura: no toca la BD ni la red.
// =====================================================================
export function selectBestRowsPerStudent(rows) {
  const numero = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  const clave = (v) => (v || '').toString().trim().toUpperCase()

  const porDocumento = new Map()
  const sinDocumento = []
  rows.forEach((r, indice) => {
    const doc = clave(r.IDENTIFICACION)
    if (!doc) {
      // Sin documento no se puede deduplicar: se pasa tal cual.
      sinDocumento.push({ fila: r, indice })
      return
    }
    if (!porDocumento.has(doc)) porDocumento.set(doc, [])
    porDocumento.get(doc).push({ fila: r, indice })
  })

  const seleccionados = []
  const resueltos = []

  for (const [doc, grupo] of porDocumento) {
    if (grupo.length === 1) {
      seleccionados.push({ fila: grupo[0].fila, indice: grupo[0].indice })
      continue
    }
    const mejor = grupo.reduce((a, b) => {
      const datosA = numero(a.fila.PROMEDIO_ACUMULADO) > 0
      const datosB = numero(b.fila.PROMEDIO_ACUMULADO) > 0
      if (datosA !== datosB) return datosA ? a : b
      return numero(b.fila.SEMESTRE_ACTUAL) > numero(a.fila.SEMESTRE_ACTUAL) ? b : a
    })
    seleccionados.push({ fila: mejor.fila, indice: mejor.indice })
    resueltos.push({
      documento: doc,
      nombres: mejor.fila.NOMBRES || '',
      filas: grupo.length,
      semestreElegido: numero(mejor.fila.SEMESTRE_ACTUAL),
      promedioElegido: numero(mejor.fila.PROMEDIO_ACUMULADO),
      descartadas: grupo
        .filter((g) => g !== mejor)
        .map((g) => ({
          semestre: numero(g.fila.SEMESTRE_ACTUAL),
          promedio: numero(g.fila.PROMEDIO_ACUMULADO),
        })),
    })
  }

  seleccionados.push(...sinDocumento)
  seleccionados.sort((a, b) => a.indice - b.indice)
  return { rows: seleccionados, resueltos }
}
