import { Router } from 'express'
import {
  createUser,
  findUserByDocumento,
  findUserByEmail,
  findUserByEmailOrDocumento,
  findUserById,
  findUserByIdIncludingInactive,
  sanitizeUserRow,
  updateDocumento,
  updateUserProfile,
  updateUsername,
  updatePasswordHash,
  listUsersForAdmin,
  countActiveUsersByRole,
  countActiveUsersByProgram,
  countInactiveUsers,
  countActiveAdmins,
  upsertUserAsAdmin,
  adminUpdateUser,
  setUserActiveState,
  listAuditLog,
  insertAuditLog,
} from './users.js'
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth.js'
import {
  cohortMetrics,
  getLatestPrediction,
  getProfile,
  listCohort,
  listPredictions,
  savePrediction,
  upsertProfile,
} from './profiles.js'
import { computePrediction } from './predictor.js'
import {
  buildGoogleAuthUrl,
  exchangeCodeForProfile,
  isGoogleOAuthConfigured,
} from './google-oauth.js'

const router = Router()

// =====================================================================
// VALIDACIONES
// =====================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Correo institucional: solo @unac.edu.co
const INSTITUTIONAL_DOMAIN = '@unac.edu.co'
function isInstitutionalEmail(email) {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)
}
// Roles administrativos que pueden iniciar sesion con correo no institucional
// (cuentas de gestion existentes: rector, decano, profesor, administrador).
const ADMIN_ROLES = new Set(['rector', 'decano', 'profesor', 'administrador'])
// Nombre: letras (incluye acentos y ñ) + espacios + apóstrofo/guion.
// Permite el punto solo como abreviación (e.g. "Dr.", "Prof.", "Dra.").
const NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?)*$/
const DOCUMENTO_RE = /^\d{5,15}$/

function validateName(name) {
  const value = (name || '').trim()
  if (value.length < 3) return 'El nombre debe tener al menos 3 caracteres.'
  if (value.length > 80) return 'El nombre no puede superar los 80 caracteres.'
  if (!NAME_RE.test(value)) {
    return 'El nombre solo puede contener letras y espacios (sin numeros ni simbolos).'
  }
  return null
}

function validateEmail(email) {
  const value = (email || '').trim()
  if (!value) return 'El correo es obligatorio.'
  if (value.length > 120) return 'El correo es demasiado largo.'
  if (!EMAIL_RE.test(value)) return 'Correo electronico invalido.'
  if (!isInstitutionalEmail(value)) {
    return 'Debes usar tu correo institucional (@unac.edu.co).'
  }
  return null
}

function validateDocumento(doc) {
  const value = (doc || '').toString().trim()
  if (!value) return 'El documento de identidad es obligatorio.'
  if (!DOCUMENTO_RE.test(value)) {
    return 'El documento debe contener entre 5 y 15 digitos numericos.'
  }
  return null
}

function validatePassword(password) {
  const value = (password || '').toString()
  if (!value.trim()) return 'La contrasena es obligatoria.'
  if (value.trim().length < 6) {
    return 'La contrasena debe tener al menos 6 caracteres.'
  }
  return null
}

// =====================================================================
// MIDDLEWARE
// =====================================================================

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = token ? verifyToken(token) : null
  if (!payload) {
    return res.status(401).json({ ok: false, message: 'No autenticado.' })
  }
  req.userId = payload.sub
  next()
}

// =====================================================================
// RUTAS
// =====================================================================

// POST /api/auth/register
// NOTA: en operacion normal, el registro publico esta deshabilitado.
// Los estudiantes se importan en lote desde el script `import-students.js`
// (que usa el hash directo, sin pasar por este endpoint). Este endpoint se
// mantiene solo para uso administrativo/scripting y exige correo institucional.
router.post('/auth/register', async (req, res) => {
  try {
    const { username, documento, email, password, program } = req.body || {}

    const nameError = validateName(username)
    if (nameError) return res.status(400).json({ ok: false, message: nameError })

    const docError = validateDocumento(documento)
    if (docError) return res.status(400).json({ ok: false, message: docError })

    const emailError = validateEmail(email)
    if (emailError) return res.status(400).json({ ok: false, message: emailError })

    const passError = validatePassword(password)
    if (passError) return res.status(400).json({ ok: false, message: passError })

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedDoc = documento.toString().trim()

    if (await findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ ok: false, message: 'Ese correo ya esta registrado.' })
    }
    if (await findUserByDocumento(normalizedDoc)) {
      return res
        .status(409)
        .json({ ok: false, message: 'Ese documento ya esta registrado.' })
    }

    const safeProgram = program === 'industrial' ? 'industrial' : 'sistemas'
    const studentPrefix = safeProgram === 'industrial' ? 'IND' : 'SIS'
    const studentRecordId = `${studentPrefix}-${Date.now()}`

    const passwordHash = await hashPassword(password.trim())
    const newUser = await createUser({
      documento: normalizedDoc,
      username: username.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'estudiante',
      program: safeProgram,
      studentRecordId,
      semester: '8',
      studyHours: '12',
      englishLevel: 'B1',
    })

    const user = sanitizeUserRow(newUser)
    const token = signToken({ sub: user.id, role: user.role, email: user.email })

    return res
      .status(201)
      .json({ ok: true, message: 'Registro completado.', token, user })
  } catch (err) {
    console.error('[auth/register] error:', err)
    return res.status(500).json({ ok: false, message: 'Error registrando usuario.' })
  }
})

// POST /api/auth/login
// `identifier` puede ser correo o documento. Por compatibilidad también acepta `email`.
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, email, password } = req.body || {}
    const rawId = (identifier ?? email ?? '').toString().trim()

    if (!rawId || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'Usuario y contrasena son obligatorios.' })
    }

    const user = await findUserByEmailOrDocumento(rawId)
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'No existe una cuenta registrada con ese usuario.',
      })
    }

    // Cuenta desactivada: no puede iniciar sesion.
    if (user.is_active === false) {
      return res.status(403).json({
        ok: false,
        message: 'Tu cuenta esta desactivada. Contacta al administrador.',
      })
    }

    // Politica institucional: solo se permite el ingreso con correo
    // @unac.edu.co. Excepcion: cuentas administrativas (rector, decano,
    // profesor) que existan previamente con otro dominio.
    if (!ADMIN_ROLES.has(user.role) && !isInstitutionalEmail(user.email)) {
      return res.status(403).json({
        ok: false,
        message: 'El sistema solo permite el ingreso con correo institucional (@unac.edu.co).',
      })
    }

    const okPass = await verifyPassword(password, user.password_hash)
    if (!okPass) {
      return res.status(401).json({ ok: false, message: 'La contrasena es incorrecta.' })
    }

    const safe = sanitizeUserRow(user)
    const token = signToken({ sub: safe.id, role: safe.role, email: safe.email })

    return res.json({
      ok: true,
      message: `Acceso correcto como ${safe.role}.`,
      token,
      user: safe,
    })
  } catch (err) {
    console.error('[auth/login] error:', err)
    return res.status(500).json({ ok: false, message: 'Error iniciando sesion.' })
  }
})

// GET /api/auth/me
router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.userId)
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    if (user.is_active === false) {
      return res.status(403).json({
        ok: false,
        message: 'Tu cuenta esta desactivada. Contacta al administrador.',
      })
    }
    return res.json({ ok: true, user: sanitizeUserRow(user) })
  } catch (err) {
    console.error('[auth/me] error:', err)
    return res.status(500).json({ ok: false, message: 'Error obteniendo perfil.' })
  }
})

// POST /api/auth/recover  (sólo confirma existencia, igual que la UI actual)
router.post('/auth/recover', async (req, res) => {
  try {
    const { email, identifier } = req.body || {}
    const value = (identifier ?? email ?? '').toString().trim()
    if (!value) {
      return res.status(400).json({ ok: false, message: 'Usuario requerido.' })
    }
    const user = await findUserByEmailOrDocumento(value)
    if (!user) {
      return res
        .status(404)
        .json({ ok: false, message: 'No encontramos una cuenta con ese usuario.' })
    }
    return res.json({
      ok: true,
      message: `Correo validado. La cuenta pertenece al rol ${user.role}.`,
    })
  } catch (err) {
    console.error('[auth/recover] error:', err)
    return res.status(500).json({ ok: false, message: 'Error procesando solicitud.' })
  }
})

// =====================================================================
// OAUTH CON GOOGLE — solo @unac.edu.co
// =====================================================================

// GET /api/auth/google/url?returnTo=/inicio
// Devuelve la URL a la que el frontend debe redirigir al usuario.
router.get('/auth/google/url', (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({
      ok: false,
      message:
        'El ingreso con Google no esta habilitado en este servidor (faltan credenciales).',
    })
  }
  try {
    const returnTo = (req.query.returnTo || '/inicio').toString()
    const url = buildGoogleAuthUrl(returnTo)
    return res.json({ ok: true, url })
  } catch (err) {
    console.error('[auth/google/url] error:', err)
    return res
      .status(500)
      .json({ ok: false, message: 'No se pudo generar la URL de Google.' })
  }
})

// GET /api/auth/google/callback
// Google redirige aqui con ?code=...&state=... Si todo va bien, redirige
// al frontend con el token en el fragmento de la URL (?token=...&ok=1)
// o con ?error=... si algo fallo.
router.get('/auth/google/callback', async (req, res) => {
  const frontend = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  const errorParam = req.query.error
  if (errorParam) {
    const desc = (req.query.error_description || 'Acceso cancelado.').toString()
    return res.redirect(
      `${frontend}/login?google_error=${encodeURIComponent(desc)}`
    )
  }
  const code = (req.query.code || '').toString()
  const state = (req.query.state || '').toString()
  if (!code || !state) {
    return res.redirect(
      `${frontend}/login?google_error=${encodeURIComponent('Faltan parametros en la respuesta de Google.')}`
    )
  }
  try {
    const profile = await exchangeCodeForProfile(code, state)

    // Buscar usuario existente por email.
    let user = await findUserByEmail(profile.email)

    // Si no existe, auto-crear con un password inutilizable. Asi solo podra
    // entrar por Google, nunca con contrasena.
    if (!user) {
      const unusableHash =
        '$2a$10$GOOGlEOAUTHONLY0000000000000000000000000000000000000000'
      const tempDoc = 'G' + Date.now().toString().slice(-12) // documento provisional
      user = await createUser({
        documento: tempDoc,
        username: profile.name,
        email: profile.email,
        passwordHash: unusableHash,
        role: 'estudiante',
        program: 'sistemas',
        studentRecordId: `GOO-${Date.now()}`,
        semester: '1',
        studyHours: '0',
        englishLevel: 'A1',
      })
    }

    const safe = sanitizeUserRow(user)
    const token = signToken({ sub: safe.id, role: safe.role, email: safe.email })

    const ret = (profile.returnTo || '/inicio').toString()
    return res.redirect(
      `${frontend}/login?google_token=${encodeURIComponent(token)}&google_ok=1&returnTo=${encodeURIComponent(ret)}`
    )
  } catch (err) {
    console.error('[auth/google/callback] error:', err.message)
    return res.redirect(
      `${frontend}/login?google_error=${encodeURIComponent(err.message)}`
    )
  }
})

// POST /api/auth/google/exchange
// Variante para SPAs que no quieren un redirect del backend. El frontend
// hace el flujo por su cuenta usando el SDK de Google y nos envia el
// credential (id_token) para que lo verifiquemos y emitamos nuestro JWT.
// (Se deja cableada pero no se usa todavia — la implementacion actual usa
// el redirect tradicional por simplicidad y porque el popup/redirect es lo
// que Google soporta en cualquier entorno sin configuracion extra del
// frontend.)
router.post('/auth/google/exchange', async (req, res) => {
  return res.status(501).json({
    ok: false,
    message: 'Flujo no implementado. Usa el boton "Entrar con Google" del login.',
  })
})

// PATCH /api/profile  (actualizar datos del estudiante)
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const current = await findUserById(req.userId)
    if (!current) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    if (current.role !== 'estudiante') {
      return res
        .status(403)
        .json({ ok: false, message: 'Solo los estudiantes pueden editar este perfil.' })
    }
    const { age, semester, studyHours, englishLevel, program } = req.body || {}
    const updated = await updateUserProfile(req.userId, {
      age,
      semester,
      study_hours: studyHours,
      english_level: englishLevel,
      program,
    })
    return res.json({
      ok: true,
      message: 'Tus datos personales fueron actualizados.',
      user: sanitizeUserRow(updated),
    })
  } catch (err) {
    console.error('[profile] error:', err)
    return res.status(500).json({ ok: false, message: 'Error actualizando perfil.' })
  }
})

// PATCH /api/auth/me  — actualizar nombre y/o documento del usuario autenticado
router.patch('/auth/me', requireAuth, async (req, res) => {
  try {
    const { username, documento } = req.body || {}
    if (username === undefined && documento === undefined) {
      return res
        .status(400)
        .json({ ok: false, message: 'No se enviaron campos para actualizar.' })
    }

    let updated = await findUserById(req.userId)
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    }

    if (username !== undefined) {
      const nameError = validateName(username)
      if (nameError) return res.status(400).json({ ok: false, message: nameError })
      if (username.trim() !== updated.username) {
        updated = await updateUsername(req.userId, username.trim())
      }
    }

    if (documento !== undefined) {
      const docError = validateDocumento(documento)
      if (docError) return res.status(400).json({ ok: false, message: docError })
      const normalizedDoc = documento.toString().trim()
      if (normalizedDoc !== updated.documento) {
        const existing = await findUserByDocumento(normalizedDoc)
        if (existing && existing.id !== req.userId) {
          return res.status(409).json({
            ok: false,
            message: 'Ese documento ya esta registrado por otra cuenta.',
          })
        }
        updated = await updateDocumento(req.userId, normalizedDoc)
      }
    }

    return res.json({
      ok: true,
      message: 'Cuenta actualizada.',
      user: sanitizeUserRow(updated),
    })
  } catch (err) {
    console.error('[auth/me PATCH] error:', err)
    return res.status(500).json({ ok: false, message: 'Error actualizando cuenta.' })
  }
})

// PATCH /api/auth/me/password — cambia la contrasena, requiere la actual.
router.patch('/auth/me/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ ok: false, message: 'Se requiere la contrasena actual y la nueva.' })
    }
    const passError = validatePassword(newPassword)
    if (passError) return res.status(400).json({ ok: false, message: passError })
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ ok: false, message: 'La nueva contrasena debe ser distinta a la actual.' })
    }

    const user = await findUserById(req.userId)
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })

    const okCurrent = await verifyPassword(currentPassword, user.password_hash)
    if (!okCurrent) {
      return res
        .status(401)
        .json({ ok: false, message: 'La contrasena actual es incorrecta.' })
    }

    const newHash = await hashPassword(newPassword.trim())
    const updated = await updatePasswordHash(req.userId, newHash)
    return res.json({
      ok: true,
      message: 'Contrasena actualizada.',
      user: sanitizeUserRow(updated),
    })
  } catch (err) {
    console.error('[auth/me/password PATCH] error:', err)
    return res.status(500).json({ ok: false, message: 'Error actualizando contrasena.' })
  }
})

// =====================================================================
// PERFIL DEL ESTUDIANTE Y PREDICCIONES
// =====================================================================

function requireStudent(req, res, next) {
  if (!req.userId) return res.status(401).json({ ok: false, message: 'No autenticado.' })
  findUserById(req.userId).then((u) => {
    if (!u) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    if (u.role !== 'estudiante') {
      return res
        .status(403)
        .json({ ok: false, message: 'Solo los estudiantes pueden usar este recurso.' })
    }
    req.user = u
    next()
  }).catch((err) => {
    console.error('[requireStudent] error:', err)
    res.status(500).json({ ok: false, message: 'Error verificando usuario.' })
  })
}

// GET /api/student/profile
// Devuelve { profile, prediction } o profile=null si aun no llena el onboarding.
router.get('/student/profile', requireAuth, requireStudent, async (req, res) => {
  try {
    const [profile, prediction] = await Promise.all([
      getProfile(req.userId),
      getLatestPrediction(req.userId),
    ])
    return res.json({ ok: true, profile, prediction })
  } catch (err) {
    console.error('[student/profile GET] error:', err)
    return res.status(500).json({ ok: false, message: 'Error cargando perfil.' })
  }
})

const ENGLISH_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

function validateProfilePayload(p) {
  function badRange(value, lo, hi, label) {
    if (value === undefined || value === null || value === '') return null
    const n = Number(value)
    if (!Number.isFinite(n) || n < lo || n > hi) {
      return `${label} debe estar entre ${lo} y ${hi}.`
    }
    return null
  }
  const checks = [
    badRange(p.promedio_acumulado, 0, 5, 'Promedio acumulado'),
    badRange(p.promedio_basicas, 0, 5, 'Promedio de basicas'),
    badRange(p.promedio_ingenieria, 0, 5, 'Promedio de ingenieria'),
    badRange(p.num_reprobadas, 0, 30, 'Numero de reprobadas'),
    badRange(p.pct_creditos, 0, 100, 'Porcentaje de creditos'),
    badRange(p.semestre, 1, 12, 'Semestre'),
    badRange(p.estrato, 1, 6, 'Estrato'),
    badRange(p.edad, 14, 80, 'Edad'),
    badRange(p.horas_estudio_semana, 0, 80, 'Horas de estudio'),
    badRange(p.simulacros_realizados, 0, 50, 'Simulacros'),
    badRange(p.asistencia_pct, 0, 100, 'Asistencia'),
  ]
  if (p.genero !== undefined && p.genero !== null && p.genero !== '') {
    if (!['M', 'F', 'O'].includes(p.genero)) checks.push('Genero invalido.')
  }
  if (p.nivel_ingles !== undefined && p.nivel_ingles !== null && p.nivel_ingles !== '') {
    if (!ENGLISH_LEVELS.has(p.nivel_ingles)) checks.push('Nivel de ingles invalido.')
  }
  return checks.find(Boolean) || null
}

// PUT /api/student/profile
// Upsert del perfil + recalculo y guardado de la prediccion.
router.put('/student/profile', requireAuth, requireStudent, async (req, res) => {
  try {
    const error = validateProfilePayload(req.body || {})
    if (error) return res.status(400).json({ ok: false, message: error })

    const profile = await upsertProfile(req.userId, req.body || {})
    const prediction = computePrediction(profile)
    const saved = await savePrediction(req.userId, prediction)

    return res.json({
      ok: true,
      message: 'Perfil guardado y prediccion actualizada.',
      profile,
      prediction: saved,
    })
  } catch (err) {
    console.error('[student/profile PUT] error:', err)
    return res
      .status(500)
      .json({ ok: false, message: 'Error guardando el perfil.' })
  }
})

// GET /api/student/predictions
router.get('/student/predictions', requireAuth, requireStudent, async (req, res) => {
  try {
    const list = await listPredictions(req.userId, 10)
    return res.json({ ok: true, predictions: list })
  } catch (err) {
    console.error('[student/predictions] error:', err)
    return res.status(500).json({ ok: false, message: 'Error cargando historial.' })
  }
})

// =====================================================================
// COHORTE — para profesor / decano / rector
// =====================================================================

router.get('/cohort/students', requireAuth, async (req, res) => {
  try {
    const me = await findUserById(req.userId)
    if (!me) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    if (!['rector', 'decano', 'profesor', 'administrador'].includes(me.role)) {
      return res
        .status(403)
        .json({ ok: false, message: 'No autorizado para ver la cohorte.' })
    }

    // Rector y administrador ven todo. Decano/Profesor ven solo SU programa,
    // salvo que explicitamente pidan otro (no se permite saltar la
    // restriccion). El administrador puede forzar un programa concreto.
    const requested = req.query.program
    let program = 'all'
    if (me.role === 'rector' || me.role === 'administrador') {
      program = ['sistemas', 'industrial', 'all'].includes(requested) ? requested : 'all'
    } else {
      program = me.program === 'all' ? (requested || 'all') : me.program
    }

    const [students, metrics] = await Promise.all([
      listCohort({ program }),
      cohortMetrics({ program }),
    ])
    return res.json({ ok: true, program, students, metrics })
  } catch (err) {
    console.error('[cohort/students] error:', err)
    return res.status(500).json({ ok: false, message: 'Error cargando cohorte.' })
  }
})

// =====================================================================
// ADMINISTRACION (solo rol 'administrador')
// =====================================================================

function requireAdmin(req, res, next) {
  // Asume requireAuth ya ejecutado.
  findUserById(req.userId).then((u) => {
    if (!u) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    if (u.role !== 'administrador') {
      return res
        .status(403)
        .json({ ok: false, message: 'Solo el administrador puede usar este recurso.' })
    }
    req.adminUser = u
    next()
  }).catch((err) => {
    console.error('[requireAdmin] error:', err)
    res.status(500).json({ ok: false, message: 'Error verificando permisos.' })
  })
}

// GET /api/admin/stats
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [byRole, byProgram, totalInactivos, adminsActivos] = await Promise.all([
      countActiveUsersByRole(),
      countActiveUsersByProgram(),
      countInactiveUsers(),
      countActiveAdmins(),
    ])
    const totalActivos = Object.values(byRole).reduce((a, b) => a + b, 0)
    return res.json({
      ok: true,
      total: totalActivos,
      totalInactivos,
      byRole,
      byProgram,
      admins: { activos: adminsActivos, inactivos: totalInactivos - adminsActivos >= 0 ? 0 : 0 },
    })
  } catch (err) {
    console.error('[admin/stats] error:', err)
    return res.status(500).json({ ok: false, message: 'Error cargando estadisticas.' })
  }
})

// GET /api/admin/users
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const role = req.query.role ? String(req.query.role) : undefined
    const program = req.query.program ? String(req.query.program) : undefined
    const isActive =
      req.query.isActive === undefined ? true : req.query.isActive === 'true' || req.query.isActive === true
    const search = req.query.search ? String(req.query.search) : undefined
    let limit = parseInt(req.query.limit, 10)
    let offset = parseInt(req.query.offset, 10)
    if (!Number.isFinite(limit) || limit <= 0) limit = 50
    if (limit > 200) limit = 200
    if (!Number.isFinite(offset) || offset < 0) offset = 0

    const { rows, total } = await listUsersForAdmin({ role, program, isActive, search, limit, offset })
    return res.json({
      ok: true,
      users: rows.map(sanitizeUserRow),
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[admin/users GET] error:', err)
    return res.status(500).json({ ok: false, message: 'Error listando usuarios.' })
  }
})

// POST /api/admin/users  (upsert con asignacion de rol)
router.post('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { documento, username, email, role, program } = req.body || {}

    const nameError = validateName(username)
    if (nameError) return res.status(400).json({ ok: false, message: nameError })
    const docError = validateDocumento(documento)
    if (docError) return res.status(400).json({ ok: false, message: docError })
    const emailError = validateEmail(email)
    if (emailError) return res.status(400).json({ ok: false, message: emailError })

    if (!['rector', 'decano', 'profesor', 'administrador', 'estudiante'].includes(role)) {
      return res.status(400).json({ ok: false, message: 'Rol invalido.' })
    }
    if (!['sistemas', 'industrial', 'all'].includes(program)) {
      return res.status(400).json({ ok: false, message: 'Programa invalido.' })
    }
    // Regla: estudiante siempre en un programa concreto.
    const safeProgram = role === 'estudiante' ? 'sistemas' : program
    const normalizedDoc = String(documento).trim()
    const normalizedEmail = String(email).trim().toLowerCase()

    const passwordHash = await hashPassword(normalizedDoc)
    const client = await (await import('./db.js')).pool.connect()
    try {
      await client.query('BEGIN')
      // Verificar conflictos de unicidad antes de tocar nada.
      const conflicts = await client.query(
        `SELECT id, documento, email FROM usuarios
           WHERE (documento = $1 AND id <> COALESCE(
                    (SELECT id FROM usuarios WHERE documento = $1 LIMIT 1), -1))
              OR (LOWER(email) = LOWER($2) AND id <> COALESCE(
                    (SELECT id FROM usuarios WHERE LOWER(email) = LOWER($2) LIMIT 1), -1))
           LIMIT 5`,
        [normalizedDoc, normalizedEmail],
      )
      if (conflicts.rows.length) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          ok: false,
          message: 'Documento o correo ya registrados por otra cuenta.',
        })
      }
      const { row, accion } = await upsertUserAsAdmin(client, {
        documento: normalizedDoc,
        username: username.trim(),
        email: normalizedEmail,
        role,
        program: safeProgram,
        passwordHash,
      })
      await insertAuditLog(client, {
        adminId: req.userId,
        adminEmail: req.adminUser.email,
        accion: 'USER_UPSERT',
        targetId: row.id,
        targetDocumento: row.documento,
        detalles: { accion, role, program: safeProgram },
      })
      await client.query('COMMIT')
      return res
        .status(accion === 'creado' ? 201 : 200)
        .json({ ok: true, accion, user: sanitizeUserRow(row) })
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[admin/users POST] error:', err)
    return res.status(500).json({ ok: false, message: 'Error guardando usuario.' })
  }
})

// PATCH /api/admin/users/:id
router.patch('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, message: 'ID invalido.' })
    }
    const current = await findUserByIdIncludingInactive(id)
    if (!current) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })

    const { username, email, role, program } = req.body || {}
    const updates = {}
    if (username !== undefined) {
      const e = validateName(username)
      if (e) return res.status(400).json({ ok: false, message: e })
      updates.username = username.trim()
    }
    if (email !== undefined) {
      const e = validateEmail(email)
      if (e) return res.status(400).json({ ok: false, message: e })
      updates.email = String(email).trim().toLowerCase()
      const dup = await findUserByEmail(updates.email)
      if (dup && dup.id !== id) {
        return res.status(409).json({ ok: false, message: 'Ese correo ya esta registrado por otra cuenta.' })
      }
    }
    if (role !== undefined) {
      if (!['rector', 'decano', 'profesor', 'administrador', 'estudiante'].includes(role)) {
        return res.status(400).json({ ok: false, message: 'Rol invalido.' })
      }
      updates.role = role
    }
    if (program !== undefined) {
      if (!['sistemas', 'industrial', 'all'].includes(program)) {
        return res.status(400).json({ ok: false, message: 'Programa invalido.' })
      }
      updates.program = program
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, message: 'No hay cambios para guardar.' })
    }

    const before = {
      username: current.username,
      email: current.email,
      role: current.role,
      program: current.program,
    }
    const updated = await adminUpdateUser(id, updates)
    const after = {
      username: updated.username,
      email: updated.email,
      role: updated.role,
      program: updated.program,
    }
    await insertAuditLog((await import('./db.js')).pool, {
      adminId: req.userId,
      adminEmail: req.adminUser.email,
      accion: 'USER_EDIT',
      targetId: id,
      targetDocumento: updated.documento,
      detalles: { before, after, fields: Object.keys(updates) },
    })
    return res.json({ ok: true, user: sanitizeUserRow(updated) })
  } catch (err) {
    console.error('[admin/users PATCH] error:', err)
    return res.status(500).json({ ok: false, message: 'Error editando usuario.' })
  }
})

// POST /api/admin/users/:id/deactivate
router.post('/admin/users/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, message: 'ID invalido.' })
    }
    if (id === req.userId) {
      return res.status(400).json({ ok: false, message: 'No puedes desactivarte a ti mismo.' })
    }
    const current = await findUserByIdIncludingInactive(id)
    if (!current) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })

    if (current.role === 'administrador') {
      const remaining = await countActiveAdmins()
      if (remaining <= 1) {
        return res
          .status(400)
          .json({ ok: false, message: 'Debe quedar al menos un administrador activo.' })
      }
    }
    const updated = await setUserActiveState(id, false)
    await insertAuditLog((await import('./db.js')).pool, {
      adminId: req.userId,
      adminEmail: req.adminUser.email,
      accion: 'USER_DEACTIVATE',
      targetId: id,
      targetDocumento: updated.documento,
      detalles: { role: updated.role },
    })
    return res.json({ ok: true, user: sanitizeUserRow(updated) })
  } catch (err) {
    console.error('[admin/users/deactivate] error:', err)
    return res.status(500).json({ ok: false, message: 'Error desactivando usuario.' })
  }
})

// POST /api/admin/users/:id/activate
router.post('/admin/users/:id/activate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, message: 'ID invalido.' })
    }
    const current = await findUserByIdIncludingInactive(id)
    if (!current) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    const updated = await setUserActiveState(id, true)
    await insertAuditLog((await import('./db.js')).pool, {
      adminId: req.userId,
      adminEmail: req.adminUser.email,
      accion: 'USER_ACTIVATE',
      targetId: id,
      targetDocumento: updated.documento,
      detalles: { role: updated.role },
    })
    return res.json({ ok: true, user: sanitizeUserRow(updated) })
  } catch (err) {
    console.error('[admin/users/activate] error:', err)
    return res.status(500).json({ ok: false, message: 'Error activando usuario.' })
  }
})

// GET /api/admin/audit
router.get('/admin/audit', requireAuth, requireAdmin, async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10)
    let offset = parseInt(req.query.offset, 10)
    if (!Number.isFinite(limit) || limit <= 0) limit = 50
    if (limit > 200) limit = 200
    if (!Number.isFinite(offset) || offset < 0) offset = 0
    const adminEmail = req.query.adminEmail ? String(req.query.adminEmail) : undefined
    const { rows, total } = await listAuditLog({ limit, offset, adminEmail })
    return res.json({ ok: true, entries: rows, total, limit, offset })
  } catch (err) {
    console.error('[admin/audit] error:', err)
    return res.status(500).json({ ok: false, message: 'Error cargando auditoria.' })
  }
})

// GET /api/admin/users/:id/audit
router.get('/admin/users/:id/audit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, message: 'ID invalido.' })
    }
    const target = await findUserByIdIncludingInactive(id)
    if (!target) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' })
    let limit = parseInt(req.query.limit, 10)
    let offset = parseInt(req.query.offset, 10)
    if (!Number.isFinite(limit) || limit <= 0) limit = 50
    if (limit > 200) limit = 200
    if (!Number.isFinite(offset) || offset < 0) offset = 0
    const { rows, total } = await listAuditLog({ targetId: id, limit, offset })
    return res.json({ ok: true, entries: rows, total, limit, offset })
  } catch (err) {
    console.error('[admin/users/audit] error:', err)
    return res.status(500).json({ ok: false, message: 'Error cargando auditoria del usuario.' })
  }
})

export default router
