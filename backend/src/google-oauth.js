// OAuth 2.0 con Google — flujo "Authorization Code".
// Se activa solo si GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET estan definidas
// en el entorno. Si no, las rutas /auth/google/* devuelven 503.
import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'

const INSTITUTIONAL_DOMAIN = '@unac.edu.co'
const SCOPES = ['openid', 'email', 'profile']

// Estado en memoria para mitigar CSRF. En produccion real esto deberia
// persistirse (Redis, BD) para sobrevivir reinicios y multiples instancias,
// pero para una sola instancia local con dev basta.
const stateStore = new Map() // state -> { createdAt, returnTo }
const STATE_TTL_MS = 10 * 60 * 1000 // 10 min

function pruneExpiredStates() {
  const now = Date.now()
  for (const [k, v] of stateStore.entries()) {
    if (now - v.createdAt > STATE_TTL_MS) stateStore.delete(k)
  }
}

export function isGoogleOAuthConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

function getRedirectUri() {
  // En produccion esto deberia venir de una env var, pero la convencion
  // es suficiente para dev y para el callback que registraremos en Google.
  return `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000'}/api/auth/google/callback`
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  )
}

// Construye la URL a la que el frontend debe redirigir al usuario.
export function buildGoogleAuthUrl(returnTo = '/inicio') {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth no está configurado (faltan GOOGLE_CLIENT_ID/SECRET)')
  }
  pruneExpiredStates()
  const state = randomUUID()
  stateStore.set(state, { createdAt: Date.now(), returnTo })

  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    // Forzamos a elegir cuenta cada vez, util en entornos de prueba.
    prompt: 'select_account',
    hd: 'unac.edu.co', // sugerencia de dominio (Google filtra la UI)
  })
}

// Intercambia el `code` por los tokens y devuelve los datos del usuario.
export async function exchangeCodeForProfile(code, state) {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth no está configurado')
  }
  pruneExpiredStates()
  const stored = state ? stateStore.get(state) : null
  // Limpiamos el state consumido (one-shot).
  if (state) stateStore.delete(state)

  if (!state || !stored) {
    throw new Error('Estado OAuth inválido o expirado. Intenta de nuevo.')
  }

  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  if (!tokens.access_token) {
    throw new Error('Google no devolvió un token de acceso.')
  }
  client.setCredentials(tokens)

  // userinfo v2 es lo mas estable para obtener el email verificado.
  const oauth2 = google.oauth2({ auth: client, version: 'v2' })
  const { data: profile } = await oauth2.userinfo.get()

  if (!profile.email) {
    throw new Error('Tu cuenta de Google no tiene un email verificable.')
  }
  const email = profile.email.trim().toLowerCase()
  if (!email.endsWith(INSTITUTIONAL_DOMAIN)) {
    throw new Error(
      `Solo se permite el ingreso con correo institucional ${INSTITUTIONAL_DOMAIN}. Tu cuenta de Google devolvió ${email}.`
    )
  }

  return {
    email,
    name: profile.name || profile.given_name || email.split('@')[0],
    picture: profile.picture || null,
    googleSub: profile.id,
    returnTo: stored.returnTo,
  }
}
