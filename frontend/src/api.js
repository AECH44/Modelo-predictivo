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
  } catch {
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
  // identifier = correo electronico del estudiante (CSV es roster autoritativo).
  // password   = numero de documento (politica institucional).
  // Para estudiantes, la respuesta puede incluir `prediction` si el backend
  // logro auto-completar el perfil via lazy fallback desde dataset_saber_pro_real.
  const result = await request('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  })
  if (result.ok && result.token) setToken(result.token)
  return result
}

// El registro publico esta deshabilitado: los estudiantes se importan en lote
// desde el backend con `import-students.js`. Esta funcion se conserva solo para
// el script de importacion; la UI ya no la usa.
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

// Devuelve la URL a la que el frontend debe redirigir al usuario para que
// Google lo autentique. Si el backend no tiene configurado OAuth, devuelve
// { ok: false, status: 503, message }.
export async function apiGetGoogleAuthUrl(returnTo = '/inicio') {
  const qs = `?returnTo=${encodeURIComponent(returnTo)}`
  return request(`/auth/google/url${qs}`)
}

export async function apiMe() {
  return request('/auth/me', { auth: true })
}

export async function apiUpdateProfile(payload) {
  return request('/profile', { method: 'PATCH', auth: true, body: payload })
}

// Cambia la contrasena del usuario autenticado.
export async function apiChangeMyPassword({ currentPassword, newPassword }) {
  return request('/auth/me/password', {
    method: 'PATCH',
    auth: true,
    body: { currentPassword, newPassword },
  })
}

export function apiLogout() {
  setToken(null)
}

export async function apiHealth() {
  return request('/health')
}

// =====================================================================
// Estudiante: perfil + predicciones
// =====================================================================

export async function apiGetStudentProfile() {
  return request('/student/profile', { auth: true })
}

export async function apiSaveStudentProfile(payload) {
  return request('/student/profile', { method: 'PUT', auth: true, body: payload })
}

export async function apiGetStudentPredictions() {
  return request('/student/predictions', { auth: true })
}

// =====================================================================
// Cohorte (profesor / decano / rector)
// =====================================================================

export async function apiGetCohort(program) {
  const qs = program ? `?program=${encodeURIComponent(program)}` : ''
  return request(`/cohort/students${qs}`, { auth: true })
}

// =====================================================================
// Administrador (solo rol 'administrador')
// =====================================================================

function buildQuery(params = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    sp.set(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function apiGetAdminStats() {
  return request('/admin/stats', { auth: true })
}

export async function apiGetAdminReportSummary(program = 'all') {
  const qs = program && program !== 'all' ? `?program=${encodeURIComponent(program)}` : ''
  return request(`/admin/report-summary${qs}`, { auth: true })
}

export async function apiListAdminUsers(filters = {}) {
  return request(`/admin/users${buildQuery(filters)}`, { auth: true })
}

export async function apiUpsertAdminUser(payload) {
  return request('/admin/users', { method: 'POST', auth: true, body: payload })
}

export async function apiUpdateAdminUser(id, payload) {
  return request(`/admin/users/${id}`, { method: 'PATCH', auth: true, body: payload })
}

export async function apiDeactivateAdminUser(id) {
  return request(`/admin/users/${id}/deactivate`, { method: 'POST', auth: true })
}

export async function apiActivateAdminUser(id) {
  return request(`/admin/users/${id}/activate`, { method: 'POST', auth: true })
}

export async function apiGetAdminAudit(filters = {}) {
  return request(`/admin/audit${buildQuery(filters)}`, { auth: true })
}

export async function apiGetUserAudit(userId, filters = {}) {
  return request(`/admin/users/${userId}/audit${buildQuery(filters)}`, { auth: true })
}

// =====================================================================
// Analisis del modelo ML (solo administrador)
// =====================================================================

// Retorna las metricas del modelo real (leidas de
// ml/models/desercion_metrics.json).
export async function apiGetAnalysisMetrics() {
  return request('/analysis/metrics', { auth: true })
}

// Distribucion de filas y de target derivado en dataset_saber_pro_real.
export async function apiGetAnalysisDatasetStats() {
  return request('/analysis/dataset-stats', { auth: true })
}

// Calidad del dataset: % nulos por columna + histogramas de categoricos.
export async function apiGetAnalysisDataQuality() {
  return request('/analysis/data-quality', { auth: true })
}

// Llama al proxy de Express que a su vez consulta FastAPI :8000 con el
// .pkl real. features debe contener las 13 features del modelo.
export async function apiPostAnalysisPredict(features) {
  return request('/analysis/predict', {
    method: 'POST',
    auth: true,
    body: features,
  })
}

// Descarga las metricas del modelo como CSV. Devuelve un objeto Blob.
// Construye la peticion con Bearer token porque el endpoint requiere auth.
export async function apiGetAnalysisMetricsCsv() {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/analysis/export/metrics.csv`, { headers })
  if (!res.ok) {
    let msg = 'No se pudo descargar el CSV.'
    try {
      const data = await res.json()
      msg = data.message || msg
    } catch {
      // Si el body no es JSON valido conservamos el msg por defecto.
    }
    return { ok: false, message: msg, status: res.status }
  }
  const blob = await res.blob()
  return { ok: true, blob }
}
