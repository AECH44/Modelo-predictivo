// Cliente API: encapsula las llamadas al backend Express + PostgreSQL.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'
const TOKEN_KEY = 'saberpro.token'

export function getToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (typeof window === 'undefined') return
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message:
        'No se pudo contactar al servidor. Verifica que el backend este corriendo en ' +
        API_BASE,
    }
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    data = {}
  }
  return { ...data, ok: data?.ok ?? res.ok, status: res.status }
}

export async function apiLogin({ identifier, password }) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  })
  if (result.ok && result.token) setToken(result.token)
  return result
}

export async function apiRegister(payload) {
  const result = await request('/auth/register', {
    method: 'POST',
    body: payload,
  })
  if (result.ok && result.token) setToken(result.token)
  return result
}

export async function apiRecover(identifier) {
  return request('/auth/recover', { method: 'POST', body: { identifier } })
}

export async function apiMe() {
  return request('/auth/me', { auth: true })
}

export async function apiUpdateProfile(payload) {
  return request('/profile', { method: 'PATCH', auth: true, body: payload })
}

export function apiLogout() {
  setToken(null)
}

export async function apiHealth() {
  return request('/health')
}
