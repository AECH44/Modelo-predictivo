// Predictor para Saber Pro. Por defecto intenta usar el modelo ML real
// servido por FastAPI en :8000 (saberpro_model.pkl, version real-data-v1).
// Si FastAPI no responde, usa la heuristica determinista como fallback.
//
// Contrato de salida (no cambia): { clase, puntaje_estimado, probabilidad,
//   factores, areas, recomendaciones, snapshot, model_version }

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'
const FASTAPI_TIMEOUT_MS = 2000
const HEALTH_CACHE_TTL_MS = 30_000

// Estado cacheado de FastAPI (evita ping en cada prediccion).
let _fastApiAlive = null
let _lastHealthCheck = 0
let _lastVersion = null

const ENGLISH_BONUS = { A1: 2, A2: 6, B1: 12, B2: 20, C1: 26, C2: 30 }

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function num(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// Un estudiante de primer semestre todavia no tiene notas: TODAS sus features
// academicas llegan en 0 (promedio_acumulado, promedio_ingenieria,
// promedio_basicas, creditos, porcentaje de avance). El modelo nunca vio ese
// regimen porque esas filas se excluyeron del entrenamiento (promedio_acumulado
// = 0), asi que predecir una clase ahi es extrapolar: la decision la toman
// genero, edad y estrato, no el desempeno.
//
// Por eso, cuando no hay historial academico NO emitimos prediccion: es mas
// honesto mostrar "sin datos suficientes" que una clase con 90% de confianza
// inventada. Un `promedio_acumulado > 0` es la señal de que ya hay notas.
export function tieneDatosSuficientes(profile) {
  if (!profile) return false
  return num(profile.promedio_acumulado, 0) > 0
}

async function checkFastApi() {
  const now = Date.now()
  if (_fastApiAlive !== null && now - _lastHealthCheck < HEALTH_CACHE_TTL_MS) {
    return _fastApiAlive
  }
  _lastHealthCheck = now
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FASTAPI_TIMEOUT_MS)
    const res = await fetch(`${FASTAPI_URL}/api/health`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      _fastApiAlive = data.model_loaded === true
      _lastVersion = data.model_version || 'real-data-v1'
    } else {
      _fastApiAlive = false
    }
  } catch {
    _fastApiAlive = false
  }
  return _fastApiAlive
}

// Mapea el profile que la UI envia al JSON que el .pkl espera.
//
// Modelo v2 (`saberpro-v2`): 12 numericas + 2 categoricas (ver
// ml-training/train_saberpro_v2.py). Incluye `promedio_acumulado`, que en el
// modelo v1 quedaba fuera porque el target era una funcion deterministica de
// el (fuga). Con el target real es la feature mas informativa.
//
// La UI envia campos del modelo heuristico anterior; aqui hacemos el mapeo
// explicito.
function profileToMlFeatures(profile) {
  const fallbackPromedio = num(profile.promedio_acumulado, 3.0)
  return {
    promedio_acumulado: clamp(fallbackPromedio, 0, 5),
    promedio_materias_basicas: num(profile.promedio_basicas, fallbackPromedio),
    promedio_ingenieria: num(profile.promedio_ingenieria, fallbackPromedio),
    promedio_programacion: num(profile.promedio_programacion, num(profile.promedio_ingenieria, fallbackPromedio)),
    promedio_matematica_estadistica: num(profile.promedio_matematica_estadistica, num(profile.promedio_basicas, fallbackPromedio)),
    asignaturas_reprobadas: clamp(num(profile.num_reprobadas, 0), 0, 50),
    porcentaje_avance: clamp(num(profile.pct_creditos, 50), 0, 100),
    semestre_actual: clamp(num(profile.semestre, 5), 1, 12),
    estrato: clamp(num(profile.estrato, 3), 1, 6),
    creditos_aprobados: clamp(num(profile.creditos_aprobados, num(profile.pct_creditos, 50) * 2), 0, 300),
    asignaturas_aprobadas: clamp(num(profile.asignaturas_aprobadas, 20), 0, 80),
    edad: clamp(num(profile.edad, 22), 14, 80),
    genero: ['M', 'F'].includes(profile.genero) ? profile.genero : 'M',
    promedio_ingles_nivel: ENGLISH_BONUS[profile.nivel_ingles] != null
      ? profile.nivel_ingles
      : 'B1',
  }
}

async function callMlPredict(profile) {
  const features = profileToMlFeatures(profile)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FASTAPI_TIMEOUT_MS)
  try {
    const res = await fetch(`${FASTAPI_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`FastAPI ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// Traduce la respuesta de FastAPI al contrato del predictor JS.
//
// Modelo v2 (`saberpro-v2`): el servicio devuelve un PUNTAJE estimado real
// (salida de un regresor entrenado sobre el puntaje de examen observado) con
// su intervalo, el puntaje por area y la probabilidad de cada banda.
//
// Modelo v1 (`real-data-v1`): el servicio devuelve una clase y probabilidades.
// En ese caso el puntaje es un remapeo de la probabilidad (ver
// `probabilidadToScore`), porque el modelo v1 no predice puntajes.
function mlResponseToContract(mlResp, profile) {
  // La columna `clase` en `predictions` tiene CHECK constraint que solo
  // acepta valores lowercase: 'bajo' | 'medio' | 'alto'. Normalizamos
  // inmediatamente al contrato canonico para evitar violar la constraint.
  const allowed = ['Bajo', 'Medio', 'Alto']
  const rawClase = allowed.includes(mlResp.resultado) ? mlResp.resultado : 'Medio'
  const clase = rawClase.toLowerCase()
  const probabilidad = Number(mlResp.probabilidad) || 0.5
  const probs = mlResp.probabilities || {}

  // ¿Viene el puntaje real del modelo v2?
  const tienePuntajeReal =
    mlResp.puntaje_estimado !== undefined &&
    mlResp.puntaje_estimado !== null &&
    Number.isFinite(Number(mlResp.puntaje_estimado))

  const factores = [
    { label: 'Promedio acumulado', impact: tone(num(profile.promedio_acumulado, 3), 4.0, 3.0),
      value: num(profile.promedio_acumulado, 3).toFixed(2) },
    { label: 'Promedio ingeniería', impact: tone(num(profile.promedio_ingenieria, 3), 4.0, 3.0),
      value: num(profile.promedio_ingenieria, 3).toFixed(2) },
    { label: 'Promedio básicas', impact: tone(num(profile.promedio_basicas, 3), 4.0, 3.0),
      value: num(profile.promedio_basicas, 3).toFixed(2) },
    { label: 'Asignaturas reprobadas', impact: num(profile.num_reprobadas, 0) <= 1
        ? 'Positivo' : num(profile.num_reprobadas, 0) <= 3 ? 'Moderado' : 'A mejorar',
      value: `${num(profile.num_reprobadas, 0)}` },
    { label: 'Avance créditos', impact: tone(num(profile.pct_creditos, 50), 70, 40),
      value: `${Math.round(num(profile.pct_creditos, 50))}%` },
    { label: 'Nivel de inglés', impact: ['B2', 'C1', 'C2'].includes(profile.nivel_ingles)
        ? 'Positivo' : ['A1', 'A2'].includes(profile.nivel_ingles) ? 'A mejorar' : 'Moderado',
      value: profile.nivel_ingles || 'B1' },
  ]

  // Las areas las predice el modelo v2 (0-100 cada una). Con el v1 se
  // estiman a partir de los promedios, que es lo mejor que se puede hacer.
  const areasDelModelo = Array.isArray(mlResp.areas) ? mlResp.areas : null
  const areas = areasDelModelo && areasDelModelo.length
    ? areasDelModelo.map((a) => ({
        id: a.id,
        label: a.label,
        score: Math.round(clamp(Number(a.score) || 0, 0, 100)),
      }))
    : [
        { id: 'matematicas', label: 'Matemáticas / Razonamiento cuantitativo',
          score: Math.round(clamp(num(profile.promedio_basicas, 3) * 18 + 10, 0, 100)) },
        { id: 'lectura', label: 'Lectura crítica',
          score: Math.round(clamp(((num(profile.promedio_basicas, 3) + num(profile.promedio_ingenieria, 3)) / 2) * 16 + 12, 0, 100)) },
        { id: 'ingles', label: 'Inglés',
          score: Math.round(clamp(40 + (ENGLISH_BONUS[profile.nivel_ingles] || 12) * 2, 0, 100)) },
        { id: 'competencias', label: 'Competencias ciudadanas',
          score: Math.round(clamp(num(profile.promedio_ingenieria, 3) * 17 + 15, 0, 100)) },
      ]

  const recomendaciones = buildRecomendaciones({
    clase,
    promedio: num(profile.promedio_acumulado, 3),
    basicas: num(profile.promedio_basicas, 3),
    ingenieria: num(profile.promedio_ingenieria, 3),
    reprobadas: num(profile.num_reprobadas, 0),
    horas: 10,
    asistencia: 85,
    nivel_ingles: profile.nivel_ingles,
  })

  const puntajeEstimado = tienePuntajeReal
    ? Math.round(Number(mlResp.puntaje_estimado))
    : probabilidadToScore(probabilidad, clase)

  return {
    clase,
    puntaje_estimado: puntajeEstimado,
    // Intervalo de prediccion del modelo v2 (margen empirico del MAE).
    // Con el v1 no hay intervalo: null.
    puntaje_minimo: tienePuntajeReal && Number.isFinite(Number(mlResp.puntaje_minimo))
      ? Math.round(Number(mlResp.puntaje_minimo))
      : null,
    puntaje_maximo: tienePuntajeReal && Number.isFinite(Number(mlResp.puntaje_maximo))
      ? Math.round(Number(mlResp.puntaje_maximo))
      : null,
    probabilidad: Number(probabilidad.toFixed(4)),
    factores,
    areas,
    recomendaciones,
    snapshot: profile,
    // La columna model_version es VARCHAR(20); truncamos para no romper el INSERT.
    model_version: (() => {
      const raw = mlResp.model_version || 'fastapi'
      const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '-').substring(0, 19)
      return `ml-${cleaned}`.substring(0, 19)
    })(),
    probabilities: probs,
  }
}

// Solo para el modelo v1 (clasificador de banda): mapea la probabilidad a un
// puntaje 0-300. El modelo v2 NO usa esta funcion: su puntaje es la salida
// real del regresor.
function probabilidadToScore(p, clase) {
  // Mapea probabilidad (0-1) a puntaje 0-300 manteniendo la clase coherente.
  if (clase === 'alto') return Math.round(240 + Math.min(60, p * 60))
  if (clase === 'bajo') return Math.round(Math.max(0, 180 - (1 - p) * 60))
  return Math.round(180 + Math.min(60, p * 60))
}

// ============================================================================
// HEURISTICA (fallback si FastAPI no responde)
// ============================================================================

function tone(value, thresholdHigh, thresholdLow) {
  if (value >= thresholdHigh) return 'Positivo'
  if (value <= thresholdLow) return 'A mejorar'
  return 'Moderado'
}

function buildFactores(v) {
  return [
    { label: 'Promedio acumulado', impact: tone(v.promedio, 4.0, 3.0), value: v.promedio.toFixed(2) },
    { label: 'Asistencia a clases', impact: tone(v.asistencia, 90, 70), value: `${Math.round(v.asistencia)}%` },
    { label: 'Horas de estudio semanales', impact: tone(v.horas, 12, 5), value: `${v.horas} h/semana` },
    { label: 'Materias reprobadas', impact: v.reprobadas <= 1 ? 'Positivo' : v.reprobadas <= 3 ? 'Moderado' : 'A mejorar', value: `${v.reprobadas}` },
    { label: 'Avance en créditos', impact: tone(v.pctCreditos, 70, 40), value: `${Math.round(v.pctCreditos)}%` },
    { label: 'Nivel de inglés', impact: v.ingles >= 20 ? 'Positivo' : v.ingles >= 10 ? 'Moderado' : 'A mejorar', value: `Bonus ${v.ingles}` },
    { label: 'Simulacros completados', impact: v.simulacros >= 4 ? 'Positivo' : v.simulacros >= 2 ? 'Moderado' : 'A mejorar', value: `${v.simulacros}` },
  ]
}

function buildAreas(v) {
  return [
    { id: 'matematicas', label: 'Matemáticas / Razonamiento cuantitativo', score: Math.round(clamp(v.basicas * 18 + 10, 0, 100)) },
    { id: 'lectura', label: 'Lectura crítica', score: Math.round(clamp(((v.basicas + v.ingenieria) / 2) * 16 + 12, 0, 100)) },
    { id: 'ingles', label: 'Inglés', score: Math.round(clamp(40 + v.ingles * 2, 0, 100)) },
    { id: 'competencias', label: 'Competencias ciudadanas', score: Math.round(clamp(v.ingenieria * 17 + 15, 0, 100)) },
  ]
}

function buildRecomendaciones({ clase, promedio, basicas, ingenieria, reprobadas, horas, asistencia, nivel_ingles }) {
  const improve = []
  const actions = []
  if (promedio < 3.5) {
    improve.push('Elevar el promedio acumulado con asesorias semanales.')
    actions.push('Agendar tutorías en las materias con menor calificación.')
  }
  if (basicas < 3.5) {
    improve.push('Reforzar fundamentos de matemáticas y ciencias básicas.')
    actions.push('Resolver 30 ejercicios semanales de razonamiento cuantitativo.')
  }
  if (ingenieria < 3.5) {
    improve.push('Mejorar desempeño en asignaturas de la línea de ingeniería.')
    actions.push('Formar un grupo de estudio para las materias de ingeniería.')
  }
  if (reprobadas >= 2) {
    improve.push('Recuperar materias reprobadas para evitar atraso académico.')
    actions.push('Inscribir materias de habilitacion el siguiente semestre.')
  }
  if (horas < 10) {
    improve.push('Aumentar la dedicación semanal al estudio autónomo.')
    actions.push('Bloquear 10 horas semanales fijas para estudio (Pomodoro 25/5).')
  }
  if (asistencia < 85) {
    improve.push('Mejorar asistencia a clases para no perder explicaciones clave.')
    actions.push('Activar recordatorios automáticos y registrar asistencia diaria.')
  }
  if (!nivel_ingles || ['A1', 'A2'].includes(nivel_ingles)) {
    improve.push('Elevar el nivel de inglés para mejorar el componente del Saber Pro.')
    actions.push('Realizar 20 minutos diarios de práctica de inglés con apps tipo Duolingo.')
  }
  if (improve.length === 0) {
    improve.push('Mantener constancia académica y los buenos hábitos actuales.')
    actions.push('Realizar 1 simulacro Saber Pro completo cada 3 semanas.')
  }
  if (clase === 'bajo') actions.push('Acercarse al consejero académico para construir un plan de recuperación.')
  else if (clase === 'alto') actions.push('Postularte a programas de monitoria o semilleros de investigacion.')
  return { improve: improve.slice(0, 5), actions: actions.slice(0, 5) }
}

export function heuristicPredict(profile) {
  const promedio = num(profile.promedio_acumulado, 3.0)
  const basicas = num(profile.promedio_basicas, promedio)
  const ingenieria = num(profile.promedio_ingenieria, promedio)
  const reprobadas = clamp(num(profile.num_reprobadas, 0), 0, 20)
  const pctCreditos = clamp(num(profile.pct_creditos, 50), 0, 100)
  const semestre = clamp(num(profile.semestre, 5), 1, 12)
  const estrato = clamp(num(profile.estrato, 3), 1, 6)
  const horas = clamp(num(profile.horas_estudio_semana, 6), 0, 40)
  const simulacros = clamp(num(profile.simulacros_realizados, 0), 0, 20)
  const asistencia = clamp(num(profile.asistencia_pct, 70), 0, 100)
  const ingles = ENGLISH_BONUS[profile.nivel_ingles] ?? 8
  const internet = profile.acceso_internet ? 1 : 0
  const pc = profile.acceso_pc ? 1 : 0
  const trabaja = profile.trabaja ? 1 : 0

  let score = 90
  score += promedio * 22
  score += basicas * 6
  score += ingenieria * 6
  score += (pctCreditos / 100) * 18
  score += (asistencia / 100) * 16
  score += Math.min(horas, 25) * 0.9
  score += Math.min(simulacros, 10) * 1.4
  score += ingles
  score += (estrato - 3) * 1.2
  score += internet * 3
  score += pc * 3
  score -= trabaja * 4
  score -= reprobadas * 5
  score += (semestre - 5) * 1.2

  const puntaje = Math.round(clamp(score, 0, 300))
  let clase = 'medio'
  if (puntaje < 180) clase = 'bajo'
  else if (puntaje >= 240) clase = 'alto'

  let probabilidad
  if (clase === 'alto') probabilidad = clamp(0.55 + (puntaje - 240) / 120, 0.55, 0.97)
  else if (clase === 'bajo') probabilidad = clamp(0.55 + (180 - puntaje) / 120, 0.55, 0.97)
  else { const dist = Math.abs(puntaje - 210) / 30; probabilidad = clamp(0.55 + (1 - dist) * 0.3, 0.55, 0.9) }
  probabilidad = Number(probabilidad.toFixed(4))

  const factores = buildFactores({ promedio, asistencia, horas, reprobadas, pctCreditos, ingles, simulacros })
  const areas = buildAreas({ basicas, ingenieria, ingles })
  const recomendaciones = buildRecomendaciones({
    clase, promedio, basicas, ingenieria, reprobadas, horas, asistencia, nivel_ingles: profile.nivel_ingles,
  })

  return {
    clase, puntaje_estimado: puntaje, probabilidad,
    factores, areas, recomendaciones, snapshot: profile,
    model_version: 'heuristic-v1',
  }
}

// API publica. Intenta ML; si falla, fallback al heuristico.
//
// Devuelve `null` cuando el estudiante todavia no tiene historial academico
// (ver `tieneDatosSuficientes`): en ese caso el modelo no tiene nada que
// aprender del estudiante y cualquier clase seria inventada. Los llamadores
// deben tratar `null` como "sin prediccion todavia" y no guardar fila.
export async function computePrediction(profile) {
  if (!tieneDatosSuficientes(profile)) return null
  if (await checkFastApi()) {
    try {
      const mlResp = await callMlPredict(profile)
      return mlResponseToContract(mlResp, profile)
    } catch (err) {
      console.warn('[predictor] FastAPI fallo, fallback heuristico:', err.message)
      // Forzar re-check en la proxima llamada
      _fastApiAlive = null
    }
  } else {
    // Cayo al heuristico: el puntaje que sale NO es una prediccion del
    // modelo (es un remapeo heuristico en otra escala). Hay que dejarlo
    // registrado: si se guarda en la BD sin aviso, el panel muestra
    // numeros que no vienen del modelo sin que nadie se entere.
    console.warn(
      '[predictor] FastAPI no disponible (health check fallo): se usa el fallback ' +
      'heuristico. El puntaje NO proviene del modelo v2.',
    )
  }
  return heuristicPredict(profile)
}
