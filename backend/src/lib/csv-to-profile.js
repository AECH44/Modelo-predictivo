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
//   - nivel_ingles      <- escala 1-7 -> A1..C2
//   - trabaja           <- boolean desde CONDICION_LABORAL (acepta acentos)
//   - genero            <- 'M' | 'F' | 'O' | null
//
// Defaults que el CSV NO trae (alineados con el DDL):
//   acceso_internet = true, acceso_pc = true,
//   horas_estudio_semana = 8, asistencia_pct = 85,
//   simulacros_realizados = 0.
// =====================================================================

const INGLES_MAP = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2', 7: 'C2' }

// CSV usa "CONDICION_LABORAL" en el archivo nuevo; el viejo usaba
// "CONDICION_LABORAL (¿Trabaja?)". Aceptamos ambos.
const CONDICION_KEYS = ['CONDICION_LABORAL', 'CONDICION_LABORAL (¿Trabaja?)']

const NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?)*$/
const DOCUMENTO_RE = /^\d{5,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

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
  const n = toInt(raw, 0, 7)
  if (n === null || n === 0) return null
  return INGLES_MAP[n] ?? null
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
  const correo = parsed._correo
  const nombres = parsed._nombres

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