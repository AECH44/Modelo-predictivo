import { pool } from './db.js'

const ALLOWED_ROLES = new Set(['rector', 'decano', 'profesor', 'estudiante'])
const ALLOWED_PROGRAMS = new Set(['sistemas', 'industrial', 'all'])

export function sanitizeUserRow(row) {
  if (!row) return null
  return {
    id: row.id,
    documento: row.documento,
    username: row.username,
    email: row.email,
    role: row.role,
    program: row.program,
    age: row.age || '',
    studentRecordId: row.student_record_id || '',
    semester: row.semester || '',
    studyHours: row.study_hours || '',
    englishLevel: row.english_level || '',
    createdAt: row.created_at,
  }
}

const SELECT_COLUMNS = `id, documento, username, email, password_hash, role, program, age,
       student_record_id, semester, study_hours, english_level,
       created_at, updated_at`

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  )
  return rows[0] || null
}

export async function findUserByDocumento(documento) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM usuarios WHERE documento = $1 LIMIT 1`,
    [documento],
  )
  return rows[0] || null
}

// Acepta correo o documento — útil para el login.
export async function findUserByEmailOrDocumento(identifier) {
  const value = (identifier || '').trim()
  if (!value) return null
  // Si todo son dígitos, búscalo como documento. Si no, como email.
  if (/^\d{4,20}$/.test(value)) return findUserByDocumento(value)
  return findUserByEmail(value)
}

export async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM usuarios WHERE id = $1 LIMIT 1`,
    [id],
  )
  return rows[0] || null
}

export async function createUser({
  documento,
  username,
  email,
  passwordHash,
  role = 'estudiante',
  program = 'sistemas',
  age = null,
  studentRecordId = null,
  semester = null,
  studyHours = null,
  englishLevel = null,
}) {
  const safeRole = ALLOWED_ROLES.has(role) ? role : 'estudiante'
  const safeProgram = ALLOWED_PROGRAMS.has(program) ? program : 'sistemas'

  const { rows } = await pool.query(
    `INSERT INTO usuarios
       (documento, username, email, password_hash, role, program, age,
        student_record_id, semester, study_hours, english_level)
     VALUES ($1, $2, LOWER($3), $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${SELECT_COLUMNS}`,
    [
      documento,
      username,
      email,
      passwordHash,
      safeRole,
      safeProgram,
      age,
      studentRecordId,
      semester,
      studyHours,
      englishLevel,
    ],
  )
  return rows[0]
}

export async function updateUserProfile(id, fields) {
  const allowed = ['age', 'semester', 'study_hours', 'english_level', 'program']
  const sets = []
  const values = []
  let i = 1
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.includes(k)) continue
    if (v === undefined || v === null || v === '') continue
    sets.push(`${k} = $${i++}`)
    values.push(v)
  }
  if (!sets.length) return findUserById(id)
  values.push(id)
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING ${SELECT_COLUMNS}`,
    values,
  )
  return rows[0]
}
