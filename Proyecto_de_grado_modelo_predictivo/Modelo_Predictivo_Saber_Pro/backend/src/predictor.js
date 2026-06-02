// Predictor heuristico para Saber Pro.
// Determinista: dadas las mismas entradas devuelve la misma salida. Sirve como
// MVP funcional y como contrato del modelo real que lo reemplazara luego.

const ENGLISH_BONUS = { A1: 2, A2: 6, B1: 12, B2: 20, C1: 26, C2: 30 }

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// Genera un puntaje estimado (0-300) a partir del perfil.
// Pesos elegidos para que el resultado sea sensible a las variables que la
// literatura tipicamente correlaciona con el desempeno en Saber Pro.
export function computePrediction(profile) {
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

  // Base = 90, escala lineal de los componentes (max teorico ~300)
  let score = 90
  score += promedio * 22           // 0..110
  score += basicas * 6             // 0..30
  score += ingenieria * 6          // 0..30
  score += (pctCreditos / 100) * 18 // 0..18
  score += (asistencia / 100) * 16  // 0..16
  score += Math.min(horas, 25) * 0.9 // 0..22
  score += Math.min(simulacros, 10) * 1.4 // 0..14
  score += ingles                   // 2..30
  score += (estrato - 3) * 1.2     // -2.4..3.6
  score += internet * 3
  score += pc * 3
  score -= trabaja * 4
  score -= reprobadas * 5          // 0..-100

  // Pequeno ajuste por madurez (semestres mas avanzados rinden mejor en promedio).
  score += (semestre - 5) * 1.2

  const puntaje = Math.round(clamp(score, 0, 300))

  let clase = 'medio'
  if (puntaje < 180) clase = 'bajo'
  else if (puntaje >= 240) clase = 'alto'

  // Probabilidad: distancia al centro del rango de la clase, normalizada.
  let probabilidad
  if (clase === 'alto') {
    probabilidad = clamp(0.55 + (puntaje - 240) / 120, 0.55, 0.97)
  } else if (clase === 'bajo') {
    probabilidad = clamp(0.55 + (180 - puntaje) / 120, 0.55, 0.97)
  } else {
    const dist = Math.abs(puntaje - 210) / 30
    probabilidad = clamp(0.55 + (1 - dist) * 0.3, 0.55, 0.9)
  }
  probabilidad = Number(probabilidad.toFixed(4))

  const factores = buildFactores({
    promedio, asistencia, horas, reprobadas, pctCreditos, ingles, simulacros,
  })
  const areas = buildAreas({ basicas, ingenieria, ingles })
  const recomendaciones = buildRecomendaciones({
    clase, promedio, basicas, ingenieria, reprobadas, horas, asistencia,
    nivel_ingles: profile.nivel_ingles,
  })

  return {
    clase,
    puntaje_estimado: puntaje,
    probabilidad,
    factores,
    areas,
    recomendaciones,
    snapshot: profile,
    model_version: 'heuristic-v1',
  }
}

function tone(value, thresholdHigh, thresholdLow) {
  if (value >= thresholdHigh) return 'Positivo'
  if (value <= thresholdLow) return 'A mejorar'
  return 'Moderado'
}

function buildFactores(v) {
  return [
    {
      label: 'Promedio acumulado',
      impact: tone(v.promedio, 4.0, 3.0),
      value: v.promedio.toFixed(2),
    },
    {
      label: 'Asistencia a clases',
      impact: tone(v.asistencia, 90, 70),
      value: `${Math.round(v.asistencia)}%`,
    },
    {
      label: 'Horas de estudio semanales',
      impact: tone(v.horas, 12, 5),
      value: `${v.horas} h/semana`,
    },
    {
      label: 'Materias reprobadas',
      impact: v.reprobadas <= 1 ? 'Positivo' : v.reprobadas <= 3 ? 'Moderado' : 'A mejorar',
      value: `${v.reprobadas}`,
    },
    {
      label: 'Avance en creditos',
      impact: tone(v.pctCreditos, 70, 40),
      value: `${Math.round(v.pctCreditos)}%`,
    },
    {
      label: 'Nivel de ingles',
      impact: v.ingles >= 20 ? 'Positivo' : v.ingles >= 10 ? 'Moderado' : 'A mejorar',
      value: `Bonus ${v.ingles}`,
    },
    {
      label: 'Simulacros completados',
      impact: v.simulacros >= 4 ? 'Positivo' : v.simulacros >= 2 ? 'Moderado' : 'A mejorar',
      value: `${v.simulacros}`,
    },
  ]
}

function buildAreas(v) {
  // Escala a 0-100 sobre las componentes principales del desempeno.
  return [
    {
      id: 'matematicas',
      label: 'Matematicas / Razonamiento cuantitativo',
      score: Math.round(clamp(v.basicas * 18 + 10, 0, 100)),
    },
    {
      id: 'lectura',
      label: 'Lectura critica',
      score: Math.round(clamp(((v.basicas + v.ingenieria) / 2) * 16 + 12, 0, 100)),
    },
    {
      id: 'ingles',
      label: 'Ingles',
      score: Math.round(clamp(40 + v.ingles * 2, 0, 100)),
    },
    {
      id: 'competencias',
      label: 'Competencias ciudadanas',
      score: Math.round(clamp(v.ingenieria * 17 + 15, 0, 100)),
    },
  ]
}

function buildRecomendaciones({
  clase, promedio, basicas, ingenieria, reprobadas, horas, asistencia, nivel_ingles,
}) {
  const improve = []
  const actions = []

  if (promedio < 3.5) {
    improve.push('Elevar el promedio acumulado con asesorias semanales.')
    actions.push('Agendar tutorias en las materias con menor calificacion.')
  }
  if (basicas < 3.5) {
    improve.push('Reforzar fundamentos de matematicas y ciencias basicas.')
    actions.push('Resolver 30 ejercicios semanales de razonamiento cuantitativo.')
  }
  if (ingenieria < 3.5) {
    improve.push('Mejorar desempeno en asignaturas de la linea de ingenieria.')
    actions.push('Formar un grupo de estudio para las materias de ingenieria.')
  }
  if (reprobadas >= 2) {
    improve.push('Recuperar materias reprobadas para evitar atraso academico.')
    actions.push('Inscribir materias de habilitacion el siguiente semestre.')
  }
  if (horas < 10) {
    improve.push('Aumentar la dedicacion semanal al estudio autonomo.')
    actions.push('Bloquear 10 horas semanales fijas para estudio (Pomodoro 25/5).')
  }
  if (asistencia < 85) {
    improve.push('Mejorar asistencia a clases para no perder explicaciones clave.')
    actions.push('Activar recordatorios automaticos y registrar asistencia diaria.')
  }
  if (!nivel_ingles || ['A1', 'A2'].includes(nivel_ingles)) {
    improve.push('Elevar el nivel de ingles para mejorar el componente del Saber Pro.')
    actions.push('Realizar 20 minutos diarios de practica de ingles con apps tipo Duolingo.')
  }

  // Default recommendations si todo va bien.
  if (improve.length === 0) {
    improve.push('Mantener constancia academica y los buenos habitos actuales.')
    actions.push('Realizar 1 simulacro Saber Pro completo cada 3 semanas.')
  }

  // Cierre por clase.
  if (clase === 'bajo') {
    actions.push('Acercarse al consejero academico para construir un plan de recuperacion.')
  } else if (clase === 'alto') {
    actions.push('Postularte a programas de monitoria o semilleros de investigacion.')
  }

  return { improve: improve.slice(0, 5), actions: actions.slice(0, 5) }
}
