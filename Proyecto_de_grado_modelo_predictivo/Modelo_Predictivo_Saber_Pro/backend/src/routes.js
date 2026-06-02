import { Router } from 'express'
import {
  createUser,
  findUserByDocumento,
  findUserByEmail,
  findUserByEmailOrDocumento,
  findUserById,
  sanitizeUserRow,
  updateDocumento,
  updateUserProfile,
  updateUsername,
  updatePasswordHash,
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

const router = Router()

// =====================================================================
// VALIDACIONES
// =====================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
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
    if (!['rector', 'decano', 'profesor'].includes(me.role)) {
      return res
        .status(403)
        .json({ ok: false, message: 'No autorizado para ver la cohorte.' })
    }

    // Rector ve todo. Decano/Profesor ven solo SU programa, salvo que
    // explicitamente pidan otro (no se permite saltar la restriccion).
    const requested = req.query.program
    let program = 'all'
    if (me.role === 'rector') {
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

export default router
