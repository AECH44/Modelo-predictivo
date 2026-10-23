import { pool } from './db.js'

const PROFILE_COLS = `user_id, promedio_acumulado, promedio_basicas, promedio_ingenieria,
       promedio_programacion, promedio_matematica_estadistica,
       num_reprobadas, pct_creditos, semestre, estrato,
       acceso_internet, acceso_pc, trabaja, genero, edad, ciudad,
       horas_estudio_semana, nivel_ingles, simulacros_realizados,
       asistencia_pct, creditos_aprobados, asignaturas_aprobadas,
       completed, created_at, updated_at`

const PROFILE_FIELDS = [
  'promedio_acumulado',
  'promedio_basicas',
  'promedio_ingenieria',
  'promedio_programacion',
  'promedio_matematica_estadistica',
  'num_reprobadas',
  'pct_creditos',
  'semestre',
  'estrato',
  'acceso_internet',
  'acceso_pc',
  'trabaja',
  'genero',
  'edad',
  'ciudad',
  'horas_estudio_semana',
  'nivel_ingles',
  'simulacros_realizados',
  'asistencia_pct',
  'creditos_aprobados',
  'asignaturas_aprobadas',
]

export function rowToProfile(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    promedio_acumulado: row.promedio_acumulado ? Number(row.promedio_acumulado) : null,
    promedio_basicas: row.promedio_basicas ? Number(row.promedio_basicas) : null,
    promedio_ingenieria: row.promedio_ingenieria ? Number(row.promedio_ingenieria) : null,
    promedio_programacion: row.promedio_programacion ? Number(row.promedio_programacion) : null,
    promedio_matematica_estadistica: row.promedio_matematica_estadistica
      ? Number(row.promedio_matematica_estadistica)
      : null,
    num_reprobadas: row.num_reprobadas,
    pct_creditos: row.pct_creditos ? Number(row.pct_creditos) : null,
    semestre: row.semestre,
    estrato: row.estrato,
    acceso_internet: row.acceso_internet,
    acceso_pc: row.acceso_pc,
    trabaja: row.trabaja,
    genero: row.genero,
    edad: row.edad,
    ciudad: row.ciudad,
    horas_estudio_semana: row.horas_estudio_semana,
    nivel_ingles: row.nivel_ingles,
    simulacros_realizados: row.simulacros_realizados,
    asistencia_pct: row.asistencia_pct ? Number(row.asistencia_pct) : null,
    creditos_aprobados: row.creditos_aprobados,
    asignaturas_aprobadas: row.asignaturas_aprobadas,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getProfile(userId) {
  const { rows } = await pool.query(
    `SELECT ${PROFILE_COLS} FROM student_profiles WHERE user_id = $1`,
    [userId],
  )
  return rows[0] ? rowToProfile(rows[0]) : null
}

// Upsert: si no existe lo crea, si existe actualiza solo los campos enviados.
// `executor` opcional: si se pasa (client de una transaccion) se usa ese
// en lugar del pool — necesario para que vea filas no-aun-committed
// del mismo flujo transaccional (ej: import-students-v2.js).
export async function upsertProfile(userId, fields, executor) {
  const cleaned = {}
  for (const key of PROFILE_FIELDS) {
    if (fields[key] !== undefined) cleaned[key] = fields[key]
  }
  // Marcamos completed=true al cerrar el onboarding.
  cleaned.completed = true

  const keys = Object.keys(cleaned)
  const insertCols = ['user_id', ...keys].join(', ')
  const insertPlaceholders = ['$1', ...keys.map((_, i) => `$${i + 2}`)].join(', ')
  const updateSetters = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
  const values = [userId, ...keys.map((k) => cleaned[k])]

  const sql = `
    INSERT INTO student_profiles (${insertCols})
    VALUES (${insertPlaceholders})
    ON CONFLICT (user_id) DO UPDATE SET ${updateSetters}
    RETURNING ${PROFILE_COLS}
  `
  const runner = executor || pool
  const { rows } = await runner.query(sql, values)
  return rowToProfile(rows[0])
}

// ============================================================
// PREDICTIONS
// ============================================================

export async function savePrediction(userId, prediction, executor) {
  const runner = executor || pool
  const { rows } = await runner.query(
    `INSERT INTO predictions
       (user_id, clase, puntaje_estimado, probabilidad, factores, areas,
        recomendaciones, snapshot, model_version, puntaje_minimo, puntaje_maximo)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11)
     RETURNING id, user_id, clase, puntaje_estimado, probabilidad,
               factores, areas, recomendaciones, snapshot, model_version,
               puntaje_minimo, puntaje_maximo, created_at`,
    [
      userId,
      prediction.clase,
      prediction.puntaje_estimado,
      prediction.probabilidad,
      JSON.stringify(prediction.factores ?? []),
      JSON.stringify(prediction.areas ?? []),
      JSON.stringify(prediction.recomendaciones ?? {}),
      JSON.stringify(prediction.snapshot ?? {}),
      prediction.model_version || 'heuristic-v1',
      prediction.puntaje_minimo ?? null,
      prediction.puntaje_maximo ?? null,
    ],
  )
  return rowToPrediction(rows[0])
}

function rowToPrediction(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    clase: row.clase,
    puntajeEstimado: row.puntaje_estimado,
    // Intervalo de prediccion (modelo v2). NULL en las predicciones viejas.
    puntajeMinimo: row.puntaje_minimo ?? null,
    puntajeMaximo: row.puntaje_maximo ?? null,
    probabilidad: Number(row.probabilidad),
    factores: row.factores,
    areas: row.areas,
    recomendaciones: row.recomendaciones,
    snapshot: row.snapshot,
    modelVersion: row.model_version,
    createdAt: row.created_at,
  }
}

export async function getLatestPrediction(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, clase, puntaje_estimado, probabilidad,
            factores, areas, recomendaciones, snapshot, model_version,
            puntaje_minimo, puntaje_maximo, created_at
     FROM predictions WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  )
  return rows[0] ? rowToPrediction(rows[0]) : null
}

export async function listPredictions(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT id, user_id, clase, puntaje_estimado, probabilidad,
            factores, areas, recomendaciones, snapshot, model_version,
            puntaje_minimo, puntaje_maximo, created_at
     FROM predictions WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  )
  return rows.map(rowToPrediction)
}

// ============================================================
// COHORTE — para profesor/decano/rector
// ============================================================

export async function listCohort({ program }) {
  // LATERAL JOIN para traer la prediccion mas reciente sin duplicar filas.
  // Incluye todos los campos del perfil academico (los 18) para alimentar
  // reportes academicos y graficos demograficos (no solo los basicos).
  const params = []
  let where = `u.role = 'estudiante'`
  if (program && program !== 'all') {
    params.push(program)
    where += ` AND u.program = $${params.length}`
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.documento, u.username, u.email, u.program, u.is_active,
            sp.completed, sp.semestre, sp.horas_estudio_semana,
            sp.nivel_ingles, sp.asistencia_pct,
            sp.promedio_acumulado, sp.promedio_basicas, sp.promedio_ingenieria,
            sp.promedio_programacion, sp.promedio_matematica_estadistica,
            sp.num_reprobadas, sp.pct_creditos, sp.estrato,
            sp.acceso_internet, sp.acceso_pc, sp.trabaja,
            sp.genero, sp.edad, sp.ciudad,
            sp.simulacros_realizados, sp.creditos_aprobados, sp.asignaturas_aprobadas,
            p.clase, p.puntaje_estimado, p.puntaje_minimo, p.puntaje_maximo, p.probabilidad, p.created_at AS prediction_at
     FROM usuarios u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT clase, puntaje_estimado, puntaje_minimo, puntaje_maximo, probabilidad, created_at
       FROM predictions WHERE user_id = u.id
       ORDER BY created_at DESC LIMIT 1
     ) p ON TRUE
     WHERE ${where}
     ORDER BY p.puntaje_estimado DESC NULLS LAST, u.username ASC`,
    params,
  )
  return rows.map((r) => ({
    id: r.id,
    documento: r.documento,
    username: r.username,
    email: r.email,
    program: r.program,
    isActive: r.is_active !== false,
    completed: r.completed === true,
    semestre: r.semestre,
    horasEstudio: r.horas_estudio_semana,
    nivelIngles: r.nivel_ingles,
    asistencia: r.asistencia_pct ? Number(r.asistencia_pct) : null,
    promedioAcumulado: r.promedio_acumulado ? Number(r.promedio_acumulado) : null,
    promedioBasicas: r.promedio_basicas ? Number(r.promedio_basicas) : null,
    promedioIngenieria: r.promedio_ingenieria ? Number(r.promedio_ingenieria) : null,
    promedioProgramacion: r.promedio_programacion ? Number(r.promedio_programacion) : null,
    promedioMatEstadistica: r.promedio_matematica_estadistica
      ? Number(r.promedio_matematica_estadistica)
      : null,
    numReprobadas: r.num_reprobadas,
    pctCreditos: r.pct_creditos ? Number(r.pct_creditos) : null,
    estrato: r.estrato,
    accesoInternet: r.acceso_internet,
    accesoPc: r.acceso_pc,
    trabaja: r.trabaja,
    genero: r.genero,
    edad: r.edad,
    ciudad: r.ciudad,
    simulacrosRealizados: r.simulacros_realizados,
    creditosAprobados: r.creditos_aprobados,
    asignaturasAprobadas: r.asignaturas_aprobadas,
    clase: r.clase,
    puntajeEstimado: r.puntaje_estimado,
    puntajeMinimo: r.puntaje_minimo ?? null,
    puntajeMaximo: r.puntaje_maximo ?? null,
    probabilidad: r.probabilidad ? Number(r.probabilidad) : null,
    predictionAt: r.prediction_at,
  }))
}

// =====================================================================
// REPORT SUMMARY - agregaciones especificas para el panel de Reportes.
// Devuelve distribuciones categoricas, histograma de puntaje, promedios
// academicos y top N (mejor y peor puntaje estimado).
// =====================================================================

// Rangos del histograma de puntaje estimado.
//
// Escala del modelo v2: el puntaje global del Saber Pro va de 0 a 300 (tres
// areas de 100). Los cortes siguen los umbrales de banda del modelo
// (percentiles 30 y 70 de la cohorte: 155.0 y 184.8), de modo que el
// histograma y los paneles de riesgo hablan el mismo lenguaje.
const PUNTAJE_RANGES = [
  { key: '0-120',   min: 0,   max: 120 },
  { key: '121-155', min: 121, max: 155 },
  { key: '156-185', min: 156, max: 185 },
  { key: '186-220', min: 186, max: 220 },
  { key: '221-300', min: 221, max: 300 },
]

// Construye la clausula WHERE para cohortes segun programa.
function cohortWhere(program, startIndex = 0) {
  const params = []
  let where = `u.role = 'estudiante'`
  if (program && program !== 'all') {
    params.push(program)
    where += ` AND u.program = $${startIndex + params.length}`
  }
  return { params, where }
}

function buildBaseJoins(where) {
  return `
    FROM usuarios u
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT clase, puntaje_estimado, probabilidad
      FROM predictions WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
    ) p ON TRUE
    WHERE ${where}
  `
}

function toDistRow(row, key, total) {
  const count = Number(row.count || 0)
  return {
    key: row[key] === null || row[key] === undefined ? 'Sin dato' : String(row[key]),
    count,
    pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
  }
}

export async function getReportSummary({ program }) {
  const w0 = cohortWhere(program, 0)
  const baseJoins = buildBaseJoins(w0.where)
  const baseParams = w0.params

  // Query 1: distribuciones categoricas (nivel_ingles, genero, estrato, trabaja, ciudad).
  // Hacemos 5 queries pequenas para mantener claridad y porque las cardinalidades
  // son pequenas (~7 niveles de ingles, 2 generos, ~6 estratos, etc).
  const [ingles, genero, estrato, trabaja, semestreRaw, horasRaw, ciudad] = await Promise.all([
    pool.query(
      `SELECT nivel_ingles AS key, COUNT(*)::int AS count
       ${baseJoins}
       GROUP BY nivel_ingles ORDER BY nivel_ingles NULLS LAST`,
      baseParams,
    ),
    pool.query(
      `SELECT genero AS key, COUNT(*)::int AS count
       ${baseJoins}
       GROUP BY genero ORDER BY genero NULLS LAST`,
      baseParams,
    ),
    pool.query(
      `SELECT estrato AS key, COUNT(*)::int AS count
       ${baseJoins}
       GROUP BY estrato ORDER BY estrato NULLS LAST`,
      baseParams,
    ),
    pool.query(
      `SELECT trabaja AS key, COUNT(*)::int AS count
       ${baseJoins}
       GROUP BY trabaja ORDER BY trabaja NULLS LAST`,
      baseParams,
    ),
    pool.query(
      `SELECT semestre AS key, COUNT(*)::int AS count
       ${baseJoins}
       GROUP BY semestre ORDER BY semestre NULLS LAST`,
      baseParams,
    ),
    pool.query(
      `SELECT horas_estudio_semana AS key, COUNT(*)::int AS count
       ${baseJoins}
       GROUP BY horas_estudio_semana ORDER BY horas_estudio_semana NULLS LAST`,
      baseParams,
    ),
    pool.query(
      `SELECT ciudad AS key, COUNT(*)::int AS count
       ${baseJoins}
       GROUP BY ciudad ORDER BY count DESC, ciudad ASC NULLS LAST LIMIT 10`,
      baseParams,
    ),
  ])

  // Total de la cohorte para calcular porcentajes.
  const totalRes = await pool.query(`SELECT COUNT(*)::int AS c ${baseJoins}`, baseParams)
  const total = totalRes.rows[0].c

  // Query 2: promedios academicos
  const promediosRes = await pool.query(
    `SELECT
       AVG(sp.promedio_acumulado)::numeric(10,2)   AS promedio_acumulado,
       AVG(sp.promedio_basicas)::numeric(10,2)     AS promedio_basicas,
       AVG(sp.promedio_ingenieria)::numeric(10,2)  AS promedio_ingenieria,
       AVG(sp.promedio_programacion)::numeric(10,2) AS promedio_programacion,
       AVG(sp.promedio_matematica_estadistica)::numeric(10,2) AS promedio_matematica_estadistica,
       AVG(sp.asistencia_pct)::numeric(10,2)       AS asistencia_promedio,
       AVG(sp.horas_estudio_semana)::numeric(10,2) AS horas_estudio_promedio,
       AVG(sp.edad)::numeric(10,2)                  AS edad_promedio,
       AVG(sp.pct_creditos)::numeric(10,2)         AS avance_creditos_promedio,
       SUM(sp.num_reprobadas)::int                 AS total_reprobadas,
       SUM(sp.creditos_aprobados)::int             AS total_creditos_aprobados,
       SUM(sp.asignaturas_aprobadas)::int          AS total_asignaturas_aprobadas,
       SUM(sp.simulacros_realizados)::int          AS total_simulacros
     ${baseJoins}`,
    baseParams,
  )
  const p = promediosRes.rows[0]

  // Query 3: histograma de puntaje estimado por rangos
  const histograma = []
  for (const r of PUNTAJE_RANGES) {
    const { rows: [hr] } = await pool.query(
      `SELECT COUNT(*)::int AS count ${baseJoins} AND p.puntaje_estimado BETWEEN $${baseParams.length + 1} AND $${baseParams.length + 2}`,
      [...baseParams, r.min, r.max],
    )
    histograma.push({ key: r.key, min: r.min, max: r.max, count: hr.count })
  }

  // Query 4: Top 5 mejor y top 5 peor puntaje estimado
  const topMejorRes = await pool.query(
    `SELECT u.id, u.documento, u.username, u.program,
            p.puntaje_estimado, p.probabilidad, p.clase,
            sp.semestre
     ${baseJoins}
       AND p.puntaje_estimado IS NOT NULL
     ORDER BY p.puntaje_estimado DESC
     LIMIT 5`,
    baseParams,
  )
  const topPeorRes = await pool.query(
    `SELECT u.id, u.documento, u.username, u.program,
            p.puntaje_estimado, p.probabilidad, p.clase,
            sp.semestre
     ${baseJoins}
       AND p.puntaje_estimado IS NOT NULL
     ORDER BY p.puntaje_estimado ASC
     LIMIT 5`,
    baseParams,
  )

  function asPct(rows) {
    return rows.map((r) => ({
      key: r.key === null || r.key === undefined ? 'Sin dato' : String(r.key),
      count: r.count,
      pct: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
    }))
  }

  return {
    total,
    distribuciones: {
      nivelIngles: asPct(ingles.rows),
      genero: asPct(genero.rows),
      estrato: asPct(estrato.rows),
      trabaja: asPct(trabaja.rows),
      semestre: asPct(semestreRaw.rows),
      horasEstudio: asPct(horasRaw.rows),
      ciudadesTop: asPct(ciudad.rows),
    },
    promedios: {
      promedioAcumulado: p.promedio_acumulado ? Number(p.promedio_acumulado) : null,
      promedioBasicas: p.promedio_basicas ? Number(p.promedio_basicas) : null,
      promedioIngenieria: p.promedio_ingenieria ? Number(p.promedio_ingenieria) : null,
      promedioProgramacion: p.promedio_programacion ? Number(p.promedio_programacion) : null,
      promedioMatEstadistica: p.promedio_matematica_estadistica
        ? Number(p.promedio_matematica_estadistica)
        : null,
      asistenciaPromedio: p.asistencia_promedio ? Number(p.asistencia_promedio) : null,
      horasEstudioPromedio: p.horas_estudio_promedio ? Number(p.horas_estudio_promedio) : null,
      edadPromedio: p.edad_promedio ? Number(p.edad_promedio) : null,
      avanceCreditosPromedio: p.avance_creditos_promedio
        ? Number(p.avance_creditos_promedio)
        : null,
      totalReprobadas: p.total_reprobadas || 0,
      totalCreditosAprobados: p.total_creditos_aprobados || 0,
      totalAsignaturasAprobadas: p.total_asignaturas_aprobadas || 0,
      totalSimulacros: p.total_simulacros || 0,
    },
    histogramaPuntaje: histograma,
    topMejor: topMejorRes.rows.map((r) => ({
      id: r.id,
      documento: r.documento,
      nombre: r.username,
      programa: r.program,
      semestre: r.semestre,
      puntajeEstimado: r.puntaje_estimado,
      probabilidad: r.probabilidad ? Number(r.probabilidad) : null,
      clase: r.clase,
    })),
    topPeor: topPeorRes.rows.map((r) => ({
      id: r.id,
      documento: r.documento,
      nombre: r.username,
      programa: r.program,
      semestre: r.semestre,
      puntajeEstimado: r.puntaje_estimado,
      probabilidad: r.probabilidad ? Number(r.probabilidad) : null,
      clase: r.clase,
    })),
  }
}

export async function cohortMetrics({ program }) {
  const params = []
  let where = `u.role = 'estudiante'`
  if (program && program !== 'all') {
    params.push(program)
    where += ` AND u.program = $${params.length}`
  }
  // Un solo recorrido agrega conteos para cobertura, distribucion de riesgo
  // y promedio de puntaje estimado. `p.user_id` aparece en el LATERAL para
  // poder contar cuantos estudiantes ya pasaron por el modelo.
  const { rows } = await pool.query(
    `SELECT
       COUNT(DISTINCT u.id)                                       AS total_estudiantes,
       COUNT(DISTINCT sp.user_id) FILTER (WHERE sp.completed)     AS con_perfil,
       COUNT(DISTINCT p.user_id)                                  AS con_prediccion,
       AVG(p.puntaje_estimado)                                    AS promedio_puntaje,
       MIN(p.puntaje_estimado)                                    AS puntaje_minimo,
       MAX(p.puntaje_estimado)                                    AS puntaje_maximo,
       SUM(CASE WHEN p.clase = 'alto'  THEN 1 ELSE 0 END)         AS alto,
       SUM(CASE WHEN p.clase = 'medio' THEN 1 ELSE 0 END)         AS medio,
       SUM(CASE WHEN p.clase = 'bajo'  THEN 1 ELSE 0 END)         AS bajo,
       COUNT(DISTINCT sp.user_id) FILTER (
         WHERE sp.completed AND COALESCE(sp.promedio_acumulado, 0) <= 0
       )                                                          AS sin_datos
     FROM usuarios u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT user_id, clase, puntaje_estimado FROM predictions
       WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
     ) p ON TRUE
     WHERE ${where}`,
    params,
  )
  const r = rows[0]
  const total = Number(r.total_estudiantes) || 0
  const conPerfil = Number(r.con_perfil) || 0
  const conPrediccion = Number(r.con_prediccion) || 0
  const alto = Number(r.alto) || 0
  const medio = Number(r.medio) || 0
  const bajo = Number(r.bajo) || 0
  const sinDatos = Number(r.sin_datos) || 0
  const pct = (n) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)
  return {
    totalEstudiantes: total,
    conPerfil,
    sinPerfil: Math.max(total - conPerfil, 0),
    conPrediccion,
    sinPrediccion: Math.max(conPerfil - conPrediccion, 0),
    sinDatosSuficientes: sinDatos,
    promedioPuntaje: r.promedio_puntaje ? Math.round(Number(r.promedio_puntaje)) : null,
    // Rango del puntaje estimado en la cohorte (modelo v2: escala real ~0-450).
    puntajeMinimo: r.puntaje_minimo !== null ? Number(r.puntaje_minimo) : null,
    puntajeMaximo: r.puntaje_maximo !== null ? Number(r.puntaje_maximo) : null,
    // Desempeno proyectado (la clase que predice el modelo).
    distribucion: { alto, medio, bajo },
    // Riesgo = inversa del desempeno: el riesgo alto es el estudiante que el
    // modelo ubica en la clase baja (necesita intervencion). Es la misma
    // semantica que usa la vista del estudiante (riskFromClase).
    riesgo: { alto: bajo, medio, bajo: alto },
    porcentajes: {
      coberturaPerfil: pct(conPerfil),
      coberturaPrediccion: pct(conPrediccion),
      riesgoAltoPct: pct(bajo),
      riesgoMedioPct: pct(medio),
      riesgoBajoPct: pct(alto),
    },
  }
}
