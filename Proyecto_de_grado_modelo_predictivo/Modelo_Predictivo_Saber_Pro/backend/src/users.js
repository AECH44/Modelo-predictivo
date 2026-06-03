import { pool } from './db.js'

const ALLOWED_ROLES = new Set(['rector', 'decano', 'profesor', 'administrador', 'estudiante'])
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
    isActive: row.is_active !== false, // default true si la fila es null/undefined
    age: row.age || '',
    studentRecordId: row.student_record_id || '',
    semester: row.semester || '',
    studyHours: row.study_hours || '',
    englishLevel: row.english_level || '',
    createdAt: row.created_at,
  }
}

const SELECT_COLUMNS = `id, documento, username, email, password_hash, role, program,
       is_active, age, student_record_id, semester, study_hours, english_level,
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

export async function updateUsername(id, username) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET username = $1 WHERE id = $2 RETURNING ${SELECT_COLUMNS}`,
    [username, id],
  )
  return rows[0]
}

export async function updateDocumento(id, documento) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET documento = $1 WHERE id = $2 RETURNING ${SELECT_COLUMNS}`,
    [documento, id],
  )
  return rows[0]
}

export async function updatePasswordHash(id, passwordHash) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET password_hash = $1 WHERE id = $2 RETURNING ${SELECT_COLUMNS}`,
    [passwordHash, id],
  )
  return rows[0]
}

// =====================================================================
// FUNCIONES ADMINISTRATIVAS (solo rol 'administrador' las usa)
// =====================================================================

// Variante de findUserById que NO filtra por is_active — util para que
// el admin gestione usuarios desactivados.
export async function findUserByIdIncludingInactive(id) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM usuarios WHERE id = $1 LIMIT 1`,
    [id],
  )
  return rows[0] || null
}

// Listado paginado para el panel admin. Filtros combinables.
// `search` matchea por username, email o documento (ILIKE %search%).
export async function listUsersForAdmin({
  role,
  program,
  isActive = true,
  search,
  limit = 50,
  offset = 0,
} = {}) {
  const where = []
  const params = []
  if (role) {
    params.push(role)
    where.push(`role = $${params.length}`)
  }
  if (program) {
    params.push(program)
    where.push(`program = $${params.length}`)
  }
  if (isActive !== undefined && isActive !== null) {
    params.push(isActive)
    where.push(`is_active = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    where.push(
      `(username ILIKE $${params.length} OR email ILIKE $${params.length} OR documento ILIKE $${params.length})`,
    )
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const totalRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM usuarios ${whereSql}`,
    params,
  )
  params.push(limit, offset)
  const rowsRes = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM usuarios ${whereSql}
       ORDER BY role, username
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )
  return { rows: rowsRes.rows, total: totalRes.rows[0].total }
}

export async function countActiveUsersByRole() {
  const { rows } = await pool.query(
    `SELECT role, COUNT(*)::int AS n FROM usuarios
       WHERE is_active = TRUE GROUP BY role`,
  )
  const out = { rector: 0, decano: 0, profesor: 0, administrador: 0, estudiante: 0 }
  for (const r of rows) out[r.role] = r.n
  return out
}

export async function countActiveUsersByProgram() {
  const { rows } = await pool.query(
    `SELECT program, COUNT(*)::int AS n FROM usuarios
       WHERE is_active = TRUE GROUP BY program`,
  )
  const out = { sistemas: 0, industrial: 0, all: 0 }
  for (const r of rows) out[r.program] = r.n
  return out
}

export async function countInactiveUsers() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM usuarios WHERE is_active = FALSE`,
  )
  return rows[0].n
}

export async function countActiveAdmins() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM usuarios
       WHERE role = 'administrador' AND is_active = TRUE`,
  )
  return rows[0].n
}

// Upsert transaccional: si existe por doc o email actualiza, si no crea.
// Siempre resetea password_hash = hash(documento). Devuelve { row, accion }.
// `client` debe ser un cliente de pg con una transaccion abierta.
export async function upsertUserAsAdmin(client, {
  documento,
  username,
  email,
  role,
  program,
  passwordHash,
}) {
  const found = await client.query(
    `SELECT id FROM usuarios WHERE documento = $1 OR LOWER(email) = LOWER($2) LIMIT 1`,
    [documento, email],
  )
  if (found.rows.length) {
    const id = found.rows[0].id
    const upd = await client.query(
      `UPDATE usuarios
          SET documento = $1, username = $2, email = LOWER($3),
              role = $4, program = $5, password_hash = $6,
              is_active = TRUE, updated_at = NOW()
        WHERE id = $7
        RETURNING ${SELECT_COLUMNS}`,
      [documento, username, email, role, program, passwordHash, id],
    )
    return { row: upd.rows[0], accion: 'actualizado' }
  }
  const ins = await client.query(
    `INSERT INTO usuarios
       (documento, username, email, password_hash, role, program, is_active,
        semester, study_hours, english_level)
     VALUES ($1, $2, LOWER($3), $4, $5, $6, TRUE, '8', '12', 'B1')
     RETURNING ${SELECT_COLUMNS}`,
    [documento, username, email, passwordHash, role, program],
  )
  return { row: ins.rows[0], accion: 'creado' }
}

// Edicion parcial: solo actualiza los campos provistos. NO toca password.
// Si el nuevo role es 'estudiante' y no se envia program, se fuerza 'sistemas'.
export async function adminUpdateUser(id, { username, email, role, program }) {
  const sets = []
  const params = []
  if (username !== undefined) {
    params.push(username)
    sets.push(`username = $${params.length}`)
  }
  if (email !== undefined) {
    params.push(email)
    sets.push(`email = LOWER($${params.length})`)
  }
  if (role !== undefined) {
    params.push(role)
    sets.push(`role = $${params.length}`)
  }
  if (program !== undefined) {
    params.push(program)
    sets.push(`program = $${params.length}`)
  } else if (role === 'estudiante') {
    // Regla: estudiante siempre en un programa concreto.
    sets.push(`program = 'sistemas'`)
  }
  if (!sets.length) return findUserByIdIncludingInactive(id)
  sets.push(`updated_at = NOW()`)
  params.push(id)
  const { rows } = await pool.query(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING ${SELECT_COLUMNS}`,
    params,
  )
  return rows[0]
}

export async function setUserActiveState(id, isActive) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET is_active = $1, updated_at = NOW()
       WHERE id = $2 RETURNING ${SELECT_COLUMNS}`,
    [isActive, id],
  )
  return rows[0]
}

// =====================================================================
// AUDITORIA
// =====================================================================

// Helper: inserta una fila en audit_log. Acepta un client (transaccion) o el pool.
export async function insertAuditLog(executor, {
  adminId,
  adminEmail,
  accion,
  targetId,
  targetDocumento,
  detalles = {},
}) {
  const det = typeof detalles === 'string' ? detalles : JSON.stringify(detalles)
  await executor.query(
    `INSERT INTO audit_log
       (admin_id, admin_email, accion, target_id, target_documento, detalles)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [adminId || null, adminEmail || null, accion, targetId || null, targetDocumento || null, det],
  )
}

const AUDIT_COLUMNS = `id, admin_id, admin_email, accion, target_id,
       target_documento, detalles, created_at`

function rowToAuditEntry(row) {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminEmail: row.admin_email,
    accion: row.accion,
    targetId: row.target_id,
    targetDocumento: row.target_documento,
    detalles: row.detalles,
    createdAt: row.created_at,
  }
}

export async function listAuditLog({ limit = 50, offset = 0, targetId, adminEmail } = {}) {
  const where = []
  const params = []
  if (targetId) {
    params.push(targetId)
    where.push(`target_id = $${params.length}`)
  }
  if (adminEmail) {
    params.push(`%${adminEmail}%`)
    where.push(`admin_email ILIKE $${params.length}`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const totalRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM audit_log ${whereSql}`,
    params,
  )
  params.push(limit, offset)
  const rowsRes = await pool.query(
    `SELECT ${AUDIT_COLUMNS} FROM audit_log ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )
  return {
    rows: rowsRes.rows.map(rowToAuditEntry),
    total: totalRes.rows[0].total,
  }
}
