import { Router } from 'express'
import {
  createUser,
  findUserByDocumento,
  findUserByEmail,
  findUserByEmailOrDocumento,
  findUserById,
  sanitizeUserRow,
  updateUserProfile,
} from './users.js'
import { hashPassword, signToken, verifyPassword, verifyToken } from './auth.js'

const router = Router()

// =====================================================================
// VALIDACIONES
// =====================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Nombre: letras (incluye acentos y ñ) + espacios + apóstrofo/guion. Mínimo 3 chars.
const NAME_RE = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+)*$/
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

export default router
