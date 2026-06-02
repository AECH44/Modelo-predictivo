import { pool } from './db.js'

const PROFILE_COLS = `user_id, promedio_acumulado, promedio_basicas, promedio_ingenieria,
       num_reprobadas, pct_creditos, semestre, estrato,
       acceso_internet, acceso_pc, trabaja, genero, edad, ciudad,
       horas_estudio_semana, nivel_ingles, simulacros_realizados,
       asistencia_pct, completed, created_at, updated_at`

const PROFILE_FIELDS = [
  'promedio_acumulado',
  'promedio_basicas',
  'promedio_ingenieria',
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
]

export function rowToProfile(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    promedio_acumulado: row.promedio_acumulado ? Number(row.promedio_acumulado) : null,
    promedio_basicas: row.promedio_basicas ? Number(row.promedio_basicas) : null,
    promedio_ingenieria: row.promedio_ingenieria ? Number(row.promedio_ingenieria) : null,
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
export async function upsertProfile(userId, fields) {
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
  const { rows } = await pool.query(sql, values)
  return rowToProfile(rows[0])
}

// ============================================================
// PREDICTIONS
// ============================================================

export async function savePrediction(userId, prediction) {
  const { rows } = await pool.query(
    `INSERT INTO predictions
       (user_id, clase, puntaje_estimado, probabilidad, factores, areas,
        recomendaciones, snapshot, model_version)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9)
     RETURNING id, user_id, clase, puntaje_estimado, probabilidad,
               factores, areas, recomendaciones, snapshot, model_version,
               created_at`,
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
            factores, areas, recomendaciones, snapshot, model_version, created_at
     FROM predictions WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  )
  return rows[0] ? rowToPrediction(rows[0]) : null
}

export async function listPredictions(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT id, user_id, clase, puntaje_estimado, probabilidad,
            factores, areas, recomendaciones, snapshot, model_version, created_at
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
  const params = []
  let where = `u.role = 'estudiante'`
  if (program && program !== 'all') {
    params.push(program)
    where += ` AND u.program = $${params.length}`
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.documento, u.username, u.email, u.program,
            sp.completed, sp.semestre, sp.horas_estudio_semana,
            sp.nivel_ingles, sp.asistencia_pct,
            p.clase, p.puntaje_estimado, p.probabilidad, p.created_at AS prediction_at
     FROM usuarios u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT clase, puntaje_estimado, probabilidad, created_at
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
    completed: r.completed === true,
    semestre: r.semestre,
    horasEstudio: r.horas_estudio_semana,
    nivelIngles: r.nivel_ingles,
    asistencia: r.asistencia_pct ? Number(r.asistencia_pct) : null,
    clase: r.clase,
    puntajeEstimado: r.puntaje_estimado,
    probabilidad: r.probabilidad ? Number(r.probabilidad) : null,
    predictionAt: r.prediction_at,
  }))
}

export async function cohortMetrics({ program }) {
  const params = []
  let where = `u.role = 'estudiante'`
  if (program && program !== 'all') {
    params.push(program)
    where += ` AND u.program = $${params.length}`
  }
  const { rows } = await pool.query(
    `SELECT
       COUNT(DISTINCT u.id)                                       AS total_estudiantes,
       COUNT(DISTINCT sp.user_id) FILTER (WHERE sp.completed)     AS con_perfil,
       AVG(p.puntaje_estimado)                                    AS promedio_puntaje,
       SUM(CASE WHEN p.clase = 'alto'  THEN 1 ELSE 0 END)         AS alto,
       SUM(CASE WHEN p.clase = 'medio' THEN 1 ELSE 0 END)         AS medio,
       SUM(CASE WHEN p.clase = 'bajo'  THEN 1 ELSE 0 END)         AS bajo
     FROM usuarios u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT clase, puntaje_estimado FROM predictions
       WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
     ) p ON TRUE
     WHERE ${where}`,
    params,
  )
  const r = rows[0]
  return {
    totalEstudiantes: Number(r.total_estudiantes) || 0,
    conPerfil: Number(r.con_perfil) || 0,
    promedioPuntaje: r.promedio_puntaje ? Math.round(Number(r.promedio_puntaje)) : null,
    distribucion: {
      alto: Number(r.alto) || 0,
      medio: Number(r.medio) || 0,
      bajo: Number(r.bajo) || 0,
    },
  }
}
