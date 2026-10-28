import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'url'
import { pool } from './db.js'
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
  getReportSummary,
  savePrediction,
  upsertProfile,
} from './profiles.js'
import { computePrediction } from './predictor.js'
import { parseCsvRow, validateRow, splitMetadata } from './lib/csv-to-profile.js'
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
// (cuentas de gestion existentes: rector, decano, administrador).
const ADMIN_ROLES = new Set(['rector', 'decano', 'administrador'])
// Nombre: letras (incluye acentos y ñ) + espacios + apóstrofo/guion.
// Permite el punto solo como abreviación (e.g. "Dr.", "Prof.", "Dra.").
const NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?)*$/
const DOCUMENTO_RE = /^\d{5,15}$/

// Hash truncado de un identificador (email o documento). Se usa en logs
// para evitar guardar el dato crudo pero permitir correlacionar intentos.
function hashIdentifier(value) {
  return crypto
    .createHash('sha256')
    .update(String(value || '').toLowerCase().trim())
    .digest('hex')
    .slice(0, 12)
}

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
      // Auditoria: intento de login con identificador desconocido.
      // Guardamos solo el hash del identificador para no exponer el dato crudo.
      insertAuditLog(pool, {
        accion: 'LOGIN_FAIL',
        detalles: { reason: 'no_user', identifier_hash: hashIdentifier(rawId) },
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.error('[audit] failed:', e.message))
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

    // Cuentas sinteticas (generadas desde datasets): no son personas reales,
    // solo existen para que la cohorte muestre informacion real en la UI.
    if (user.is_synthetic === true) {
      return res.status(403).json({
        ok: false,
        message: 'Esta cuenta es de uso institucional y no permite inicio de sesion.',
      })
    }

    // Politica de email:
    //  - Admins (rector/decano/administrador): exentos.
    //  - Estudiantes: el CSV identificado es el roster autoritativo. Si
    //    findUserByEmailOrDocumento encontro al usuario, su correo ya fue
    //    cargado desde el CSV por import-students-v2.js. Aceptamos cualquier
    //    dominio (Gmail, institucionales, etc.) sin restringir.
    //  - Otros roles no-admin: defensa en profundidad, mantener @unac.edu.co.
    if (!ADMIN_ROLES.has(user.role)) {
      if (user.role !== 'estudiante' && !isInstitutionalEmail(user.email)) {
        return res.status(403).json({
          ok: false,
          message: 'El sistema solo permite el ingreso con correo institucional (@unac.edu.co).',
        })
      }
    }

    const okPass = await verifyPassword(password, user.password_hash)
    if (!okPass) {
      insertAuditLog(pool, {
        adminId: user.id,
        adminEmail: user.email,
        accion: 'LOGIN_FAIL',
        detalles: { reason: 'bad_password' },
        userAgent: req.headers['user-agent'],
      }).catch((e) => console.error('[audit] failed:', e.message))
      return res.status(401).json({ ok: false, message: 'La contrasena es incorrecta.' })
    }

    const safe = sanitizeUserRow(user)
    const token = signToken({ sub: safe.id, role: safe.role, email: safe.email })

    insertAuditLog(pool, {
      adminId: safe.id,
      adminEmail: safe.email,
      accion: 'LOGIN_SUCCESS',
      detalles: { role: safe.role },
      userAgent: req.headers['user-agent'],
    }).catch((e) => console.error('[audit] failed:', e.message))

    // Lazy fallback: si el estudiante no tiene perfil completado (p.ej. el
    // loader no corrió para esta fila), buscamos su fila en
    // dataset_saber_pro_real por email, completamos perfil y prediccion.
    // Si falla, NO rompemos el login: el estudiante podrá navegar y el
    // admin podrá correr /admin/recompute-predictions despues.
    let studentPrediction = null
    if (safe.role === 'estudiante') {
      studentPrediction = await ensureStudentPredictionOnLogin(safe.id, req.headers['user-agent'])
    }

    return res.json({
      ok: true,
      message: `Acceso correcto como ${safe.role}.`,
      token,
      user: safe,
      prediction: studentPrediction,
    })
  } catch (err) {
    console.error('[auth/login] error:', err)
    return res.status(500).json({ ok: false, message: 'Error iniciando sesion.' })
  }
})

// =====================================================================
// Lazy fallback: completar perfil + prediccion al login del estudiante.
//
// Si el usuario es estudiante y aun no tiene perfil completado, buscamos
// su fila en dataset_saber_pro_real por el email de su cuenta. Si la
// encontramos, construimos el perfil desde el CSV, lo persistimos con
// completed=true, computamos la prediccion y la guardamos.
//
// Devuelve la prediccion guardada (row de la tabla predictions) o null
// si no se pudo completar (registro no encontrado, error de parseo,
// fallo del predictor, etc.). NUNCA lanza: un fallo aqui NO rompe el login.
// =====================================================================
async function ensureStudentPredictionOnLogin(userId, userAgent) {
  try {
    const existing = await getProfile(userId)
    if (existing && existing.completed) return null

    const user = await findUserById(userId)
    if (!user) return null
    const email = (user.email || '').trim().toLowerCase()
    if (!email) return null

    const { rows } = await pool.query(
      `SELECT nombres, identificacion, correo, carnet,
              promedio_acumulado, promedio_materias_basicas,
              promedio_programacion, promedio_matematica_estadistica,
              semestre_actual, porcentaje_avance,
              asignaturas_reprobadas, creditos_aprobados,
              asignaturas_aprobadas, estrato, condicion_laboral_raw,
              genero, edad, ciudad_residencia_actual, promedio_ingles_raw
         FROM dataset_saber_pro_real
        WHERE LOWER(correo) = $1
        LIMIT 1`,
      [email],
    )
    if (!rows.length) {
      console.warn(`[lazy-fallback] user_id=${userId} email=${email} sin fila en CSV`)
      return null
    }
    const csvRow = rows[0]
    // Reconstruir el shape "raw" que espera parseCsvRow (DictReader-style).
    const raw = {
      NOMBRES: csvRow.nombres,
      IDENTIFICACION: csvRow.identificacion,
      CORREO: csvRow.correo,
      CARNET: csvRow.carnet,
      SEMESTRE_ACTUAL: csvRow.semestre_actual,
      PORCENTAJE_AVANCE: csvRow.porcentaje_avance,
      PROMEDIO_ACUMULADO: csvRow.promedio_acumulado,
      PROMEDIO_MATERIAS_BASICAS: csvRow.promedio_materias_basicas,
      PROMEDIO_PROGRAMACION: csvRow.promedio_programacion,
      PROMEDIO_MATEMATICA_ESTADISTICA: csvRow.promedio_matematica_estadistica,
      ASIGNATURAS_REPROBADAS: csvRow.asignaturas_reprobadas,
      CREDITOS_APROBADOS: csvRow.creditos_aprobados,
      ASIGNATURAS_APROBADAS: csvRow.asignaturas_aprobadas,
      ESTRATO: csvRow.estrato,
      CONDICION_LABORAL: csvRow.condicion_laboral_raw,
      GENERO: csvRow.genero,
      EDAD: csvRow.edad,
      CIUDAD_RESIDENCIA_ACTUAL: csvRow.ciudad_residencia_actual,
      PROMEDIO_INGLES: csvRow.promedio_ingles_raw,
    }
    const parsed = parseCsvRow(raw)
    const validation = validateRow(parsed)
    if (!validation.ok) {
      console.warn(`[lazy-fallback] user_id=${userId} validate fallo: ${validation.reason}`)
      return null
    }
    const { profileFields } = splitMetadata(validation.data)
    const profile = await upsertProfile(userId, profileFields)
    const prediction = await computePrediction(profile)
    // Sin historial academico no hay prediccion que guardar (ver predictor.js).
    const saved = prediction ? await savePrediction(userId, prediction) : null
    insertAuditLog(pool, {
      adminId: userId,
      adminEmail: user.email,
      accion: 'STUDENT_LAZY_PROVISION',
      detalles: { source: 'dataset_saber_pro_real' },
      userAgent: userAgent || null,
    }).catch((e) => console.error('[audit] failed:', e.message))
    return saved
  } catch (err) {
    console.error('[lazy-fallback] error:', err.message)
    return null
  }
}

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
    insertAuditLog(pool, {
      accion: 'RECOVER_REQUEST',
      detalles: {
        found: !!user,
        identifier_hash: hashIdentifier(value),
      },
      userAgent: req.headers['user-agent'],
    }).catch((e) => console.error('[audit] failed:', e.message))
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

    // Bloquear login de cuentas sinteticas (cohorte anonima).
    if (user && user.is_synthetic === true) {
      return res.redirect(
        `${frontend}/login?google_error=${encodeURIComponent('Esta cuenta institucional no permite inicio de sesion.')}`
      )
    }

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
    insertAuditLog(pool, {
      adminId: user.id,
      adminEmail: user.email,
      accion: 'PASSWORD_CHANGE',
      userAgent: req.headers['user-agent'],
    }).catch((e) => console.error('[audit] failed:', e.message))
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
    const prediction = await computePrediction(profile)
    // Si el estudiante aun no tiene historial academico no hay prediccion que
    // generar: se guarda el perfil y se informa que faltan datos.
    const saved = prediction ? await savePrediction(req.userId, prediction) : null

    return res.json({
      ok: true,
      message: saved
        ? 'Perfil guardado y prediccion actualizada.'
        : 'Perfil guardado. Aun no tienes datos academicos suficientes para generar una prediccion.',
      profile,
      prediction: saved,
      sinDatosSuficientes: !saved,
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
    if (!['rector', 'decano', 'administrador'].includes(me.role)) {
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

// GET /api/admin/report-summary?program=sistemas|all
// Devuelve agregaciones especificas para el panel de Reportes:
// distribuciones (ingles, genero, estrato, etc.), histograma de puntaje,
// promedios academicos y top N mejor/peor predicho.
router.get('/admin/report-summary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const program = req.query.program ? String(req.query.program) : 'all'
    const summary = await getReportSummary({ program })
    return res.json({ ok: true, ...summary })
  } catch (err) {
    console.error('[admin/report-summary] error:', err)
    return res.status(500).json({ ok: false, message: 'Error generando el resumen.' })
  }
})

// POST /api/admin/recompute-predictions
// Regenera la prediccion para TODOS los estudiantes con perfil completed.
// Util despues de cargas masivas (ETL desde SQL Server) o cambios en el predictor.
router.post('/admin/recompute-predictions', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Traemos las 21 columnas de PROFILE_FIELDS para que computePrediction
    // reciba el mismo perfil completo que recibe un estudiante individual en
    // PUT /api/student/profile. Si faltara alguna, predictor.js caeria en sus
    // valores por defecto y la prediccion seria distinta de la real.
    const { rows: students } = await pool.query(`
      SELECT sp.user_id, sp.promedio_acumulado, sp.promedio_basicas, sp.promedio_ingenieria,
             sp.promedio_programacion, sp.promedio_matematica_estadistica,
             sp.num_reprobadas, sp.pct_creditos, sp.semestre, sp.estrato,
             sp.acceso_internet, sp.acceso_pc, sp.trabaja, sp.genero, sp.edad, sp.ciudad,
             sp.horas_estudio_semana, sp.nivel_ingles, sp.simulacros_realizados,
             sp.asistencia_pct, sp.creditos_aprobados, sp.asignaturas_aprobadas
      FROM student_profiles sp
      WHERE sp.completed = true
    `)
    let ok = 0, err = 0, sinDatos = 0, heuristicas = 0
    for (const r of students) {
      try {
        const prediction = await computePrediction(r)
        if (!prediction) {
          // Sin historial academico no hay prediccion. Ademas borramos cualquier
          // prediccion previa para que no quede una clase vieja con confianza
          // inventada.
          await pool.query('DELETE FROM predictions WHERE user_id = $1', [r.user_id])
          sinDatos++
          continue
        }
        // Si el servicio ML no estaba disponible, el predictor devuelve el
        // fallback heuristico: ese puntaje NO viene del modelo y no debe
        // mezclarse con las predicciones reales sin que quede registrado.
        if (prediction.model_version === 'heuristic-v1') heuristicas++
        await savePrediction(r.user_id, prediction)
        ok++
      } catch (e) {
        err++
        console.error(`[recompute] user_id=${r.user_id} err:`, e.message)
      }
    }
    insertAuditLog(pool, {
      adminId: req.userId,
      adminEmail: req.adminUser.email,
      accion: 'update_user',
      targetId: null,
      targetDocumento: null,
      detalles: { accion: 'recompute_predictions', total: students.length, ok, err, sinDatos, heuristicas },
      userAgent: req.headers['user-agent'],
    }).catch(() => {})
    return res.json({
      ok: true,
      total: students.length,
      generated: ok,
      errors: err,
      sinDatosSuficientes: sinDatos,
      // > 0 significa que el servicio ML no respondio y esas predicciones son
      // heuristicas, no del modelo.
      heuristicas,
    })
  } catch (err) {
    console.error('[admin/recompute] error:', err)
    return res.status(500).json({ ok: false, message: 'Error regenerando predicciones.' })
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

    if (!['rector', 'decano', 'administrador', 'estudiante'].includes(role)) {
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
        userAgent: req.headers['user-agent'],
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
      if (!['rector', 'decano', 'administrador', 'estudiante'].includes(role)) {
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
      userAgent: req.headers['user-agent'],
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
      userAgent: req.headers['user-agent'],
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
      userAgent: req.headers['user-agent'],
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
    const accion = req.query.accion ? String(req.query.accion) : undefined
    const createdAtFrom = req.query.createdAtFrom ? String(req.query.createdAtFrom) : undefined
    const createdAtTo = req.query.createdAtTo ? String(req.query.createdAtTo) : undefined
    const { rows, total } = await listAuditLog({
      limit,
      offset,
      adminEmail,
      accion,
      createdAtFrom,
      createdAtTo,
    })
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

// =====================================================================
// ANALISIS DEL MODELO ML (solo administrador)
// Sirven las metricas del modelo v2 (saberpro-v2), las stats del dataset
// y un proxy al predictor FastAPI para que la UI pruebe el modelo.
// =====================================================================

// Metricas del modelo entrenado.
//
// El script ml-training/train_saberpro_v2.py las guarda en
// ml-training/models/saberpro_v2_metrics.json.
//
// La ruta se resuelve igual en el host y en el contenedor:
//   host:       backend/src -> <repo>/ml-training/models
//   contenedor: /app/src     -> /ml-training/models   (volumen en compose)
// Sin ese volumen montado, este endpoint responde 404 y el panel
// "Analisis del modelo" aparece vacio en produccion.
function readTrainingMetrics() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(here, '..', '..', 'ml-training', 'models', 'saberpro_v2_metrics.json'),
  ]
  for (const p of candidates) {
    try {
      return { raw: JSON.parse(fs.readFileSync(p, 'utf-8')), path: p }
    } catch {
      // siguiente candidato
    }
  }
  return null
}

// Etiquetas legibles de las tres areas del Saber Pro.
const AREA_LABELS = {
  matematicas: 'Matematicas',
  lectura_critica: 'Lectura critica',
  ingles: 'Ingles',
}

// Cortes de banda por defecto (percentiles 30 y 70 de la cohorte). Se usan
// solo como respaldo si no se puede leer el JSON de metricas.
const DEFAULT_BANDS = { bajo_max: 155, medio_max: 184 }

function round(value, digits = 4) {
  const n = Number(value)
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : null
}

// Normaliza el JSON crudo del entrenamiento a la forma que consume el
// panel. Se hace aqui para que la UI no dependa de la estructura interna
// del artefacto.
function normalizeTrainingMetrics(raw) {
  const porTarget = raw.resultados_por_target || {}
  const globalDirecto = porTarget.global || {}

  // Comparativa de modelos de REGRESION sobre el global. El ganador es el
  // de menor MAE (en el v1 esto era accuracy de un clasificador).
  const comparativa = Object.entries(globalDirecto)
    .map(([modelo, m]) => ({
      modelo,
      mae: round(m.mae, 3),
      rmse: round(m.rmse, 3),
      r2: round(m.r2, 4),
    }))
    .sort((a, b) => a.mae - b.mae)
  if (comparativa.length) comparativa[0].es_mejor = true
  const baseline = comparativa.find((c) => c.modelo === 'DummyMedia') || null

  // Metricas por area: el mejor modelo de cada area y suDummyMedia.
  const areas = Object.keys(AREA_LABELS)
    .filter((clave) => porTarget[clave])
    .map((clave) => {
      const candidatos = porTarget[clave]
      const mejor = Object.entries(candidatos)
        .map(([modelo, m]) => ({ modelo, mae: m.mae }))
        .sort((a, b) => a.mae - b.mae)[0]
      const elegido = candidatos[mejor.modelo]
      const base = candidatos.DummyMedia
      return {
        clave,
        nombre: AREA_LABELS[clave],
        modelo: mejor.modelo,
        mae: round(elegido.mae, 3),
        rmse: round(elegido.rmse, 3),
        r2: round(elegido.r2, 4),
        baseline_mae: base ? round(base.mae, 3) : null,
      }
    })

  // El modelo SERVIDO no es un modelo global: es la suma de las tres
  // areas predichas. Sus metricas vienen en `global_derivado_de_areas`.
  const derivado = raw.global_derivado_de_areas || {}
  const muestra = raw.muestra || {}
  const bandas = raw.bandas_puntaje_global || raw.bandas || {}

  return {
    model_version: raw.model_version || 'saberpro-v2',
    tipo: raw.tipo || 'regresion',
    objetivo: {
      global: raw.target?.global || '',
      escala: raw.target?.escala || '',
      filtro: raw.target?.filtro || '',
      areas: Object.entries(AREA_LABELS).map(([clave, nombre]) => ({
        clave,
        nombre,
        columna_csv: raw.target?.areas?.[clave] || null,
      })),
    },
    muestra: {
      filas_dataset: muestra.filas_totales ?? null,
      con_areas_completas: muestra.con_las_3_areas ?? null,
      sin_areas_completas: muestra.sin_areas_completas ?? null,
      con_historial: muestra.con_historial_academico ?? null,
      excluidas_sin_historial: muestra.excluidas_sin_historial ?? null,
      entrenadas:
        (muestra.con_las_3_areas ?? 0) - (muestra.excluidas_sin_historial ?? 0),
    },
    global: {
      modelo: 'Suma de las tres areas (3 regresores)',
      mae: round(derivado.mae, 3),
      rmse: round(derivado.rmse, 3),
      r2: round(derivado.r2, 4),
      baseline_mae: baseline?.mae ?? null,
      baseline_rmse: baseline?.rmse ?? null,
      baseline_r2: baseline?.r2 ?? null,
      margen_error: round(raw.margen_error_global_mae ?? raw.margen_error_global, 2),
    },
    areas,
    comparativa,
    bandas: {
      bajo_max: bandas.bajo_max ?? DEFAULT_BANDS.bajo_max,
      medio_max: bandas.medio_max ?? DEFAULT_BANDS.medio_max,
      criterio: bandas.criterio || '',
    },
    features: {
      numeric: raw.features?.numeric || [],
      categorical: raw.features?.categorical || [],
      total:
        (raw.features?.numeric?.length || 0) +
        (raw.features?.categorical?.length || 0),
    },
    advertencias: raw.advertencias || [],
    nota_metodologica: raw.nota_metodologica || '',
    diagnostico_edad: raw.diagnostico_residuos_por_edad || [],
  }
}

// Cortes de banda effective (del JSON de metricas si esta disponible).
function trainingBands() {
  const found = readTrainingMetrics()
  if (!found) return { ...DEFAULT_BANDS }
  const bandas = found.raw.bandas_puntaje_global || found.raw.bandas || {}
  return {
    bajo_max: bandas.bajo_max ?? DEFAULT_BANDS.bajo_max,
    medio_max: bandas.medio_max ?? DEFAULT_BANDS.medio_max,
  }
}

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

router.get('/analysis/metrics', requireAuth, requireAdmin, async (_req, res) => {
  const found = readTrainingMetrics()
  if (!found) {
    return res.status(404).json({
      ok: false,
      message:
        'No se encontro saberpro_v2_metrics.json. Corre ml-training/train_saberpro_v2.py.',
    })
  }
  return res.json({ ok: true, metrics: normalizeTrainingMetrics(found.raw) })
})

router.get('/analysis/dataset-stats', requireAuth, requireAdmin, async (_req, res) => {
  try {
    // Criterio del modelo v2: las TRES areas del examen con dato (> 0) y
    // ademas historial academico (promedio_acumulado > 0).
    const totalQ = await pool.query('SELECT COUNT(*)::int AS n FROM dataset_saber_pro_real')
    const { bajo_max, medio_max } = trainingBands()

    const usableQ = await pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE puntaje_matematicas_saber11 > 0
             AND puntaje_lectura_critica_saber11 > 0
             AND puntaje_ingles_saber11 > 0
         )::int AS con_areas,
         COUNT(*) FILTER (
           WHERE puntaje_matematicas_saber11 > 0
             AND puntaje_lectura_critica_saber11 > 0
             AND puntaje_ingles_saber11 > 0
             AND promedio_acumulado > 0
         )::int AS entrenadas
       FROM dataset_saber_pro_real`,
    )

    // Distribucion OBSERVADA por banda: el target real del modelo es la
    // suma de las tres areas (escala 0-300), no una banda del GPA.
    const observadoQ = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE suma < $1)::int AS bajo,
         COUNT(*) FILTER (WHERE suma >= $1 AND suma < $2)::int AS medio,
         COUNT(*) FILTER (WHERE suma >= $2)::int AS alto
       FROM (
         SELECT (puntaje_matematicas_saber11 + puntaje_lectura_critica_saber11
                + puntaje_ingles_saber11) AS suma
           FROM dataset_saber_pro_real
          WHERE puntaje_matematicas_saber11 > 0
            AND puntaje_lectura_critica_saber11 > 0
            AND puntaje_ingles_saber11 > 0
            AND promedio_acumulado > 0
       ) t`,
      [bajo_max, medio_max],
    )

    // Distribucion PREDICHA en la cohorte: la banda que el modelo asigno a
    // cada estudiante evaluado.
    const predichoQ = await pool.query(
      `SELECT clase, COUNT(*)::int AS n FROM predictions GROUP BY clase`,
    )
    const predicho = { Bajo: 0, Medio: 0, Alto: 0 }
    for (const row of predichoQ.rows) {
      const clave = String(row.clase || '').toLowerCase()
      if (clave === 'bajo') predicho.Bajo = row.n
      else if (clave === 'medio') predicho.Medio = row.n
      else if (clave === 'alto') predicho.Alto = row.n
    }

    const entrenadas = usableQ.rows[0].entrenadas || 0
    const observadas = observadoQ.rows[0]

    return res.json({
      ok: true,
      total: totalQ.rows[0].n,
      rows_used: entrenadas,
      rows_excluded: totalQ.rows[0].n - entrenadas,
      con_areas_completas: usableQ.rows[0].con_areas,
      // Distribucion por banda del target real (en la muestra de entrenamiento).
      target_distribution: {
        Bajo: observadas.bajo,
        Medio: observadas.medio,
        Alto: observadas.alto,
      },
      // Distribucion por banda de lo que predijo el modelo en la cohorte.
      predicted_distribution: predicho,
      bands: { bajo_max, medio_max },
    })
  } catch (err) {
    console.error('[analysis/dataset-stats] error:', err)
    return res.status(500).json({ ok: false, message: 'Error consultando BD.' })
  }
})

router.post('/analysis/predict', requireAuth, requireAdmin, async (req, res) => {
  try {
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    })
    const text = await fastapiRes.text()
    let data
    try { data = JSON.parse(text) } catch { data = { detail: text } }
    return res.status(fastapiRes.status).json({ ok: fastapiRes.ok, ...data })
  } catch (err) {
    console.error('[analysis/predict] error:', err)
    return res.status(503).json({
      ok: false,
      message: 'No se pudo contactar el servicio de prediccion (FastAPI en :8000).',
      detail: err.message,
    })
  }
})

// Columnas del modelo que se auditan en el data quality dashboard.
// Mantener alineado con ml-training/train_from_real.py NUMERIC_FEATURES + CATEGORICAL_FEATURES.
const DQ_NUMERIC_COLUMNS = [
  'promedio_materias_basicas',
  'promedio_ingenieria',
  'promedio_programacion',
  'promedio_matematica_estadistica',
  'asignaturas_reprobadas',
  'porcentaje_avance',
  'semestre_actual',
  'estrato',
  'creditos_aprobados',
  'asignaturas_aprobadas',
  'edad',
  'promedio_acumulado',
]
const DQ_CATEGORICAL_COLUMNS = ['genero', 'promedio_ingles_nivel']
const DQ_CATEGORICAL_HISTOGRAMS = ['genero', 'estrato', 'promedio_ingles_nivel']

// GET /api/analysis/data-quality
// Devuelve % de nulos por columna + histogramas de categoricos.
// 2 queries a la BD: una para nulos, otra para histogramas.
router.get('/analysis/data-quality', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const totalQ = await pool.query('SELECT COUNT(*)::int AS n FROM dataset_saber_pro_real')
    const total = totalQ.rows[0].n

    // Query 1: null counts para todas las columnas del modelo en una sola pasada.
    const nullParts = []
    const nullCols = [...DQ_NUMERIC_COLUMNS, ...DQ_CATEGORICAL_COLUMNS]
    for (const col of nullCols) {
      nullParts.push(
        `COUNT(*) FILTER (WHERE ${col} IS NULL) AS n_${col.replace(/[^a-z0-9_]/gi, '_')}`,
      )
    }
    const nullSql = `SELECT ${nullParts.join(', ')} FROM dataset_saber_pro_real`
    const nullRes = await pool.query(nullSql)

    const nulls = {}
    for (const col of nullCols) {
      nulls[col] = Number(nullRes.rows[0][`n_${col.replace(/[^a-z0-9_]/gi, '_')}`] || 0)
    }

    // Query 2: histogramas (1 query por columna para no inflar SQL).
    const categoricals = {}
    for (const col of DQ_CATEGORICAL_HISTOGRAMS) {
      const r = await pool.query(
        `SELECT ${col}::text AS bucket, COUNT(*)::int AS n
           FROM dataset_saber_pro_real
          WHERE ${col} IS NOT NULL
          GROUP BY ${col}
          ORDER BY ${col}`,
      )
      categoricals[col] = {}
      for (const row of r.rows) categoricals[col][row.bucket] = row.n
    }

    // Totales derivados (mismo criterio que analysis/dataset-stats: las tres
    // areas del examen con dato + historial academico).
    const validQ = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE puntaje_matematicas_saber11 > 0
            AND puntaje_lectura_critica_saber11 > 0
            AND puntaje_ingles_saber11 > 0
            AND promedio_acumulado > 0
        )::int AS used,
        COUNT(*) FILTER (
          WHERE NOT COALESCE(
            puntaje_matematicas_saber11 > 0
            AND puntaje_lectura_critica_saber11 > 0
            AND puntaje_ingles_saber11 > 0
            AND promedio_acumulado > 0,
            false
          )
        )::int AS excluded
      FROM dataset_saber_pro_real
    `)

    return res.json({
      ok: true,
      totals: {
        rows: total,
        used: validQ.rows[0].used,
        excluded: validQ.rows[0].excluded,
      },
      nulls,
      null_columns: nullCols,
      categoricals,
    })
  } catch (err) {
    console.error('[analysis/data-quality] error:', err)
    return res.status(500).json({ ok: false, message: 'Error consultando BD.' })
  }
})

// Helper: escapa una celda para CSV (RFC 4180): wrap en comillas y duplicar comillas internas.
function csvCell(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
function csvRow(cells) {
  return cells.map(csvCell).join(',')
}

// GET /api/analysis/export/metrics.csv
// Exporta las metricas del modelo v2 en CSV: la comparativa de regresores
// sobre el global, las metricas por area y la fila del modelo servido.
// Pensado para que el jurado / tutor se lleve el resumen a Excel.
router.get('/analysis/export/metrics.csv', requireAuth, requireAdmin, async (_req, res) => {
  const found = readTrainingMetrics()
  if (!found) {
    return res.status(404).json({
      ok: false,
      message:
        'No se encontro saberpro_v2_metrics.json. Corre ml-training/train_saberpro_v2.py.',
    })
  }
  const metrics = normalizeTrainingMetrics(found.raw)

  const header = [
    'ambito', 'modelo', 'mae', 'rmse', 'r2', 'es_mejor',
  ]
  const lines = [csvRow(header)]

  // 1) Modelo servido: suma de las tres areas.
  lines.push(csvRow([
    'global_servido',
    metrics.global.modelo,
    metrics.global.mae,
    metrics.global.rmse,
    metrics.global.r2,
    '1',
  ]))
  // 2) Comparativa de regresores entrenados directamente sobre el global.
  for (const m of metrics.comparativa) {
    lines.push(csvRow([
      'global_comparativa',
      m.modelo,
      m.mae,
      m.rmse,
      m.r2,
      m.es_mejor ? '1' : '0',
    ]))
  }
  // 3) Metricas por area.
  for (const a of metrics.areas) {
    lines.push(csvRow([a.clave, a.modelo, a.mae, a.rmse, a.r2, '']))
  }
  // Audit log: registrar exportacion (trazabilidad institucional).
  insertAuditLog(pool, {
    adminId: _req.userId,
    adminEmail: _req.adminUser?.email,
    accion: 'EXPORT_METRICS_CSV',
    detalles: { rows: lines.length - 1 },
    userAgent: _req.headers['user-agent'],
  }).catch((e) => console.error('[audit] failed:', e.message))

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="saberpro_metrics.csv"')
  return res.send(lines.join('\n') + '\n')
})

export default router
