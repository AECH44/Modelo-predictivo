import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import './App.css'
import { Icon } from './components/Icon.jsx'
import { DataTable } from './components/DataTable.jsx'
import {
  apiActivateAdminUser,
  apiChangeMyPassword,
  apiDeactivateAdminUser,
  apiGetAdminAudit,
  apiGetAdminReportSummary,
  apiGetAdminStats,
  apiGetAnalysisDatasetStats,
  apiGetAnalysisDataQuality,
  apiGetAnalysisMetrics,
  apiGetAnalysisMetricsCsv,
  apiGetCohort,
  apiGetGoogleAuthUrl,
  apiGetStudentPredictions,
  apiGetStudentProfile,
  apiListAdminUsers,
  apiLogin,
  apiLogout,
  apiMe,
  apiPostAnalysisPredict,
  apiRecover,
  apiSaveStudentProfile,
  apiUpdateAdminUser,
  apiUpsertAdminUser,
  getToken,
  setToken as apiSetToken,
} from './api.js'

const STORAGE_SESSION_KEY = 'saberpro.session'

const PROGRAMS = {
  sistemas: 'Ingenieria de Sistemas',
}

const EMPTY_VALUE = ''

// ---- User Agent parser (2026-10-09) ----
// Convierte un string User-Agent en una etiqueta amigable tipo
// "Chrome · Windows" o "Postman" (en vez de mostrar el string crudo
// "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/...").
// Devuelve { browser, os, isBot, isApi } para que la UI pueda decidir
// que mostrar.
function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return { browser: 'desconocido', os: '', isBot: false, isApi: true }
  // Bots / herramientas: curl, wget, Postman, python-requests, axios, etc.
  const lc = ua.toLowerCase()
  if (lc.includes('curl/')) return { browser: 'curl', os: '', isBot: true, isApi: true }
  if (lc.includes('wget/')) return { browser: 'wget', os: '', isBot: true, isApi: true }
  if (lc.includes('postman')) return { browser: 'Postman', os: '', isBot: false, isApi: true }
  if (lc.includes('python-requests') || lc.includes('python-urllib') || lc.includes('python/'))
    return { browser: 'Python', os: '', isBot: false, isApi: true }
  if (lc.includes('node-fetch') || lc.includes('axios'))
    return { browser: 'Node.js', os: '', isBot: false, isApi: true }
  if (lc.includes('insomnia')) return { browser: 'Insomnia', os: '', isBot: false, isApi: true }

  // Navegadores
  let browser = 'desconocido'
  if (lc.includes('edg/')) browser = 'Edge'
  else if (lc.includes('opr/') || lc.includes('opera')) browser = 'Opera'
  else if (lc.includes('firefox/')) browser = 'Firefox'
  else if (lc.includes('chrome/') && !lc.includes('chromium')) browser = 'Chrome'
  else if (lc.includes('safari/') && !lc.includes('chrome')) browser = 'Safari'
  else if (lc.includes('samsungbrowser')) browser = 'Samsung'

  // OS
  let os = ''
  if (lc.includes('windows nt')) os = 'Windows'
  else if (lc.includes('mac os x') || lc.includes('macintosh')) os = 'macOS'
  else if (lc.includes('android')) os = 'Android'
  else if (lc.includes('iphone') || lc.includes('ipad')) os = 'iOS'
  else if (lc.includes('linux')) os = 'Linux'

  return { browser, os, isBot: false, isApi: false }
}

// Etiqueta corta del cliente: "Chrome · Windows" / "Postman" / "curl".
function shortClientLabel(ua) {
  const p = parseUserAgent(ua)
  if (p.isApi) return p.browser   // "curl", "Postman", "Python"
  if (p.os) return `${p.browser} · ${p.os}`
  return p.browser
}

// ============================================================================
// COMPONENTES UI REUTILIZABLES (Tier 1 UX, 2026-10-09)
// ============================================================================

// ---- Toast notifications ----
const ToastContext = createContext(null)

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((opts) => {
    const id = Date.now() + Math.random()
    const toast = {
      id,
      type: opts.type || 'info',
      title: opts.title,
      message: opts.message,
      duration: opts.duration ?? (opts.type === 'error' ? 6000 : 4500),
      action: opts.action, // { label, onClick }
    }
    setToasts((prev) => [...prev, toast])
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }, [dismiss])

  // Helpers ergonomicos
  const value = useMemo(() => ({
    show: showToast,
    success: (msg, title, action) => showToast({ type: 'success', message: msg, title, action }),
    error: (msg, title, action) => showToast({ type: 'error', message: msg, title, action }),
    warning: (msg, title, action) => showToast({ type: 'warning', message: msg, title, action }),
    info: (msg, title, action) => showToast({ type: 'info', message: msg, title, action }),
    dismiss,
  }), [showToast, dismiss])

  const typeLabels = {
    success: 'Exito',
    error: 'Error',
    warning: 'Atencion',
    info: 'Informacion',
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notificaciones" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <div className="toast-progress" aria-hidden="true">
              <div className="toast-progress-bar" style={{ animationDuration: `${t.duration}ms` }} />
            </div>
            <span className="toast-icon" aria-hidden="true">
              <Icon
                name={t.type === 'success' ? 'check'
                      : t.type === 'error' ? 'x'
                      : t.type === 'warning' ? 'warning'
                      : 'bell'}
                size={20}
              />
            </span>
            <div className="toast-content">
              <p className="toast-title">
                {t.title || typeLabels[t.type] || ''}
              </p>
              {t.message ? <p className="toast-message">{t.message}</p> : null}
              {t.action ? (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    try { t.action.onClick?.() } finally { dismiss(t.id) }
                  }}
                >
                  {t.action.label}
                </button>
              ) : null}
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Cerrar notificacion">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() debe usarse dentro de <ToastProvider>')
  return ctx
}

// ---- Loading skeleton ----
function Skeleton({ width, height = '1em', circle, lines, className = '', style = {} }) {
  if (lines) {
    return (
      <div className={`skeleton-stack ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skeleton-line skeleton" />
        ))}
      </div>
    )
  }
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width: width || '100%', height, borderRadius: circle ? '50%' : '6px', ...style }}
      aria-hidden="true"
    />
  )
}

// ---- Empty state ----
function EmptyState({ icon = 'inbox', title = 'Sin resultados', message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      {message ? <p className="empty-state-message">{message}</p> : null}
      {action || null}
    </div>
  )
}

// ---- Confirm dialog ----
// Variantes visuales:
//   - danger  : icono triangular rojo, boton de accion destructivo.
//   - warning : icono triangular amarillo.
//   - info    : icono de informacion azul.
//   - success : check verde.
//
// `danger` se preserva como prop por compatibilidad; ademas controla el
// color del boton "Confirmar".
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  variant = 'warning',
  icon,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])
  if (!open) return null
  // danger tiene prioridad sobre variant para el color del icono + boton.
  const visualVariant = danger ? 'danger' : variant
  const iconName =
    icon ||
    (danger
      ? 'warning'
      : variant === 'success'
        ? 'check'
        : variant === 'info'
          ? 'info'
          : 'warning')
  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div
        className={`confirm-dialog confirm-dialog-${visualVariant}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-icon" aria-hidden="true">
            <Icon name={iconName} size={22} />
          </div>
          <div className="confirm-dialog-text">
            <h3 id="confirm-dialog-title">{title}</h3>
            {message ? (
              <p id="confirm-dialog-message">{message}</p>
            ) : null}
          </div>
        </div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-button cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-button confirm ${danger ? 'danger' : visualVariant === 'success' ? 'success' : 'primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Avatar con iniciales ----
function Avatar({ name, size = 'md' }) {
  // Iniciales: primera letra del primer nombre + primera letra del ULTIMO
  // apellido (no de los dos primeros del array, que saldrian ambos apellidos).
  // Para "MESA ESCOBAR JHAN CARLOS" -> "MC" (Mesa + Carlos).
  // Para "JHANC MESAE" -> "JM".
  const initials = useMemo(() => {
    if (!name) return '?'
    const words = name.split(/\s+/).filter(Boolean)
    if (words.length === 0) return '?'
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
    const first = words[0][0]
    const last = words[words.length - 1][0]
    return (first + last).toUpperCase()
  }, [name])
  return (
    <span
      className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`}
      title={name}
      aria-label={`Avatar de ${name}`}
    >
      {initials}
    </span>
  )
}

// ---- Session timeout banner ----
// Muestra un aviso sticky cuando faltan <5 min para que expire el JWT.
// Sin boton de "extender" (no hay endpoint de refresh); al expirar el JWT
// la app maneja el 401 redirigiendo al login.
//
// Implementacion: usamos useSyncExternalStore para suscribirnos al "tiempo
// que pasa" (setInterval) sin disparar el warning de setState sincrono en
// useEffect (regla React 19).
//
// OJO: React exige que getSnapshot devuelva SIEMPRE el mismo valor mientras el
// store no haya cambiado. Si devolvemos `exp - Date.now()` en cada llamada,
// React lo detecta como "snapshot inestable", re-renderiza en bucle y revienta
// con "Maximum update depth exceeded". Por eso el valor vive en un cache
// (sessionClock) que solo se actualiza dentro del interval, justo antes de
// notificar.
const sessionClock = { remaining: null }

function SessionBanner({ token }) {
  function decodeExp(tokenStr) {
    try {
      const parts = tokenStr.split('.')
      if (parts.length !== 3) return null
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null
    } catch {
      return null
    }
  }

  const remainingMs = useSyncExternalStore(
    (notify) => {
      if (!token) return () => {}
      const exp = decodeExp(token)
      if (!exp) return () => {}
      const tick = () => {
        sessionClock.remaining = Math.max(0, exp - Date.now())
        notify()
      }
      tick()
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    },
    () => (token ? sessionClock.remaining : null),
  )

  if (remainingMs == null || remainingMs > 5 * 60 * 1000) return null
  const totalSec = Math.ceil(remainingMs / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  const urgent = remainingMs < 60 * 1000

  function handleLogout() {
    apiLogout()
    window.location.href = '/login'
  }
  return (
    <div className={`session-banner ${urgent ? 'session-urgent' : ''}`} role="alert">
      <span className="session-banner-icon" aria-hidden="true">
        <Icon name={urgent ? 'warning' : 'bell'} size={18} />
      </span>
      <p className="session-banner-text">
        Tu sesion expira en <strong>{mm}:{ss}</strong>.
        {' '}{urgent ? 'Guarda tu trabajo y vuelve a iniciar sesion.' : 'Considera guardar cambios pendientes.'}
      </p>
      <button type="button" onClick={handleLogout}>
        <Icon name="logout" size={14} /> Cerrar sesion
      </button>
    </div>
  )
}

// ---- Breadcrumbs ----
// Lista simple de migas de pan. `items` es un array de { label, onClick? }.
// El ultimo item es "current" (sin link).
function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null
  return (
    <nav className="breadcrumbs" aria-label="Migas de pan">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <span key={`${item.label}-${idx}`} className={`breadcrumbs-item ${isLast ? 'current' : ''}`}>
            {isLast || !item.onClick ? (
              <span>{item.label}</span>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); item.onClick() }}>{item.label}</a>
            )}
            {!isLast ? (
              <span className="breadcrumbs-sep" aria-hidden="true">
                <Icon name="arrowRight" size={12} />
              </span>
            ) : null}
          </span>
        )
      })}
    </nav>
  )
}

// ---- Activity feed (panel admin home) ----
// Muestra las ultimas N acciones del audit_log. Reusa el endpoint existente.
//
// Igual que SessionBanner, el reloj va cacheado: React exige que getSnapshot
// devuelva el mismo valor mientras el store no cambie, o entra en bucle de
// renders y revienta con "Maximum update depth exceeded".
const activityClock = { now: Date.now() }

function RecentActivity({ limit = 5 }) {
  const [status, setStatus] = useState('loading')
  const [entries, setEntries] = useState([])
  const [error, setError] = useState(null)

  // Suscribirse al reloj para que "hace X min" se refresque sin recalcular
  // Date.now() durante el render (regla react-hooks/purity).
  const nowTick = useSyncExternalStore(
    (notify) => {
      const id = setInterval(() => {
        activityClock.now = Date.now()
        notify()
      }, 30_000)
      return () => clearInterval(id)
    },
    () => activityClock.now,
  )

  useEffect(() => {
    let cancelled = false
    apiGetAdminAudit({ limit, offset: 0 })
      .then((res) => {
        if (cancelled) return
        if (res.ok) { setEntries(res.entries || []); setStatus('ready') }
        else { setError(res.message || 'No se pudo cargar la actividad.'); setStatus('error') }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Error de red.')
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [limit])

  if (status === 'loading') {
    return (
      <div className="activity-feed-loading">
        <Skeleton lines={3} />
      </div>
    )
  }
  if (status === 'error') {
    return <EmptyState icon="warning" title="No se pudo cargar la actividad" message={error} />
  }
  if (!entries.length) {
    return <EmptyState icon="inbox" title="Sin actividad reciente" message="Las acciones de administradores apareceran aqui." />
  }

  function iconFor(accion) {
    if (!accion) return 'bell'
    if (accion.startsWith('LOGIN_FAIL')) return 'warning'
    if (accion.startsWith('LOGIN_SUCCESS')) return 'arrowRight'
    if (accion.startsWith('USER_DEACTIVATE')) return 'trash'
    if (accion.startsWith('USER_ACTIVATE')) return 'check'
    if (accion.startsWith('USER_EDIT') || accion.startsWith('USER_UPSERT')) return 'edit'
    if (accion.startsWith('PASSWORD')) return 'lock'
    if (accion.startsWith('EXPORT')) return 'download'
    if (accion.startsWith('RECOVER')) return 'search'
    return 'bell'
  }
  function toneFor(accion) {
    if (accion?.startsWith('LOGIN_FAIL')) return 'icon-fail'
    if (accion?.startsWith('LOGIN_SUCCESS')) return 'icon-login'
    if (accion?.startsWith('USER_DEACTIVATE')) return 'icon-warn'
    if (accion?.startsWith('EXPORT')) return 'icon-info'
    return ''
  }
  function timeAgo(iso) {
    if (!iso) return ''
    const t = new Date(iso).getTime()
    const ms = nowTick - t
    if (ms < 60_000) return 'hace un momento'
    if (ms < 3600_000) return `hace ${Math.floor(ms / 60_000)} min`
    if (ms < 86_400_000) return `hace ${Math.floor(ms / 3600_000)} h`
    return new Date(iso).toLocaleDateString()
  }
  function clientLabel(ua) {
    // Devuelve solo el nombre del cliente. El sufijo "(API)" se omite: el
    // estilo del chip (`.activity-feed-client.is-api`) ya comunica que es
    // una peticion programatica (color azul, fondo distinto).
    const p = parseUserAgent(ua)
    return p.os ? `${p.browser} · ${p.os}` : p.browser
  }
  function clientIconName(ua) {
    const p = parseUserAgent(ua)
    if (p.isApi) return 'command'
    return 'user'
  }
  function clientIsApi(ua) {
    return parseUserAgent(ua).isApi
  }
  function describe(entry) {
    switch (entry.accion) {
      case 'LOGIN_SUCCESS': return 'Inicio de sesion'
      case 'LOGIN_FAIL': return 'Intento de login fallido'
      case 'LOGIN_FAIL_BAD_PASSWORD':
      case 'bad_password': return 'Login fallido (contrasena incorrecta)'
      case 'LOGIN_FAIL_NO_USER':
      case 'no_user': return 'Login fallido (usuario no existe)'
      case 'USER_UPSERT': return 'Creo/actualizo usuario'
      case 'USER_EDIT': return 'Edito usuario'
      case 'USER_DEACTIVATE': return 'Desactivo usuario'
      case 'USER_ACTIVATE': return 'Reactivo usuario'
      case 'PASSWORD_CHANGE': return 'Cambio su contrasena'
      case 'RECOVER_REQUEST': return 'Solicito recuperacion'
      case 'EXPORT_METRICS_CSV': return 'Exporto metricas CSV'
      default: return `Accion: ${entry.accion}`
    }
  }

  // Abreviar correos en tabla (antes del @) para mejor encuadre.
  function shortEmail(email) {
    if (!email || !email.includes('@')) return email || 'sistema'
    const [local, domain] = email.split('@')
    if (local.length <= 18) return email
    return `${local.slice(0, 14)}…@${domain}`
  }

  return (
    <div className="activity-table-wrap">
      <table className="activity-table">
        <thead>
          <tr>
            <th className="activity-table-th-icon" aria-label="Tipo"></th>
            <th className="activity-table-th-user">Usuario</th>
            <th className="activity-table-th-action">Accion</th>
            <th className="activity-table-th-when">Cuando</th>
            <th className="activity-table-th-client">Cliente</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const tone = toneFor(e.accion)
            const isApi = clientIsApi(e.userAgent)
            const who = e.adminEmail || (e.adminId != null ? `admin #${e.adminId}` : 'sistema')
            return (
              <tr key={e.id} className={`activity-table-row ${tone ? `tone-${tone}` : ''}`}>
                <td className="activity-table-td-icon">
                  <span className={`activity-feed-icon ${tone}`} aria-hidden="true">
                    <Icon name={iconFor(e.accion)} size={15} />
                  </span>
                </td>
                <td className="activity-table-td-user" title={who}>{shortEmail(who)}</td>
                <td className="activity-table-td-action">{describe(e)}</td>
                <td className="activity-table-td-when">{timeAgo(e.createdAt)}</td>
                <td className="activity-table-td-client">
                  {e.userAgent ? (
                    <span className={`activity-feed-client ${isApi ? 'is-api' : ''}`}>
                      <Icon name={clientIconName(e.userAgent)} size={11} />
                      <span>{clientLabel(e.userAgent)}</span>
                    </span>
                  ) : (
                    <span className="activity-feed-client muted">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---- Command palette (Cmd+K / Ctrl+K) ----
// Modal con busqueda fuzzy sobre un catalogo de acciones.
// Las acciones reciben { close, navigate } para cerrarse y navegar.
const ROLE_CONFIG = {
  rector: {
    label: 'Rector',
    icon: 'crown',
    department: 'Rectoria',
    topbarTitle: 'Panel Rector',
    topbarSubtitle: 'Universidad Nacional · Seguimiento institucional 2024',
    nav: ['Panel Rector', 'Metas estrategicas', 'Comparativo', 'Reportes'],
  },
  decano: {
    label: 'Decano',
    icon: 'userTie',
    department: 'Facultad de Ingenieria',
    topbarTitle: 'Dashboard Ejecutivo',
    topbarSubtitle: 'Analisis por programa academico',
    nav: ['Programas', 'Dashboard', 'Benchmarking', 'Indicadores'],
  },
  profesor: {
    label: 'Profesor',
    icon: 'teacher',
    department: 'Vista Docente',
    topbarTitle: 'Desempeno de la cohorte',
    topbarSubtitle: 'Seguimiento academico de estudiantes',
    nav: ['Dashboard', 'Monitoreo', 'Alertas', 'Reportes'],
  },
  estudiante: {
    label: 'Estudiante',
    icon: 'student',
    department: 'Portal Estudiantil',
    topbarTitle: 'Mi progreso',
    topbarSubtitle: 'Consulta personal y actualizacion de datos',
    nav: ['Mi resumen', 'Mi prediccion', 'Recomendaciones'],
  },
  administrador: {
    label: 'Administrador',
    icon: 'shield',
    department: 'Administracion del sistema',
    topbarTitle: 'Panel de Administracion',
    topbarSubtitle: 'Acceso total a todos los modulos y reportes',
    nav: ['Panel Administrador', 'Usuarios', 'Auditoria', 'Comparativo', 'Reportes', 'Analisis del modelo'],
  },
}

const STUDENT_RECORDS = [
  {
    id: 'stu-sis-01',
    name: 'Carlos Andres',
    email: 'carlos.andres@saberpro.edu.co',
    code: '',
    program: 'sistemas',
    semester: '',
    age: '22',
    predictedScore: '',
    actualScore: '',
    trend: '',
    risk: '',
    studyHours: '',
    englishLevel: '',
    strengths: [],
    recommendation: '',
  },
  {
    id: 'stu-sis-02',
    name: 'Santiago Zapata',
    email: 'santiago.zapata@saberpro.edu.co',
    code: '',
    program: 'sistemas',
    semester: '',
    age: '23',
    predictedScore: '',
    actualScore: '',
    trend: '',
    risk: '',
    studyHours: '',
    englishLevel: '',
    strengths: [],
    recommendation: '',
  },
  {
    id: 'stu-ind-01',
    name: 'Salome Campino',
    email: 'salome.campino@saberpro.edu.co',
    code: '',
    program: 'sistemas',
    semester: '',
    age: '21',
    predictedScore: '',
    actualScore: '',
    trend: '',
    risk: '',
    studyHours: '',
    englishLevel: '',
    strengths: [],
    recommendation: '',
  },
  {
    id: 'stu-ind-02',
    name: 'Jhan Carlos Mesa',
    email: 'jhan.mesa@saberpro.edu.co',
    code: '',
    program: 'sistemas',
    semester: '',
    age: '24',
    predictedScore: '',
    actualScore: '',
    trend: '',
    risk: '',
    studyHours: '',
    englishLevel: '',
    strengths: [],
    recommendation: '',
  },
]

// Las cuentas demo y los usuarios reales viven en la base de datos
// (tabla `usuarios`). El cliente no almacena correos ni contrasenas.

const PROGRAM_OPTIONS = [
  { value: 'sistemas', label: 'Ingenieria de Sistemas' },
]

const RECTOR_PROGRAM_OPTIONS = [
  { value: 'sistemas', label: 'Ingenieria de Sistemas' },
]

const STUDENT_DASHBOARD_MOCK = {
  predictedScore: 258,
  actualScore: 246,
  risk: 'medio',
  studyHours: 11,
  trend: '+6 puntos frente al simulacro anterior',
  strengths: ['Ingles', 'Razonamiento cuantitativo'],
  recommendation:
    'Fortalece lectura critica con ejercicios de inferencia y aumenta practica semanal con simulacros cortos.',
  factors: [
    { label: 'Asistencia a clases', impact: 'Positivo', value: '92%' },
    { label: 'Horas de estudio semanales', impact: 'Moderado', value: '11 h/semana' },
    { label: 'Constancia en simulacros', impact: 'Positivo', value: '4 de 5 completados' },
    { label: 'Gestion del tiempo en lectura', impact: 'A mejorar', value: 'Eficiencia media' },
  ],
  performanceAreas: [
    { id: 'matematicas', label: 'Matematicas', score: 74 },
    { id: 'lectura', label: 'Lectura critica', score: 58 },
    { id: 'ingles', label: 'Ingles', score: 67 },
  ],
  recommendations: {
    improve: [
      'Incrementar precision en preguntas de inferencia en lectura critica.',
      'Mantener ritmo de practica en razonamiento cuantitativo.',
      'Mejorar velocidad de respuesta en bloques de tiempo limitado.',
    ],
    actions: [
      'Realizar 3 micro-simulacros semanales de 20 minutos.',
      'Usar una rutina Pomodoro 25-5 en sesiones de lectura.',
      'Resolver 15 preguntas de ingles por semana con retroalimentacion.',
    ],
  },
  comparison: {
    groupLabel: 'Promedio cohorte 2026-1',
    groupAverage: 244,
  },
  progress: [
    { label: 'Simulacro 1', score: 232 },
    { label: 'Simulacro 2', score: 239 },
    { label: 'Simulacro 3', score: 246 },
    { label: 'Simulacro 4', score: 252 },
    { label: 'Prediccion actual', score: 258 },
  ],
}

const PROFESSOR_GROUP_MOCK = {
  currentPeriod: '2026-1',
  previousPeriod: '2025-2',
  previousAverageScore: 238,
  previousRiskHighMediumPct: 68,
  students: [
    {
      id: 'prof-sis-01',
      name: 'Daniela Ruiz',
      program: 'sistemas',
      predictedScore: 228,
      actualScore: 221,
      studyHours: 8,
      risk: 'alto',
      trend: '+3 puntos',
      strengths: ['Ingles'],
      factors: [
        { label: 'Asistencia', impact: 'A mejorar', value: '76%' },
        { label: 'Horas de estudio', impact: 'Moderado', value: '8 h/semana' },
        { label: 'Entrega de guias', impact: 'A mejorar', value: '62%' },
      ],
      performanceAreas: [
        { id: 'matematicas', label: 'Matematicas', score: 49 },
        { id: 'lectura', label: 'Lectura critica', score: 57 },
        { id: 'ingles', label: 'Ingles', score: 64 },
      ],
      recommendations: {
        improve: [
          'Elevar precision en matematicas basicas.',
          'Mejorar comprension de enunciados extensos.',
        ],
        actions: [
          'Taller semanal de refuerzo matematico.',
          'Practicar 10 preguntas de lectura por sesion.',
        ],
      },
      comparison: { groupLabel: 'Promedio del grupo', groupAverage: 246 },
      progress: [
        { label: 'S1', score: 212 },
        { label: 'S2', score: 218 },
        { label: 'S3', score: 221 },
        { label: 'S4', score: 224 },
        { label: 'Pred', score: 228 },
      ],
    },
    {
      id: 'prof-sis-02',
      name: 'Mateo Giraldo',
      program: 'sistemas',
      predictedScore: 241,
      actualScore: 235,
      studyHours: 10,
      risk: 'medio',
      trend: '+5 puntos',
      strengths: ['Lectura critica'],
      factors: [
        { label: 'Asistencia', impact: 'Positivo', value: '88%' },
        { label: 'Horas de estudio', impact: 'Moderado', value: '10 h/semana' },
        { label: 'Simulacros', impact: 'Positivo', value: '3 de 4' },
      ],
      performanceAreas: [
        { id: 'matematicas', label: 'Matematicas', score: 61 },
        { id: 'lectura', label: 'Lectura critica', score: 69 },
        { id: 'ingles', label: 'Ingles', score: 58 },
      ],
      recommendations: {
        improve: ['Subir desempeno en ingles academico.'],
        actions: ['Laboratorio de vocabulario tecnico dos veces por semana.'],
      },
      comparison: { groupLabel: 'Promedio del grupo', groupAverage: 246 },
      progress: [
        { label: 'S1', score: 226 },
        { label: 'S2', score: 231 },
        { label: 'S3', score: 234 },
        { label: 'S4', score: 237 },
        { label: 'Pred', score: 241 },
      ],
    },
    {
      id: 'prof-sis-03',
      name: 'Laura Cifuentes',
      program: 'sistemas',
      predictedScore: 258,
      actualScore: 249,
      studyHours: 14,
      risk: 'bajo',
      trend: '+7 puntos',
      strengths: ['Matematicas', 'Ingles'],
      factors: [
        { label: 'Asistencia', impact: 'Positivo', value: '94%' },
        { label: 'Horas de estudio', impact: 'Positivo', value: '14 h/semana' },
        { label: 'Simulacros', impact: 'Positivo', value: '5 de 5' },
      ],
      performanceAreas: [
        { id: 'matematicas', label: 'Matematicas', score: 78 },
        { id: 'lectura', label: 'Lectura critica', score: 71 },
        { id: 'ingles', label: 'Ingles', score: 74 },
      ],
      recommendations: {
        improve: ['Mantener constancia en lectura critica.'],
        actions: ['Resolver simulacros avanzados de integracion semanal.'],
      },
      comparison: { groupLabel: 'Promedio del grupo', groupAverage: 246 },
      progress: [
        { label: 'S1', score: 241 },
        { label: 'S2', score: 245 },
        { label: 'S3', score: 248 },
        { label: 'S4', score: 252 },
        { label: 'Pred', score: 258 },
      ],
    },
    {
      id: 'prof-ind-01',
      name: 'Sebastian Mora',
      program: 'sistemas',
      predictedScore: 233,
      actualScore: 227,
      studyHours: 9,
      risk: 'alto',
      trend: '+2 puntos',
      strengths: ['Lectura critica'],
      factors: [
        { label: 'Asistencia', impact: 'Moderado', value: '81%' },
        { label: 'Horas de estudio', impact: 'A mejorar', value: '9 h/semana' },
        { label: 'Talleres', impact: 'A mejorar', value: '58%' },
      ],
      performanceAreas: [
        { id: 'matematicas', label: 'Matematicas', score: 53 },
        { id: 'lectura', label: 'Lectura critica', score: 61 },
        { id: 'ingles', label: 'Ingles', score: 51 },
      ],
      recommendations: {
        improve: ['Reforzar ingles y razonamiento numerico.'],
        actions: ['Asistir a monitorias de ingles y taller de problemas cortos.'],
      },
      comparison: { groupLabel: 'Promedio del grupo', groupAverage: 242 },
      progress: [
        { label: 'S1', score: 221 },
        { label: 'S2', score: 224 },
        { label: 'S3', score: 226 },
        { label: 'S4', score: 229 },
        { label: 'Pred', score: 233 },
      ],
    },
    {
      id: 'prof-ind-02',
      name: 'Camila Naranjo',
      program: 'sistemas',
      predictedScore: 247,
      actualScore: 239,
      studyHours: 11,
      risk: 'medio',
      trend: '+6 puntos',
      strengths: ['Matematicas'],
      factors: [
        { label: 'Asistencia', impact: 'Positivo', value: '90%' },
        { label: 'Horas de estudio', impact: 'Moderado', value: '11 h/semana' },
        { label: 'Simulacros', impact: 'Positivo', value: '4 de 5' },
      ],
      performanceAreas: [
        { id: 'matematicas', label: 'Matematicas', score: 68 },
        { id: 'lectura', label: 'Lectura critica', score: 64 },
        { id: 'ingles', label: 'Ingles', score: 59 },
      ],
      recommendations: {
        improve: ['Consolidar ingles en comprension de textos.'],
        actions: ['Micro-practicas de ingles tecnico 3 veces por semana.'],
      },
      comparison: { groupLabel: 'Promedio del grupo', groupAverage: 242 },
      progress: [
        { label: 'S1', score: 232 },
        { label: 'S2', score: 236 },
        { label: 'S3', score: 239 },
        { label: 'S4', score: 243 },
        { label: 'Pred', score: 247 },
      ],
    },
    {
      id: 'prof-ind-03',
      name: 'Andres Guarin',
      program: 'sistemas',
      predictedScore: 262,
      actualScore: 254,
      studyHours: 15,
      risk: 'bajo',
      trend: '+8 puntos',
      strengths: ['Ingles', 'Lectura critica'],
      factors: [
        { label: 'Asistencia', impact: 'Positivo', value: '95%' },
        { label: 'Horas de estudio', impact: 'Positivo', value: '15 h/semana' },
        { label: 'Simulacros', impact: 'Positivo', value: '5 de 5' },
      ],
      performanceAreas: [
        { id: 'matematicas', label: 'Matematicas', score: 73 },
        { id: 'lectura', label: 'Lectura critica', score: 76 },
        { id: 'ingles', label: 'Ingles', score: 79 },
      ],
      recommendations: {
        improve: ['Mantener consistencia de alto rendimiento.'],
        actions: ['Apoyar como tutor par en sesiones grupales.'],
      },
      comparison: { groupLabel: 'Promedio del grupo', groupAverage: 242 },
      progress: [
        { label: 'S1', score: 246 },
        { label: 'S2', score: 249 },
        { label: 'S3', score: 253 },
        { label: 'S4', score: 258 },
        { label: 'Pred', score: 262 },
      ],
    },
  ],
}

function readStorage(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const rawValue = window.localStorage.getItem(key)

    if (!rawValue) {
      return fallback
    }

    return JSON.parse(rawValue)
  } catch {
    return fallback
  }
}

function normalizeUser(user, index = 0) {
  const normalizedEmail = (user.email || '').trim().toLowerCase()
  const isLegacyAdmin = normalizedEmail === 'admin@saberpro.edu.co'
  const role = user.role || (isLegacyAdmin ? 'rector' : 'estudiante')
  const username = user.username?.trim() || `Usuario ${index + 1}`
  const program = role === 'rector' ? 'all' : user.program || 'sistemas'

  return {
    id: user.id ?? null,
    documento: user.documento || '',
    username,
    email: normalizedEmail,
    age: String(user.age || '20'),
    role,
    program,
    studentRecordId: user.studentRecordId || null,
    semester: String(user.semester || user.currentSemester || '8'),
    studyHours: String(user.studyHours || '12'),
    englishLevel: user.englishLevel || 'B1',
  }
}

function loadSession() {
  const storedSession = readStorage(STORAGE_SESSION_KEY, null)
  return storedSession ? normalizeUser(storedSession) : null
}

function getProgramLabel(program) {
  if (program === 'all') {
    return 'Vista institucional'
  }

  return PROGRAMS[program] || PROGRAMS.sistemas
}

function metricCardsForRole(user, records = []) {
  if (user.role === 'rector' || user.role === 'administrador') {
    return [
      {
        icon: '🎓',
        value: EMPTY_VALUE,
        label: 'Total de estudiantes',
        detail: '',
        accent: 'indigo',
      },
      {
        icon: 'trend',
        value: EMPTY_VALUE,
        label: 'Promedio institucional',
        detail: '',
        accent: 'cyan',
      },
      {
        icon: 'warning',
        value: EMPTY_VALUE,
        label: 'Riesgo critico',
        detail: '',
        accent: 'rose',
      },
      {
        icon: 'trophy',
        value: EMPTY_VALUE,
        label: 'Programa lider',
        detail: '',
        accent: 'lime',
      },
    ]
  }

  if (user.role === 'decano') {
    return [
      {
        icon: 'users',
        value: EMPTY_VALUE,
        label: 'Estudiantes del programa',
        detail: '',
        accent: 'indigo',
      },
      {
        icon: 'target',
        value: EMPTY_VALUE,
        label: 'Promedio predicho',
        detail: '',
        accent: 'cyan',
      },
      {
        icon: 'warning',
        value: EMPTY_VALUE,
        label: 'Riesgo alto',
        detail: '',
        accent: 'rose',
      },
      {
        icon: 'book',
        value: EMPTY_VALUE,
        label: 'Puntaje real promedio',
        detail: '',
        accent: 'lime',
      },
    ]
  }

  if (user.role === 'profesor') {
    return [
      {
        icon: 'users',
        value: EMPTY_VALUE,
        label: 'Estudiantes en cohorte',
        detail: '',
        accent: 'indigo',
      },
      {
        icon: 'trend',
        value: EMPTY_VALUE,
        label: 'Promedio predicho',
        detail: '',
        accent: 'cyan',
      },
      {
        icon: 'warning',
        value: EMPTY_VALUE,
        label: 'Casos criticos',
        detail: '',
        accent: 'rose',
      },
      {
        icon: 'check',
        value: EMPTY_VALUE,
        label: 'Riesgo bajo',
        detail: '',
        accent: 'lime',
      },
    ]
  }

  const currentRecord = records[0] || {}
  const studentPredicted = withFallback(currentRecord.predictedScore, STUDENT_DASHBOARD_MOCK.predictedScore)
  const studentActual = withFallback(currentRecord.actualScore, STUDENT_DASHBOARD_MOCK.actualScore)
  const studentRisk = withFallback(currentRecord.risk, STUDENT_DASHBOARD_MOCK.risk)
  const studentStudyHours = withFallback(currentRecord.studyHours, STUDENT_DASHBOARD_MOCK.studyHours)

  return [
    {
      icon: 'target',
      value: studentPredicted,
      label: 'Mi puntaje predicho',
      detail: 'Proyeccion actual',
      accent: 'indigo',
    },
    {
      icon: 'chart',
      value: studentActual,
      label: 'Mi referencia real',
      detail: 'Ultimo referente reportado',
      accent: 'cyan',
    },
    {
      icon: 'warning',
      value: getRiskVisualMeta(studentRisk).label,
      label: 'Nivel de riesgo',
      detail: 'Semaforo academico',
      accent: 'rose',
    },
    {
      icon: 'book',
      value: `${studentStudyHours}h`,
      label: 'Horas de estudio',
      detail: 'Dedicacion semanal',
      accent: 'lime',
    },
  ]
}

function roleHomeTitle(user, selectedProgram = user.program) {
  if (user.role === 'rector' || user.role === 'administrador') {
    return selectedProgram === 'all'
      ? 'Vision institucional de Saber Pro'
      : `Vision de ${getProgramLabel(selectedProgram)}`
  }

  if (user.role === 'decano') {
    return `Panel del programa ${getProgramLabel(selectedProgram)}`
  }

  if (user.role === 'profesor') {
    return `Seguimiento docente de ${getProgramLabel(selectedProgram)}`
  }

  return 'Mi espacio personal de seguimiento'
}

function roleHomeText(user, selectedProgram = user.program) {
  if (user.role === 'rector' || user.role === 'administrador') {
    return selectedProgram === 'all'
      ? 'Acceso agregado a la ingenieria evaluada, con seguimiento institucional y prioridades rectorales.'
      : `Vista institucional filtrada a ${getProgramLabel(selectedProgram)}.`
  }

  if (user.role === 'decano') {
    return 'El decano puede cambiar la carrera visible desde el selector superior.'
  }

  if (user.role === 'profesor') {
    return 'El profesor puede cambiar la carrera visible desde el selector superior.'
  }

  return 'Como estudiante solo puedes ver tu propia prediccion y actualizar tu informacion personal.'
}

function withFallback(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return value
}

function normalizeRiskLevel(risk) {
  const normalizedRisk = String(withFallback(risk, 'medio')).toLowerCase().trim()

  if (normalizedRisk.includes('alto')) {
    return 'alto'
  }

  if (normalizedRisk.includes('bajo')) {
    return 'bajo'
  }

  return 'medio'
}

function getRiskVisualMeta(risk) {
  const normalized = normalizeRiskLevel(risk)

  if (normalized === 'alto') {
    return {
      level: 'alto',
      label: 'Riesgo alto',
      icon: 'warning',
      tone: 'danger',
      message: 'Existe probabilidad elevada de quedar por debajo del objetivo esperado.',
    }
  }

  if (normalized === 'bajo') {
    return {
      level: 'bajo',
      label: 'Riesgo bajo',
      icon: 'check',
      tone: 'safe',
      message: 'Tu progreso actual es consistente con un desempeno esperado estable.',
    }
  }

  return {
    level: 'medio',
    label: 'Riesgo medio',
    icon: 'target',
    tone: 'warning',
    message: 'Hay avances positivos, pero todavia hay variables que requieren seguimiento.',
  }
}

function getAreaTone(score) {
  if (score < 60) {
    return { label: 'Prioritario', className: 'danger' }
  }

  if (score < 75) {
    return { label: 'En seguimiento', className: 'warning' }
  }

  return { label: 'Fortaleza', className: 'safe' }
}

function buildStudentAutomaticAnalysis(studentData, areas) {
  const strongestArea = [...areas].sort((left, right) => right.score - left.score)[0]
  const weakestArea = [...areas].sort((left, right) => left.score - right.score)[0]
  const scoreGap = studentData.predictedScore - studentData.actualScore

  return `El puntaje predicho (${studentData.predictedScore}) refleja un avance de ${scoreGap} puntos frente a tu referencia real (${studentData.actualScore}). Tu mejor resultado esta en ${strongestArea.label} (${strongestArea.score}%), mientras ${weakestArea.label} (${weakestArea.score}%) sigue siendo el principal frente de mejora. Con ${studentData.studyHours} horas de estudio semanales y practica constante de simulacros, la tendencia se mantiene favorable.`
}

function StudentExplanationCard({ analysisText, factors }) {
  return (
    <article className="card student-block">
      <div className="section-header compact">
        <h2>Explicacion del resultado</h2>
      </div>
      <p className="student-interpretation">{analysisText}</p>
      <div className="student-factor-grid">
        {factors.map((factor) => (
          <article className="student-factor-card" key={factor.label}>
            <p>{factor.label}</p>
            <strong>{factor.value}</strong>
            <span>{factor.impact}</span>
          </article>
        ))}
      </div>
    </article>
  )
}

function StudentPerformanceAreasCard({ areas }) {
  return (
    <article className="card student-block">
      <div className="section-header compact">
        <h2>Desempeno por areas</h2>
      </div>
      <div className="student-area-list">
        {areas.map((area) => {
          const tone = getAreaTone(area.score)

          return (
            <div className="student-area-row" key={area.id}>
              <div className="student-area-head">
                <strong>{area.label}</strong>
                <span className={`student-status-chip ${tone.className}`}>{tone.label}</span>
              </div>
              <div className="student-progress-track">
                <div className={`student-progress-fill ${tone.className}`} style={{ width: `${area.score}%` }} />
              </div>
              <div className="student-area-score">{area.score}%</div>
            </div>
          )
        })}
      </div>
      <p className="student-interpretation">
        Las barras en amarillo y rojo muestran los focos prioritarios para el siguiente ciclo de
        estudio.
      </p>
    </article>
  )
}

function StudentRecommendationsCard({ recommendations }) {
  return (
    <article className="card student-block">
      <div className="section-header compact">
        <h2>Recomendaciones accionables</h2>
      </div>
      <section className="student-recommendation-grid">
        <article className="student-recommendation-card">
          <h3>Que mejorar</h3>
          <ul>
            {recommendations.improve.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="student-recommendation-card">
          <h3>Acciones sugeridas</h3>
          <ul>
            {recommendations.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </article>
  )
}

// Escala real del puntaje global del Saber Pro: tres areas de 100.
const SABERPRO_SCORE_MAX = 300

function StudentComparisonCard({ studentScore, comparison }) {
  const gap = studentScore - comparison.groupAverage
  // La barra se mide contra la escala real del examen (0-300), no contra el
  // mayor de los dos valores: asi el estudiante ve donde se sitsa de verdad,
  // y no siempre al 100% de la barra.
  const maxScore = Math.max(SABERPRO_SCORE_MAX, studentScore, comparison.groupAverage)

  return (
    <article className="card student-block">
      <div className="section-header compact">
        <h2>Comparacion con grupo</h2>
      </div>

      <div className="student-comparison-metrics">
        <div>
          <p>Tu puntaje</p>
          <strong>{studentScore}</strong>
        </div>
        <div>
          <p>{comparison.groupLabel}</p>
          <strong>{comparison.groupAverage}</strong>
        </div>
        <div>
          <p>Diferencia</p>
          <strong className={gap >= 0 ? 'text-safe' : 'text-danger'}>
            {gap >= 0 ? '+' : ''}
            {gap}
          </strong>
        </div>
      </div>

      <div className="student-compare-bars">
        <div className="student-compare-row">
          <span>Tu resultado</span>
          <div className="student-compare-track">
            <div className="student-compare-fill self" style={{ width: `${(studentScore / maxScore) * 100}%` }} />
          </div>
        </div>
        <div className="student-compare-row">
          <span>Promedio grupo</span>
          <div className="student-compare-track">
            <div
              className="student-compare-fill group"
              style={{ width: `${(comparison.groupAverage / maxScore) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <p className="student-interpretation">
        {gap >= 0
          ? `Estas ${gap} puntos por encima del promedio del grupo, manteniendo una posicion competitiva.`
          : `Estas ${Math.abs(gap)} puntos por debajo del promedio del grupo; enfocar lectura critica puede cerrar la brecha.`}
      </p>
    </article>
  )
}

function StudentProgressCard({ progress }) {
  const maxScore = Math.max(...progress.map((item) => item.score))
  const minScore = Math.min(...progress.map((item) => item.score))
  const trend = progress.at(-1).score - progress[0].score

  return (
    <article className="card student-block">
      <div className="section-header compact">
        <h2>Progreso en el tiempo</h2>
      </div>
      <div className="student-time-bars">
        {progress.map((point) => (
          <div className="student-time-point" key={point.label}>
            <div className="student-time-value">{point.score}</div>
            <div className="student-time-track">
              <div className="student-time-fill" style={{ height: `${(point.score / maxScore) * 100}%` }} />
            </div>
            <span>{point.label}</span>
          </div>
        ))}
      </div>
      <p className="student-interpretation">
        Evolucion de {progress[0].score} a {progress.at(-1).score} puntos ({trend >= 0 ? '+' : ''}
        {trend}). Rango observado: {minScore} - {maxScore}.
      </p>
    </article>
  )
}

function StudentRiskVisualCard({ riskLevel }) {
  const riskMeta = getRiskVisualMeta(riskLevel)

  return (
    <article className="card student-block">
      <div className="section-header compact">
        <h2>Nivel de riesgo visual</h2>
      </div>
      <div className={`student-risk-card ${riskMeta.tone}`}>
        <p className="student-risk-icon"><Icon name={riskMeta.icon} size={28} /></p>
        <strong>{riskMeta.label}</strong>
        <span>{riskMeta.message}</span>
      </div>
      <p className="student-interpretation">
        Este semaforo sintetiza tu estado actual para facilitar decisiones rapidas de estudio.
      </p>
    </article>
  )
}

function StudentQuickEvaluationCard() {
  return (
    <article className="card student-block student-quick-eval">
      <div>
        <p className="next-step-kicker">Opcional</p>
        <h2>Realizar evaluacion rapida</h2>
        <p className="student-interpretation">
          Simula una mini prueba diagnostica de 15 minutos para actualizar tu proyeccion.
        </p>
      </div>
      <button className="auth-button" type="button">
        Realizar evaluacion rapida
      </button>
    </article>
  )
}

function getProfessorRecordsByProgram(selectedProgram) {
  return PROFESSOR_GROUP_MOCK.students.filter((student) => student.program === selectedProgram)
}

function buildProfessorMetrics(records) {
  const total = records.length
  const totalPredicted = records.reduce((sum, record) => sum + record.predictedScore, 0)
  const averagePredicted = total ? Math.round(totalPredicted / total) : 0

  const riskDistribution = records.reduce(
    (accumulator, record) => {
      const riskKey = normalizeRiskLevel(record.risk)
      accumulator[riskKey] += 1
      return accumulator
    },
    { alto: 0, medio: 0, bajo: 0 },
  )

  const toPct = (value) => (total ? Math.round((value / total) * 100) : 0)

  return {
    total,
    averagePredicted,
    riskDistribution,
    riskPct: {
      alto: toPct(riskDistribution.alto),
      medio: toPct(riskDistribution.medio),
      bajo: toPct(riskDistribution.bajo),
    },
  }
}

function buildProfessorAreaAverages(records) {
  if (!records.length) {
    return []
  }

  const areaMap = new Map()

  records.forEach((record) => {
    record.performanceAreas.forEach((area) => {
      const existing = areaMap.get(area.id)

      if (existing) {
        existing.total += area.score
        existing.count += 1
      } else {
        areaMap.set(area.id, {
          id: area.id,
          label: area.label,
          total: area.score,
          count: 1,
        })
      }
    })
  })

  return [...areaMap.values()]
    .map((area) => ({
      id: area.id,
      label: area.label,
      score: Math.round(area.total / area.count),
    }))
    .sort((left, right) => left.score - right.score)
}

function buildProfessorInsights(records, metrics, areaAverages) {
  if (!records.length) {
    return ['No hay estudiantes simulados para el programa seleccionado.']
  }

  const weakestArea = areaAverages[0]
  const strongestArea = areaAverages.at(-1)
  const mediumHighPct = metrics.riskPct.alto + metrics.riskPct.medio

  return [
    `La mayoria del grupo se concentra en riesgo medio/alto (${mediumHighPct}%).`,
    `El area con menor rendimiento grupal es ${weakestArea.label} (${weakestArea.score}%).`,
    `La principal fortaleza colectiva esta en ${strongestArea.label} (${strongestArea.score}%).`,
    `El promedio predicho del grupo es ${metrics.averagePredicted} para ${metrics.total} estudiantes.`,
  ]
}

function buildProfessorStrategies(metrics, areaAverages) {
  const weakestAreas = areaAverages.slice(0, 2)
  const mediumHighPct = metrics.riskPct.alto + metrics.riskPct.medio

  const strategies = [
    `Refuerzo focalizado en ${weakestAreas[0]?.label || 'areas criticas'} con ejercicios guiados.`,
    `Taller colaborativo para ${weakestAreas[1]?.label || 'segunda area de riesgo'} con seguimiento semanal.`,
  ]

  if (mediumHighPct >= 60) {
    strategies.push('Plan de acompanamiento intensivo para estudiantes en riesgo medio/alto.')
  } else {
    strategies.push('Mantener monitorias preventivas para sostener la tendencia favorable del grupo.')
  }

  strategies.push('Simulacro quincenal con retroalimentacion automatica por competencias.')

  return strategies
}

function buildProfessorPeriodComparison(metrics) {
  const scoreDelta = metrics.averagePredicted - PROFESSOR_GROUP_MOCK.previousAverageScore
  const currentRiskMediumHigh = metrics.riskPct.alto + metrics.riskPct.medio
  const riskDelta = currentRiskMediumHigh - PROFESSOR_GROUP_MOCK.previousRiskHighMediumPct

  return {
    previousPeriod: PROFESSOR_GROUP_MOCK.previousPeriod,
    currentPeriod: PROFESSOR_GROUP_MOCK.currentPeriod,
    previousAverageScore: PROFESSOR_GROUP_MOCK.previousAverageScore,
    currentAverageScore: metrics.averagePredicted,
    scoreDelta,
    previousRiskHighMediumPct: PROFESSOR_GROUP_MOCK.previousRiskHighMediumPct,
    currentRiskHighMediumPct: currentRiskMediumHigh,
    riskDelta,
  }
}

function ProfessorMetricsCards({ metrics }) {
  const cards = [
    {
      label: 'Promedio puntaje predicho',
      value: metrics.averagePredicted,
      detail: `Periodo ${PROFESSOR_GROUP_MOCK.currentPeriod}`,
      accent: 'indigo',
      icon: 'target',
    },
    {
      label: 'Total estudiantes',
      value: metrics.total,
      detail: 'Cohorte activa',
      accent: 'cyan',
      icon: 'users',
    },
    {
      label: 'Riesgo alto',
      value: `${metrics.riskPct.alto}%`,
      detail: `${metrics.riskDistribution.alto} estudiantes`,
      accent: 'rose',
      icon: 'warning',
    },
    {
      label: 'Riesgo medio + bajo',
      value: `${metrics.riskPct.medio + metrics.riskPct.bajo}%`,
      detail: 'Distribucion actual',
      accent: 'lime',
      icon: 'chart',
    },
  ]

  return (
    <section className="grid-4">
      {cards.map((card) => (
        <article className={`kpi-card ${card.accent}`} key={card.label}>
          <div className="kpi-icon">
            <Icon name={card.icon} size={22} />
          </div>
          <div className="kpi-value">{card.value}</div>
          <div className="kpi-label">{card.label}</div>
          <div className="kpi-delta">{card.detail}</div>
        </article>
      ))}
    </section>
  )
}

function ProfessorRiskDistributionCard({ metrics }) {
  const bars = [
    { key: 'alto', label: 'Riesgo alto', color: 'danger' },
    { key: 'medio', label: 'Riesgo medio', color: 'warning' },
    { key: 'bajo', label: 'Riesgo bajo', color: 'safe' },
  ]

  return (
    <article className="card professor-block">
      <div className="section-header compact">
        <h2>Distribucion de estudiantes por riesgo</h2>
      </div>
      <div className="professor-risk-list">
        {bars.map((bar) => (
          <div className="professor-risk-row" key={bar.key}>
            <div className="professor-risk-head">
              <span>{bar.label}</span>
              <strong>
                {metrics.riskDistribution[bar.key]} ({metrics.riskPct[bar.key]}%)
              </strong>
            </div>
            <div className="student-progress-track">
              <div
                className={`student-progress-fill ${bar.color}`}
                style={{ width: `${Math.max(metrics.riskPct[bar.key], 6)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function ProfessorStudentsTable({ records, selectedStudentId, onSelectStudent }) {
  const [sortDirection, setSortDirection] = useState('asc')

  const sortedRecords = records
    .slice()
    .sort((left, right) =>
      sortDirection === 'asc'
        ? left.predictedScore - right.predictedScore
        : right.predictedScore - left.predictedScore,
    )

  return (
    <article className="card professor-block">
      <div className="section-header">
        <h2>Lista de estudiantes</h2>
        <button
          className="professor-sort-button"
          type="button"
          onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
        >
          Orden: {sortDirection === 'asc' ? 'Peor → Mejor' : 'Mejor → Peor'}
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Predicho</th>
            <th>Riesgo</th>
            <th>Seleccionar</th>
          </tr>
        </thead>
        <tbody>
          {sortedRecords.map((record) => (
            <tr
              key={record.id}
              className={selectedStudentId === record.id ? 'professor-row-active' : ''}
            >
              <td>{record.name}</td>
              <td className="table-score">{record.predictedScore}</td>
              <td>
                <span className={`risk-pill ${normalizeRiskLevel(record.risk)}`}>
                  {getRiskVisualMeta(record.risk).label}
                </span>
              </td>
              <td>
                <button className="professor-link-button" type="button" onClick={() => onSelectStudent(record)}>
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

function ProfessorAreasAnalysisCard({ areaAverages }) {
  const maxScore = Math.max(...areaAverages.map((area) => area.score), 100)

  return (
    <article className="card professor-block">
      <div className="section-header compact">
        <h2>Analisis por areas del grupo</h2>
      </div>
      <div className="professor-areas-list">
        {areaAverages.map((area) => (
          <div className="professor-area-row" key={area.id}>
            <span>{area.label}</span>
            <div className="student-compare-track">
              <div className="student-compare-fill self" style={{ width: `${(area.score / maxScore) * 100}%` }} />
            </div>
            <strong>{area.score}%</strong>
          </div>
        ))}
      </div>
    </article>
  )
}

function ProfessorInsightsCard({ insights }) {
  return (
    <article className="card professor-block">
      <div className="section-header compact">
        <h2>Insights automaticos</h2>
      </div>
      <ul className="professor-list-block">
        {insights.map((insight) => (
          <li key={insight}>{insight}</li>
        ))}
      </ul>
    </article>
  )
}

function ProfessorStrategiesCard({ strategies }) {
  return (
    <article className="card professor-block">
      <div className="section-header compact">
        <h2>Estrategias y acciones sugeridas</h2>
      </div>
      <ul className="professor-list-block">
        {strategies.map((strategy) => (
          <li key={strategy}>{strategy}</li>
        ))}
      </ul>
    </article>
  )
}

function ProfessorPeriodComparisonCard({ comparison }) {
  return (
    <article className="card professor-block">
      <div className="section-header compact">
        <h2>Comparacion entre periodos</h2>
      </div>
      <div className="student-comparison-metrics">
        <div>
          <p>Promedio {comparison.previousPeriod}</p>
          <strong>{comparison.previousAverageScore}</strong>
        </div>
        <div>
          <p>Promedio {comparison.currentPeriod}</p>
          <strong>{comparison.currentAverageScore}</strong>
        </div>
        <div>
          <p>Variacion</p>
          <strong className={comparison.scoreDelta >= 0 ? 'text-safe' : 'text-danger'}>
            {comparison.scoreDelta >= 0 ? '+' : ''}
            {comparison.scoreDelta}
          </strong>
        </div>
      </div>
      <p className="student-interpretation">
        Riesgo medio/alto paso de {comparison.previousRiskHighMediumPct}% a{' '}
        {comparison.currentRiskHighMediumPct}% ({comparison.riskDelta >= 0 ? '+' : ''}
        {comparison.riskDelta} puntos).
      </p>
    </article>
  )
}

function ProfessorModelExecutionCard() {
  return (
    <article className="card professor-block professor-model-run">
      <div>
        <p className="next-step-kicker">Ejecucion del modelo</p>
        <h2>Actualiza la prediccion del grupo</h2>
        <p className="student-interpretation">
          Recalcula resultados simulados para revisar cambios en riesgo y desempeno por areas.
        </p>
      </div>
      <button className="auth-button" type="button">
        Ejecutar prediccion
      </button>
    </article>
  )
}

function ProfessorSelectedStudentDetail({ student }) {
  if (!student) {
    return null
  }

  const studentData = {
    predictedScore: student.predictedScore,
    actualScore: student.actualScore,
    studyHours: student.studyHours,
  }
  const analysisText = buildStudentAutomaticAnalysis(studentData, student.performanceAreas)

  return (
    <section className="professor-student-detail">
      <article className="card professor-block">
        <div className="section-header compact">
          <h2>Detalle del estudiante seleccionado</h2>
          <span className={`risk-pill ${normalizeRiskLevel(student.risk)}`}>
            {student.name} · {getRiskVisualMeta(student.risk).label}
          </span>
        </div>
        <p className="student-interpretation">
          Puntaje predicho: {student.predictedScore} · Referencia: {student.actualScore} · Tendencia:{' '}
          {student.trend}
        </p>
      </article>

      <section className="student-block-grid">
        <StudentExplanationCard analysisText={analysisText} factors={student.factors} />
        <StudentPerformanceAreasCard areas={student.performanceAreas} />
        <StudentRecommendationsCard recommendations={student.recommendations} />
        <StudentComparisonCard
          studentScore={student.predictedScore}
          comparison={student.comparison}
        />
        <StudentProgressCard progress={student.progress} />
        <StudentRiskVisualCard riskLevel={student.risk} />
      </section>
    </section>
  )
}

function AuthLayout({ eyebrow, children }) {
  // Layout fijo: el panel izquierdo (descripcion del proyecto) es el mismo
  // para login, registro y recuperacion de contrasena. Solo cambian los
  // formularios del lado derecho (`children`).
  return (
    <div className="auth-page login-page">
      <section className="auth-panel auth-portal">
        <div className="portal-role-stage">
          <div className="portal-role-copy">
            <span className="auth-kicker">{eyebrow || 'Proyecto'}</span>
            <h1>ProScore Analizer</h1>
            <p className="auth-description">
              Se desarrollara un sistema predictivo de clasificacion supervisada
              para la estimacion del desempeno de estudiantes en las pruebas Saber
              Pro, utilizando una arquitectura hibrida basada en Regresion
              Logistica Multinomial y Gradient Boosting. El modelo tendra como
              variable objetivo la clasificacion del rendimiento academico en
              diferentes categorias de desempeno (bajo, medio y alto), a partir
              de variables predictoras de caracter academico, socioeconomico y
              demografico, incluyendo promedio acumulado, estrato socioeconomico,
              programa academico, genero, edad, antecedentes academicos, acceso a
              recursos tecnologicos y habitos de estudio.
            </p>
            <p className="auth-description">
              El flujo de procesamiento contempla las etapas de extraccion,
              integracion y depuracion de datos, tratamiento de valores
              faltantes, deteccion de anomalias, codificacion de variables
              categoricas mediante tecnicas de encoding y escalamiento de
              variables numericas cuando sea requerido. Como primera fase, se
              implementara una Regresion Logistica Multiple como modelo base
              para obtener probabilidades de pertenencia a cada clase y analizar
              la relevancia estadistica de las variables independientes.
              Posteriormente, se entrenara un modelo Gradient Boosting para
              capturar patrones no lineales, interacciones complejas y reducir
              el error residual generado por el clasificador inicial.
            </p>
            <p className="auth-description">
              Adicionalmente, se evaluara una estrategia de Stacking donde las
              probabilidades generadas por la Regresion Logistica seran
              utilizadas como caracteristicas adicionales para el modelo de
              Gradient Boosting, conformando una arquitectura de ensamble
              orientada a maximizar el desempeno predictivo. La validacion del
              sistema se realizara mediante particionamiento de datos en
              conjuntos de entrenamiento y prueba, complementado con validacion
              cruzada, utilizando metricas de evaluacion como Accuracy,
              Precision, Recall, F1-Score, ROC-AUC y Matriz de Confusion. El
              objetivo final es construir un modelo robusto, interpretable y
              escalable que permita identificar tempranamente factores asociados
              al rendimiento en las pruebas Saber Pro y generar predicciones
              confiables que apoyen la toma de decisiones academicas e
              institucionales.
            </p>
          </div>
        </div>
      </section>

      <section className="auth-panel auth-card">{children}</section>
    </div>
  )
}

function LoginForm({ onLogin }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [formData, setFormData] = useState({ identifier: '', password: '' })
  const [feedback, setFeedback] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Maneja el callback de Google: ?google_token=...&google_ok=1 o ?google_error=...
  useEffect(() => {
    const token = searchParams.get('google_token')
    const okFlag = searchParams.get('google_ok')
    const errorMsg = searchParams.get('google_error')
    const returnTo = searchParams.get('returnTo') || '/inicio'

    if (token && okFlag) {
      // Guardamos el token y refrescamos la sesion via apiMe.
      apiSetToken(token)
      // Limpiamos los params de la URL sin recargar.
      searchParams.delete('google_token')
      searchParams.delete('google_ok')
      searchParams.delete('returnTo')
      setSearchParams(searchParams, { replace: true })
      // El componente App() ya escucha /auth/me al montar, pero forzamos
      // un reload suave navegando al destino. La sesion se hidrata desde
      // localStorage al renderizar.
      navigate(returnTo, { replace: true })
      return
    }
    if (errorMsg) {
      setFeedback({ ok: false, message: `Google: ${errorMsg}` })
      searchParams.delete('google_error')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await onLogin(formData)
      setFeedback(result)

      if (result.ok) {
        navigate('/inicio', { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    if (googleLoading) return
    setGoogleLoading(true)
    setFeedback(null)
    try {
      const result = await apiGetGoogleAuthUrl('/inicio')
      if (!result.ok) {
        setFeedback({
          ok: false,
          message: result.message || 'No se pudo iniciar el ingreso con Google.',
        })
        return
      }
      // Redirigimos al usuario a Google. Cuando vuelva, el useEffect de arriba
      // procesara el callback.
      window.location.href = result.url
    } catch {
      setFeedback({ ok: false, message: 'Error contacting the server.' })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout eyebrow="Inicio de sesion">
      <div className="auth-brand" aria-label="SION">
        <div className="auth-brand-mark" aria-hidden="true">
          <span />
        </div>
        <div className="auth-brand-word">ProScore Analizer</div>
      </div>

      <div className="auth-form-header">
        <h2>Hola, bienvenido!</h2>
        <p>
          Accede a tu cuenta ingresando tu usuario o numero de documento y tu contrasena en los
          campos indicados.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="login-identifier">
          Correo electronico *
        </label>
        <input
          id="login-identifier"
          className="auth-input"
          type="text"
          placeholder="tu.correo@dominio.com"
          value={formData.identifier}
          onChange={(event) =>
            setFormData((current) => ({ ...current, identifier: event.target.value }))
          }
          required
        />

        <label className="auth-label" htmlFor="login-password">
          Contrasena *
        </label>
        <div className="auth-password-field">
          <input
            id="login-password"
            className="auth-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Introduce tu contrasena"
            value={formData.password}
            onChange={(event) =>
              setFormData((current) => ({ ...current, password: event.target.value }))
            }
            required
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>

        <div className="auth-form-options">
          <label className="auth-check" htmlFor="remember-session">
            <input
              id="remember-session"
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
            />
            <span>Mantenerme conectado</span>
          </label>
          <NavLink to="/forgot-password">Has olvidado tu contrasena?</NavLink>
        </div>

        {feedback ? (
          <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
            {feedback.message}
          </p>
        ) : null}

        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Validando…' : 'Iniciar'}
        </button>
      </form>

      <div className="auth-divider" role="separator" aria-label="o">
        <span>o</span>
      </div>

      <button
        type="button"
        className="auth-google-button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || submitting}
      >
        <svg
          className="auth-google-icon"
          viewBox="0 0 48 48"
          width="20"
          height="20"
          aria-hidden="true"
        >
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303C33.972 32.91 29.388 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.366 0-9.931-3.066-11.289-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303a12.046 12.046 0 0 1-4.087 5.571l.001-.001 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>
        <span>{googleLoading ? 'Redirigiendo a Google…' : 'Entrar con Google'}</span>
      </button>
      <p className="auth-google-hint">
        Solo se admiten cuentas de Google con correo institucional
        <strong> @unac.edu.co</strong>.
      </p>

      <div className="auth-links single-link login-links">
        <p className="auth-hint">
          Ingresa con tu <strong>correo electronico</strong> y tu{' '}
          <strong>numero de documento</strong> como contrasena. Si aun no
          tienes acceso, contacta al administrador de tu programa.
        </p>
      </div>
    </AuthLayout>
  )
}

function ForgotPasswordForm({ onRecover }) {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      setFeedback(await onRecover(email))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow="Recuperacion">
      <div className="auth-form-header">
        <h2>Olvide mi contrasena</h2>
        <p>Ingresa tu correo para confirmar que existe en el sistema local.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="forgot-identifier">
          Correo o documento registrado
        </label>
        <input
          id="forgot-identifier"
          className="auth-input"
          type="text"
          placeholder="nombre@correo.com o numero de documento"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {feedback ? (
          <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
            {feedback.message}
          </p>
        ) : null}

        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Validando…' : 'Validar usuario'}
        </button>
      </form>

      <div className="auth-links single-link">
        <NavLink to="/login">Volver al login</NavLink>
      </div>
    </AuthLayout>
  )
}

function AccountSettingsModal({ user, onClose }) {
  // El nombre y el documento son datos reales del estudiante y no son editables.
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwFeedback, setPwFeedback] = useState(null)
  const [savingPw, setSavingPw] = useState(false)
  const toast = useToast()

  async function handleChangePassword(event) {
    event.preventDefault()
    if (savingPw) return
    setPwFeedback(null)
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwFeedback({ ok: false, message: 'Completa los campos de contrasena.' })
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwFeedback({
        ok: false,
        message: 'La nueva contrasena debe tener al menos 6 caracteres.',
      })
      return
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwFeedback({
        ok: false,
        message: 'La confirmacion no coincide con la nueva contrasena.',
      })
      return
    }
    if (pwForm.newPassword === pwForm.currentPassword) {
      setPwFeedback({
        ok: false,
        message: 'La nueva contrasena debe ser distinta a la actual.',
      })
      return
    }

    setSavingPw(true)
    try {
      const res = await apiChangeMyPassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      if (!res.ok) {
        setPwFeedback({ ok: false, message: res.message || 'No se pudo cambiar.' })
        toast.error(res.message || 'No se pudo cambiar la contrasena.')
        return
      }
      setPwFeedback({ ok: true, message: 'Contrasena actualizada.' })
      toast.success('Contrasena actualizada.')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="account-modal-backdrop" onClick={onClose}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <header className="account-modal-header">
          <div>
            <p className="banner-kicker">Mi cuenta</p>
            <h2>Configuracion de la cuenta</h2>
          </div>
          <button
            type="button"
            className="account-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <section className="account-section">
          <h3>Datos de tu cuenta</h3>
          <div className="account-info">
            <div>
              <span>Nombre completo</span>
              <strong>{user.username || '—'}</strong>
            </div>
            <div>
              <span>Documento de identidad</span>
              <strong>{user.documento || '—'}</strong>
            </div>
            <div>
              <span>Correo</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>Rol</span>
              <strong>{ROLE_CONFIG[user.role]?.label || user.role}</strong>
            </div>
          </div>
          <p className="student-interpretation" style={{ marginTop: '0.75rem' }}>
            El nombre y el documento son datos institucionales y no se pueden
            modificar desde aqui. Si necesitas actualizarlos, contacta al
            administrador.
          </p>
        </section>

        <section className="account-section">
          <h3>Cambiar contrasena</h3>
          <form className="profile-form" onSubmit={handleChangePassword}>
            <label className="auth-label" htmlFor="pw-current">
              Contrasena actual
            </label>
            <input
              id="pw-current"
              className="auth-input"
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm((c) => ({ ...c, currentPassword: e.target.value }))
              }
              required
            />
            <label className="auth-label" htmlFor="pw-new">
              Nueva contrasena
            </label>
            <input
              id="pw-new"
              className="auth-input"
              type="password"
              value={pwForm.newPassword}
              onChange={(e) =>
                setPwForm((c) => ({ ...c, newPassword: e.target.value }))
              }
              minLength="6"
              required
            />
            <label className="auth-label" htmlFor="pw-confirm">
              Confirmar nueva contrasena
            </label>
            <input
              id="pw-confirm"
              className="auth-input"
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((c) => ({ ...c, confirm: e.target.value }))}
              minLength="6"
              required
            />
            {pwFeedback ? (
              <p className={`auth-feedback ${pwFeedback.ok ? 'success' : 'error'}`}>
                {pwFeedback.message}
              </p>
            ) : null}
            <div className="form-actions">
              <button className="auth-button" type="submit" disabled={savingPw}>
                {savingPw ? 'Cambiando…' : 'Cambiar contrasena'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function DashboardShell({
  user,
  onLogout,
  children,
  topbarControls = null,
  activeNavIndex = 0,
  onNavSelect = null,
  customNav = null,
}) {
  const navigate = useNavigate()
  const roleSettings = ROLE_CONFIG[user.role] || ROLE_CONFIG.estudiante
  const navItems = customNav || roleSettings.nav
  const [accountOpen, setAccountOpen] = useState(false)

  function handleLogout() {
    onLogout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <div className="topbar-title">{roleSettings.topbarTitle}</div>
          <div className="topbar-sub">{roleSettings.topbarSubtitle}</div>
        </div>
        <div className="topbar-actions">
          {topbarControls}
          <Avatar name={user.username || user.email || user.documento} />
          <button
            className="logout-button account-button"
            type="button"
            onClick={() => setAccountOpen(true)}
            title="Configurar mi cuenta"
          >
            <Icon name="settings" size={16} />
            Mi cuenta
          </button>
          <button className="logout-button" type="button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="logo-name">Saber Pro</div>
          <div className="logo-sub">PREDICTOR IA</div>
          <div className="logo-dept">{roleSettings.department}</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((label, index) => (
            <button
              className={`nav-item ${index === activeNavIndex ? 'active' : ''}`}
              key={label}
              type="button"
              onClick={() => onNavSelect?.(index, label)}
            >
              <span className="nav-icon">
                {index === 0 ? <Icon name={roleSettings.icon} size={16} /> : '·'}
              </span>
              {label}
            </button>
          ))}
        </nav>

        <div className="user-card" onClick={() => setAccountOpen(true)} role="button" tabIndex={0}>
          <div className="user-avatar">
            <Icon name={roleSettings.icon} size={22} />
          </div>
          <div>
            <div className="user-name">{user.username}</div>
            <div className="user-role">
              {roleSettings.label}
              {user.role === 'rector' ? '' : ` · ${getProgramLabel(user.program)}`}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <div className="content-area">{children}</div>
      </main>

      {accountOpen ? (
        <AccountSettingsModal
          user={user}
          onClose={() => setAccountOpen(false)}
        />
      ) : null}
    </div>
  )
}

function MetricsGrid({ user, records, selectedProgram }) {
  return (
    <section className="grid-4">
      {metricCardsForRole(user, records, selectedProgram).map((metric) => (
        <article className={`kpi-card ${metric.accent}`} key={metric.label}>
          <div className="kpi-icon">
            <Icon name={metric.icon} size={22} />
          </div>
          <div className="kpi-value">{metric.value}</div>
          <div className="kpi-label">{metric.label}</div>
          <div className="kpi-delta">{metric.detail}</div>
        </article>
      ))}
    </section>
  )
}

function CohortPanel({ user, allowProgramFilter = false }) {
  const [program, setProgram] = useState(
    user.program === 'all' ? 'all' : user.program,
  )
  const [data, setData] = useState({
    status: 'loading',
    students: [],
    metrics: null,
    program: program,
  })

  useEffect(() => {
    let alive = true
    apiGetCohort(allowProgramFilter ? program : undefined).then((res) => {
      if (!alive) return
      if (!res.ok) {
        setData({
          status: 'error',
          students: [],
          metrics: null,
          program,
          error: res.message,
        })
        return
      }
      setData({
        status: 'ready',
        students: res.students || [],
        metrics: res.metrics || null,
        program: res.program || program,
      })
    })
    return () => {
      alive = false
    }
  }, [program, allowProgramFilter])

  const programLabel =
    data.program === 'all'
      ? 'todas las ingenierias'
      : getProgramLabel(data.program)

  return (
    <section className="card" style={{ padding: '20px 24px' }}>
      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Datos reales</p>
          <h2 style={{ margin: '4px 0 0' }}>Cohorte de estudiantes</h2>
          <p
            className="student-interpretation"
            style={{ margin: '6px 0 0', maxWidth: 720 }}
          >
            Listado en vivo de estudiantes registrados en el sistema y su
            prediccion mas reciente para {programLabel}.
          </p>
        </div>
        {allowProgramFilter ? (
          <div className="filter-group">
            <label htmlFor="cohort-program" className="auth-label" style={{ margin: 0 }}>
              Programa
            </label>
            <select
              id="cohort-program"
              className="auth-input auth-select"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option value="sistemas">Ingenieria de Sistemas</option>
            </select>
          </div>
        ) : null}
      </div>

      {data.status === 'loading' ? (
        <p className="student-interpretation">Cargando…</p>
      ) : data.status === 'error' ? (
        <p className="auth-feedback error">{data.error || 'No se pudo cargar la cohorte.'}</p>
      ) : (
        <>
          {data.metrics ? (
            <div className="cohort-metrics-grid">
              <div className="cohort-metric-card">
                <span className="label">Total estudiantes</span>
                <span className="value">{data.metrics.totalEstudiantes}</span>
                <span className="hint">en el alcance seleccionado</span>
              </div>
              <div className="cohort-metric-card">
                <span className="label">Con perfil completo</span>
                <span className="value">{data.metrics.conPerfil}</span>
                <span className="hint">han llenado su onboarding</span>
              </div>
              <div className="cohort-metric-card">
                <span className="label">Puntaje promedio</span>
                <span className="value">
                  {data.metrics.promedioPuntaje ?? '—'}
                </span>
                <span className="hint">prediccion del modelo</span>
              </div>
              <div className="cohort-metric-card">
                <span className="label">Distribucion por clase</span>
                <div className="cohort-distribution">
                  <span className="chip alto">Alto · {data.metrics.distribucion.alto}</span>
                  <span className="chip medio">Medio · {data.metrics.distribucion.medio}</span>
                  <span className="chip bajo">Bajo · {data.metrics.distribucion.bajo}</span>
                </div>
              </div>
            </div>
          ) : null}

          {data.students.length === 0 ? (
            <p className="student-interpretation">
              Aun no hay estudiantes registrados en este alcance.
            </p>
          ) : (
            <DataTable
              rows={data.students}
              searchFields={['documento', 'username', 'email']}
              searchPlaceholder="Buscar por nombre, documento o correo"
              defaultPageSize={25}
              rowKey={(s) => s.id}
              rowClassName={(s) => (s.completed ? '' : 'pending')}
              emptyMessage="Sin resultados con los filtros aplicados."
              columns={[
                {
                  key: 'username',
                  label: 'Estudiante',
                  render: (s) => (
                    <>
                      <strong>{s.username}</strong>
                      <br />
                      <small>{s.email}</small>
                    </>
                  ),
                },
                { key: 'documento', label: 'Documento', className: 'table-code' },
                { key: 'program', label: 'Programa', render: (s) => getProgramLabel(s.program) },
                { key: 'semestre', label: 'Semestre', render: (s) => s.semestre ?? '—' },
                {
                  key: 'puntajeEstimado',
                  label: 'Puntaje',
                  className: 'table-score',
                  render: (s) => s.puntajeEstimado ?? '—',
                },
                {
                  key: 'clase',
                  label: 'Clase',
                  render: (s) => <ClasePill clase={s.clase} />,
                },
                {
                  key: 'probabilidad',
                  label: 'Confianza',
                  render: (s) =>
                    s.probabilidad ? `${Math.round(s.probabilidad * 100)}%` : '—',
                },
                {
                  key: 'asistencia',
                  label: 'Asistencia',
                  render: (s) => (s.asistencia ? `${s.asistencia}%` : '—'),
                },
                {
                  key: 'nivelIngles',
                  label: 'Ingles',
                  render: (s) => s.nivelIngles ?? '—',
                },
              ]}
            />
          )}
        </>
      )}
    </section>
  )
}

function RectorView({ user, onLogout, onUserUpdated }) {
  const [activeNavIndex, setActiveNavIndex] = useState(0)
  // Solo hay un programa academico (sistemas) — el selector se removio del topbar.
  const [selectedProgram] = useState('sistemas')

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      searchPlaceholder="Buscar programa o estudiante..."
      topbarControls={null}
      activeNavIndex={activeNavIndex}
      onNavSelect={setActiveNavIndex}
    >
      {activeNavIndex === 0 ? (
        <RectorPanelSection
          user={user}
          selectedProgram={selectedProgram}
        />
      ) : null}
      {activeNavIndex === 1 ? (
        <RectorMetasSection
          user={user}
          selectedProgram={selectedProgram}
        />
      ) : null}
      {activeNavIndex === 2 ? (
        <RectorComparativoSection
          user={user}
          selectedProgram={selectedProgram}
        />
      ) : null}
      {activeNavIndex === 3 ? (
        <RectorReportesSection
          user={user}
          selectedProgram={selectedProgram}
        />
      ) : null}
    </DashboardShell>
  )
}

// Hook compartido: trae la cohorte de /cohort/students una sola vez por programa.
function useRectorCohort(program) {
  const [state, setState] = useState({ status: 'loading', students: [], metrics: null, error: null })
  useEffect(() => {
    let cancelled = false
    apiGetCohort(program === 'all' ? 'all' : program)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          setState({ status: 'error', students: [], metrics: null, error: res.message || 'Error' })
          return
        }
        setState({ status: 'ready', students: res.students || [], metrics: res.metrics || null, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ status: 'error', students: [], metrics: null, error: err.message || 'Error de red' })
      })
    return () => {
      cancelled = true
    }
  }, [program])
  return state
}

function avgOf(list, fn) {
  const xs = list.map(fn).filter((v) => v !== null && v !== undefined && Number.isFinite(v))
  if (!xs.length) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

// Helper top-level: descargar CSV de cohorte rector. Se mantiene fuera de los
// componentes para evitar que el linter (react-hooks/purity) interprete la
// llamada a Date.now() como impureza durante el render.
function descargarRectorCsv(inScope, selectedProgram) {
  const rows = [
    ['documento', 'nombre', 'programa', 'completado', 'puntaje_estimado', 'clase', 'asistencia', 'nivel_ingles'],
    ...inScope.map((s) => [
      s.documento,
      s.username,
      s.program,
      s.completed ? 'si' : 'no',
      s.puntajeEstimado ?? '',
      s.clase ?? '',
      s.asistencia ?? '',
      s.nivelIngles ?? '',
    ]),
  ]
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rector_${selectedProgram}_${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function bucketize(students) {
  return {
    conPerfil: students.filter((s) => s.completed).length,
    conPrediccion: students.filter((s) => s.puntajeEstimado !== null).length,
    sinPerfil: students.filter((s) => !s.completed).length,
    // Sin datos suficientes: estudiantes de primer semestre, aun sin historial
    // academico, para los que el modelo no emite prediccion.
    sinDatosSuficientes: students.filter(
      (s) => s.completed && s.puntajeEstimado === null,
    ).length,
    // Riesgo = inversa del desempeno proyectado. La clase 'alto' significa buen
    // desempeno, asi que equivale a riesgo BAJO (misma semantica que la vista
    // del estudiante, ver riskFromClase).
    riesgoAlto: students.filter((s) => s.clase === 'bajo').length,
    riesgoMedio: students.filter((s) => s.clase === 'medio').length,
    riesgoBajo: students.filter((s) => s.clase === 'alto').length,
    promedioPuntaje: avgOf(students, (s) => s.puntajeEstimado),
    promedioAsistencia: avgOf(students, (s) => s.asistencia),
    promedioInglesMap: students.reduce((acc, s) => {
      if (s.nivelIngles) acc[s.nivelIngles] = (acc[s.nivelIngles] || 0) + 1
      return acc
    }, {}),
  }
}

function RectorPanelSection({ user, selectedProgram }) {
  const { status, students, metrics, error } = useRectorCohort(selectedProgram)
  const visibleSummaries = useMemo(() => {
    if (status !== 'ready') return []
    const programs = [selectedProgram || 'sistemas']
    return programs.map((program) => {
      const inProg = students.filter((s) => s.program === program)
      const b = bucketize(inProg)
      return {
        program,
        label: getProgramLabel(program),
        students: inProg.length,
        averagePredicted:
          b.promedioPuntaje !== null ? Math.round(b.promedioPuntaje) : EMPTY_VALUE,
        averageActual: metrics?.promedioPuntaje !== null ? Math.round(metrics.promedioPuntaje) : EMPTY_VALUE,
        highRisk: b.riesgoAlto,
      }
    })
  }, [status, students, metrics, selectedProgram])

  const kpiRecords = students

  return (
    <>
      <CohortPanel user={user} allowProgramFilter={true} />

      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Vision institucional</p>
          <h1>{roleHomeTitle(user, selectedProgram)}</h1>
          <p className="banner-text">{roleHomeText(user, selectedProgram)}</p>
        </div>
        <div className="welcome-chip">
          <span>
            {getProgramLabel(selectedProgram || 'sistemas')}
          </span>
          <span>· {metrics?.totalEstudiantes ?? students.length} estudiantes</span>
        </div>
      </section>

      <MetricsGrid user={user} records={kpiRecords} selectedProgram={selectedProgram} />

      <section className="grid-2 content-grid-dashboard">
        <article className="card">
          <div className="section-header">
            <h2>Desempeno por programa</h2>
            <span className="live-chip">Institucional</span>
          </div>
          {status === 'error' ? (
            <p className="auth-feedback error">{error}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Est.</th>
                  <th>Prom. pred.</th>
                  <th>Prom. real</th>
                  <th>Riesgo alto</th>
                </tr>
              </thead>
              <tbody>
                {visibleSummaries.map((summary) => (
                  <tr key={summary.program}>
                    <td>{summary.label}</td>
                    <td className="table-code">{summary.students}</td>
                    <td className="table-score">{summary.averagePredicted}</td>
                    <td>{summary.averageActual}</td>
                    <td>{summary.highRisk}</td>
                  </tr>
                ))}
                {visibleSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>
                      {status === 'loading' ? 'Cargando...' : 'Sin datos.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </article>

        <article className="card">
          <div className="section-header compact">
            <h2>Prioridades rectorales</h2>
          </div>
          {status === 'ready' ? (
            <RectorPrioritiesList
              students={students}
              selectedProgram={selectedProgram}
            />
          ) : (
            <p className="student-interpretation">Cargando prioridades...</p>
          )}
        </article>
      </section>
    </>
  )
}

function RectorPrioritiesList({ students, selectedProgram }) {
  const inScope =
    selectedProgram === 'all'
      ? students
      : students.filter((s) => s.program === selectedProgram)
  const sinPerfil = inScope.filter((s) => !s.completed).length
  const conPerfil = inScope.filter((s) => s.completed).length
  const sinPrediccion = inScope.filter((s) => s.completed && s.puntajeEstimado === null).length
  // Riesgo alto = clase baja (el modelo lo ubica en bajo desempeno).
  const riesgoAlto = inScope.filter((s) => s.clase === 'bajo').length
  const total = inScope.length

  const cards = [
    {
      title: 'Calidad academica',
      text:
        conPerfil === 0
          ? 'Aun no hay estudiantes con perfil completo. La cobertura del modelo es del 0%.'
          : `${conPerfil} de ${total} estudiantes tienen perfil completo (${Math.round(
              (conPerfil / total) * 100,
            )}%). El siguiente paso es promover el onboarding entre los ${sinPerfil} faltantes.`,
    },
    {
      title: 'Intervencion focalizada',
      text:
        riesgoAlto > 0
          ? `${riesgoAlto} estudiantes estan en riesgo alto. Priorizar acompanamiento y simulacros para este grupo.`
          : 'No se detectan estudiantes en riesgo alto por ahora. Mantener seguimiento preventivo sobre los de riesgo medio.',
    },
    {
      title: 'Cobertura del modelo',
      text:
        sinPerfil > 0
          ? `${sinPerfil} estudiantes aun no completaron el perfil institucional. La prediccion no esta disponible hasta que lo hagan.`
          : sinPrediccion > 0
            ? `Todos los estudiantes en el ambito seleccionado tienen perfil institucional. ${sinPrediccion} de ellos (${Math.round(
                (sinPrediccion / total) * 100,
              )}%) aun no tienen historial academico por ser de primer semestre, asi que el modelo todavia no les emite prediccion.`
            : 'Todos los estudiantes en el ambito seleccionado ya tienen perfil completo y prediccion del modelo.',
    },
  ]

  return (
    <div className="report-cards">
      {cards.map((c) => (
        <article className="report-card" key={c.title}>
          <h3>{c.title}</h3>
          <p>{c.text}</p>
        </article>
      ))}
      {sinPrediccion > 0 ? (
        <p className="student-interpretation" style={{ margin: 0 }}>
          Ademas, {sinPrediccion} estudiantes con perfil completo aun no tienen una
          prediccion registrada.
        </p>
      ) : null}
    </div>
  )
}

// =========================
// Seccion 1: Metas estrategicas
// =========================
function RectorMetasSection({ selectedProgram }) {
  const { status, students, error } = useRectorCohort(selectedProgram)
  const inScope =
    selectedProgram === 'all'
      ? students
      : students.filter((s) => s.program === selectedProgram)
  const total = inScope.length
  const b = bucketize(inScope)
  const cobertura = total > 0 ? (b.conPerfil / total) * 100 : 0
  const riesgoPct = total > 0 ? (b.riesgoAlto / total) * 100 : 0
  const promedio = b.promedioPuntaje
  const asistencia = b.promedioAsistencia
  const metaCobertura = 90
  const metaRiesgoBajo = 8
  const metaPromedio = 160
  const metaAsistencia = 85

  const metas = [
    {
      label: 'Cobertura del perfil institucional',
      actual: cobertura,
      objetivo: metaCobertura,
      unidad: '%',
      hint: 'Estudiantes que completaron el perfil institucional.',
    },
    {
      label: 'Riesgo alto por debajo del umbral',
      actual: metaRiesgoBajo - riesgoPct,
      objetivo: metaRiesgoBajo,
      unidad: '% (inverso)',
      hint: 'Mide cuanto margen queda frente al 8% de riesgo alto permitido.',
    },
    {
      label: 'Puntaje promedio estimado',
      actual: promedio !== null ? Math.round(promedio) : 0,
      objetivo: metaPromedio,
      unidad: 'pts',
      hint: 'Promedio institucional del puntaje estimado por el modelo.',
    },
    {
      label: 'Asistencia promedio',
      actual: asistencia !== null ? Math.round(asistencia) : 0,
      objetivo: metaAsistencia,
      unidad: '%',
      hint: 'Asistencia promedio reportada por los estudiantes con perfil.',
    },
  ]

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Plan estrategico</p>
          <h1>Metas estrategicas del periodo</h1>
          <p className="banner-text">
            Seguimiento de los indicadores clave para el programa
            {' '}
            {selectedProgram === 'all' ? 'institucional' : getProgramLabel(selectedProgram)}.
            Los valores se calculan con la cohorte real cargada en la plataforma.
          </p>
        </div>
      </section>

      {status === 'loading' ? <p className="student-interpretation">Cargando...</p> : null}
      {status === 'error' ? <p className="auth-feedback error">{error}</p> : null}

      {status === 'ready' ? (
        <article className="card">
          <div className="section-header compact">
            <h2>Tablero de metas</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Actual</th>
                <th>Objetivo</th>
                <th>Estado</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {metas.map((m) => {
                const diff = m.actual - m.objetivo
                const reached = m.unidad === '% (inverso)' ? m.actual <= 0 : diff >= 0
                return (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td className="table-code">
                      {m.unidad === '% (inverso)'
                        ? `${(m.objetivo - m.actual).toFixed(1)}${m.unidad.split(' ')[0]}`
                        : `${m.actual}${m.unidad}`}
                    </td>
                    <td className="table-code">
                      {m.objetivo}
                      {m.unidad === '% (inverso)' ? '%' : m.unidad}
                    </td>
                    <td>
                      <span className={`risk-pill ${reached ? 'bajo' : 'alto'}`}>
                        {reached ? 'En meta' : 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <span className="student-interpretation" style={{ margin: 0 }}>
                        {m.hint}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </article>
      ) : null}
    </section>
  )
}

// =========================
// Seccion 2: Comparativo
// =========================
function RectorComparativoSection() {
  const sistemas = useRectorCohort('sistemas')
  const isReady = sistemas.status === 'ready'

  const programas = [
    { value: 'sistemas', label: 'Ingenieria de Sistemas', state: sistemas },
  ]
  const visible = programas

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Comparativo</p>
          <h1>Cohorte de Sistemas</h1>
          <p className="banner-text">
            Indicadores de la ingenieria evaluada con la cohorte real.
          </p>
        </div>
      </section>

      {isReady ? (
        <>
          <div className="cohort-metrics-grid">
            {visible.map((p) => {
              const b = bucketize(p.state.students)
              return (
                <div className="cohort-metric-card" key={p.value}>
                  <span className="label">{p.label}</span>
                  <span className="value">{p.state.students.length}</span>
                  <span className="hint">estudiantes activos</span>
                  <div className="cohort-distribution" style={{ marginTop: 8 }}>
                    <span className="chip bajo">bajo: {b.riesgoBajo}</span>
                    <span className="chip medio">medio: {b.riesgoMedio}</span>
                    <span className="chip alto">alto: {b.riesgoAlto}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <article className="card">
            <div className="section-header compact">
              <h2>Detalle comparativo</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Indicador</th>
                  {visible.map((p) => (
                    <th key={p.value}>{p.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Estudiantes</td>
                  {visible.map((p) => (
                    <td key={p.value} className="table-code">{p.state.students.length}</td>
                  ))}
                </tr>
                <tr>
                  <td>Con perfil completo</td>
                  {visible.map((p) => (
                    <td key={p.value} className="table-code">{bucketize(p.state.students).conPerfil}</td>
                  ))}
                </tr>
                <tr>
                  <td>Con prediccion</td>
                  {visible.map((p) => (
                    <td key={p.value} className="table-code">{bucketize(p.state.students).conPrediccion}</td>
                  ))}
                </tr>
                <tr>
                  <td>Promedio estimado</td>
                  {visible.map((p) => {
                    const v = bucketize(p.state.students).promedioPuntaje
                    return (
                      <td key={p.value} className="table-score">{v !== null ? Math.round(v) : '—'}</td>
                    )
                  })}
                </tr>
                <tr>
                  <td>Asistencia promedio</td>
                  {visible.map((p) => {
                    const v = bucketize(p.state.students).promedioAsistencia
                    return (
                      <td key={p.value} className="table-code">
                        {v !== null ? `${Math.round(v)}%` : '—'}
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td>Riesgo alto</td>
                  {visible.map((p) => (
                    <td key={p.value} className="table-code">{bucketize(p.state.students).riesgoAlto}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </article>
        </>
      ) : (
        <p className="student-interpretation">Cargando comparativo...</p>
      )}
    </section>
  )
}

// =========================
// Seccion 3: Reportes
// =========================
function RectorReportesSection({ selectedProgram }) {
  const { status, students, error } = useRectorCohort(selectedProgram)
  const inScope =
    selectedProgram === 'all'
      ? students
      : students.filter((s) => s.program === selectedProgram)
  const b = bucketize(inScope)
  const topRiesgo = inScope
    .filter((s) => s.puntajeEstimado !== null)
    .slice()
    .sort((a, b) => (a.puntajeEstimado ?? 1) - (b.puntajeEstimado ?? 1))
    .slice(0, 5)
  const sinPerfil = inScope
    .filter((s) => !s.completed)
    .slice()
    .sort((a, b2) => a.username.localeCompare(b2.username))
    .slice(0, 10)

  function descargarCsv() {
    descargarRectorCsv(inScope, selectedProgram)
  }

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Reportes</p>
          <h1>Vistas para toma de decisiones</h1>
          <p className="banner-text">
            Distribucion de riesgo, top 5 de mayor riesgo y estudiantes sin perfil. Puedes
            descargar la cohorte completa en CSV para trabajarla fuera del sistema.
          </p>
        </div>
        <div className="welcome-chip">
          <button className="auth-button" type="button" onClick={descargarCsv}>
            Descargar CSV
          </button>
        </div>
      </section>

      {status === 'error' ? <p className="auth-feedback error">{error}</p> : null}
      {status === 'loading' ? <p className="student-interpretation">Cargando...</p> : null}

      {status === 'ready' ? (
        <>
          <div className="grid-2">
            <article className="card">
              <div className="section-header compact">
                <h2>Distribucion de riesgo</h2>
              </div>
              <div className="cohort-distribution" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="kpi-card lime" style={{ marginBottom: 8 }}>
                  <span className="kpi-label">Riesgo bajo</span>
                  <span className="kpi-value">{b.riesgoBajo}</span>
                </div>
                <div className="kpi-card" style={{ marginBottom: 8, borderTopColor: '#f6bb42' }}>
                  <span className="kpi-label">Riesgo medio</span>
                  <span className="kpi-value">{b.riesgoMedio}</span>
                </div>
                <div className="kpi-card" style={{ borderTopColor: '#da4453' }}>
                  <span className="kpi-label">Riesgo alto</span>
                  <span className="kpi-value">{b.riesgoAlto}</span>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="section-header compact">
                <h2>Cobertura del modelo</h2>
              </div>
              <div className="cohort-metrics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="cohort-metric-card">
                  <span className="label">Con perfil</span>
                  <span className="value">{b.conPerfil}</span>
                </div>
                <div className="cohort-metric-card">
                  <span className="label">Sin perfil</span>
                  <span className="value">{b.sinPerfil}</span>
                </div>
                <div className="cohort-metric-card">
                  <span className="label">Con prediccion</span>
                  <span className="value">{b.conPrediccion}</span>
                </div>
                <div className="cohort-metric-card">
                  <span className="label">Sin datos suficientes</span>
                  <span className="value">{b.sinDatosSuficientes ?? (b.conPerfil - b.conPrediccion)}</span>
                </div>
              </div>
            </article>
          </div>

          <article className="card">
            <div className="section-header compact">
              <h2>Top 5 en riesgo (menor puntaje estimado)</h2>
            </div>
            {topRiesgo.length === 0 ? (
              <p className="student-interpretation">
                Aun no hay estudiantes con prediccion registrada.
              </p>
            ) : (
              <table className="cohort-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Programa</th>
                    <th>Puntaje</th>
                    <th>Clase</th>
                    <th>Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {topRiesgo.map((s) => (
                    <tr key={s.id} className={s.clase === 'alto' ? 'pending' : ''}>
                      <td className="table-code">{s.documento}</td>
                      <td>{s.username}</td>
                      <td>{getProgramLabel(s.program)}</td>
                      <td className="table-score">
                        {s.puntajeEstimado !== null ? Math.round(s.puntajeEstimado) : '—'}
                      </td>
                      <td>
                        <ClasePill clase={s.clase} />
                      </td>
                      <td>{s.asistencia !== null ? `${s.asistencia}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>

          <article className="card">
            <div className="section-header compact">
              <h2>Estudiantes sin perfil (primeros 10)</h2>
            </div>
            {sinPerfil.length === 0 ? (
              <p className="student-interpretation">
                Todos los estudiantes en el ambito seleccionado ya completaron el perfil.
              </p>
            ) : (
              <table className="cohort-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Programa</th>
                  </tr>
                </thead>
                <tbody>
                  {sinPerfil.map((s) => (
                    <tr key={s.id}>
                      <td className="table-code">{s.documento}</td>
                      <td>{s.username}</td>
                      <td>{getProgramLabel(s.program)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>
        </>
      ) : null}
    </section>
  )
}

function DeanView({ user, onLogout, onUserUpdated }) {
  const [selectedProgram] = useState(user.program || 'sistemas')
  // El decano inicia directamente en "Programas" (idx 0) para que pueda
  // ver el listado de estudiantes. El selector de programa del topbar se removio
  // porque solo hay un programa academico (sistemas).
  const [activeNavIndex, setActiveNavIndex] = useState(0)

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      topbarControls={null}
      activeNavIndex={activeNavIndex}
      onNavSelect={setActiveNavIndex}
    >
      {activeNavIndex === 0 ? (
        <DeanProgramasSection selectedProgram={selectedProgram} />
      ) : null}
      {activeNavIndex === 1 ? (
        <DeanDashboardSection
          user={user}
          selectedProgram={selectedProgram}
        />
      ) : null}
      {activeNavIndex === 2 ? (
        <DeanBenchmarkingSection
          user={user}
          selectedProgram={selectedProgram}
        />
      ) : null}
      {activeNavIndex === 3 ? (
        <DeanIndicadoresSection selectedProgram={selectedProgram} />
      ) : null}
    </DashboardShell>
  )
}

function DeanDashboardSection({ user, selectedProgram }) {
  return (
    <>
      <CohortPanel user={user} />
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Vista del decano</p>
          <h1>{roleHomeTitle(user, selectedProgram)}</h1>
          <p className="banner-text">{roleHomeText(user, selectedProgram)}</p>
        </div>
        <div className="welcome-chip">
          <span>{getProgramLabel(selectedProgram)}</span>
        </div>
      </section>
      <DeanSummaryCards selectedProgram={selectedProgram} />
      <section className="grid-2 content-grid-dashboard">
        <article className="card">
          <div className="section-header">
            <h2>Ranking del programa</h2>
            <span className="live-chip">Filtrado</span>
          </div>
          <DeanTopStudentsTable selectedProgram={selectedProgram} />
        </article>
        <article className="card">
          <div className="section-header compact">
            <h2>Lectura ejecutiva</h2>
          </div>
          <DeanExecutiveReading selectedProgram={selectedProgram} />
        </article>
      </section>
    </>
  )
}

function DeanProgramasSection({ selectedProgram }) {
  const { status, students, error } = useRectorCohort(selectedProgram)
  const b = bucketize(students)
  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Programa academico</p>
          <h1>{getProgramLabel(selectedProgram)}</h1>
          <p className="banner-text">
            Listado completo de estudiantes matriculados en el programa, con su
            estado de perfil y resultado del modelo predictivo.
          </p>
        </div>
      </section>

      {status === 'error' ? <p className="auth-feedback error">{error}</p> : null}
      {status === 'loading' ? <p className="student-interpretation">Cargando...</p> : null}

      {status === 'ready' ? (
        <>
          <div className="cohort-metrics-grid">
            <div className="cohort-metric-card">
              <span className="label">Estudiantes</span>
              <span className="value">{students.length}</span>
            </div>
            <div className="cohort-metric-card">
              <span className="label">Con perfil completo</span>
              <span className="value">{b.conPerfil}</span>
            </div>
            <div className="cohort-metric-card">
              <span className="label">Con prediccion</span>
              <span className="value">{b.conPrediccion}</span>
            </div>
            <div className="cohort-metric-card">
              <span className="label">Riesgo alto</span>
              <span className="value">{b.riesgoAlto}</span>
            </div>
          </div>

          <article className="card">
            <div className="section-header compact">
              <h2>Listado completo</h2>
            </div>
            {students.length === 0 ? (
              <p className="student-interpretation">Sin estudiantes en el programa.</p>
            ) : (
              <DataTable
                rows={students}
                searchFields={['documento', 'username', 'email']}
                searchPlaceholder="Buscar por documento, nombre o correo..."
                defaultPageSize={25}
                pageSizeOptions={[10, 25, 50, 100]}
                emptyMessage="Sin coincidencias para la busqueda."
                rowKey={(s) => s.id}
                rowClassName={(s) => (!s.completed ? 'pending' : '')}
                columns={[
                  { key: 'documento', label: 'Documento', className: 'table-code' },
                  { key: 'username', label: 'Nombre' },
                  { key: 'email', label: 'Correo' },
                  {
                    key: 'completed',
                    label: 'Perfil',
                    render: (s) => (
                      <span className={`risk-pill ${s.completed ? 'bajo' : 'medio'}`}>
                        {s.completed ? 'Completo' : 'Pendiente'}
                      </span>
                    ),
                  },
                  {
                    key: 'puntajeEstimado',
                    label: 'Puntaje',
                    className: 'table-score',
                    render: (s) =>
                      s.puntajeEstimado !== null && s.puntajeEstimado !== undefined
                        ? Math.round(s.puntajeEstimado)
                        : '—',
                  },
                  {
                    key: 'clase',
                    label: 'Clase',
                    render: (s) => <ClasePill clase={s.clase} />,
                  },
                ]}
              />
            )}
          </article>
        </>
      ) : null}
    </section>
  )
}

function DeanBenchmarkingSection({ selectedProgram }) {
  const state = useRectorCohort(selectedProgram)
  const isReady = state.status === 'ready'

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Benchmarking</p>
          <h1>Indicadores de {getProgramLabel(selectedProgram)}</h1>
          <p className="banner-text">
            Resumen de los indicadores clave del programa bajo tu responsabilidad.
          </p>
        </div>
      </section>

      {isReady ? (
        <>
          <article className="card">
            <div className="section-header compact">
              <h2>Indicadores del programa</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Estudiantes</td>
                  <td className="table-code">{state.students.length}</td>
                </tr>
                <tr>
                  <td>Con perfil completo</td>
                  <td className="table-code">{bucketize(state.students).conPerfil}</td>
                </tr>
                <tr>
                  <td>Con prediccion</td>
                  <td className="table-code">{bucketize(state.students).conPrediccion}</td>
                </tr>
                <tr>
                  <td>Promedio estimado</td>
                  <td className="table-score">
                    {(() => {
                      const v = bucketize(state.students).promedioPuntaje
                      return v !== null ? Math.round(v) : '—'
                    })()}
                  </td>
                </tr>
                <tr>
                  <td>Asistencia promedio</td>
                  <td className="table-code">
                    {(() => {
                      const v = bucketize(state.students).promedioAsistencia
                      return v !== null ? `${Math.round(v)}%` : '—'
                    })()}
                  </td>
                </tr>
                <tr>
                  <td>Riesgo alto</td>
                  <td className="table-code">{bucketize(state.students).riesgoAlto}</td>
                </tr>
              </tbody>
            </table>
          </article>
        </>
      ) : (
        <p className="student-interpretation">Cargando indicadores...</p>
      )}
    </section>
  )
}

function DeanIndicadoresSection({ selectedProgram }) {
  const { status, students, error } = useRectorCohort(selectedProgram)
  const inScope = students
  const b = bucketize(inScope)
  const total = inScope.length
  const cobertura = total > 0 ? (b.conPerfil / total) * 100 : 0
  const metaCobertura = 90
  const metaRiesgoBajo = 8
  const riesgoPct = total > 0 ? (b.riesgoAlto / total) * 100 : 0

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Indicadores</p>
          <h1>Metas y reporte del programa</h1>
          <p className="banner-text">
            Resumen ejecutivo de los indicadores clave del programa
            {' '}{getProgramLabel(selectedProgram)} con datos reales de la cohorte.
          </p>
        </div>
      </section>

      {status === 'error' ? <p className="auth-feedback error">{error}</p> : null}
      {status === 'loading' ? <p className="student-interpretation">Cargando...</p> : null}

      {status === 'ready' ? (
        <>
          <article className="card">
            <div className="section-header compact">
              <h2>Metas del programa</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Actual</th>
                  <th>Objetivo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cobertura del perfil</td>
                  <td className="table-code">{Math.round(cobertura)}%</td>
                  <td className="table-code">{metaCobertura}%</td>
                  <td>
                    <span className={`risk-pill ${cobertura >= metaCobertura ? 'bajo' : 'alto'}`}>
                      {cobertura >= metaCobertura ? 'En meta' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Riesgo alto (umbral)</td>
                  <td className="table-code">{Math.round(riesgoPct)}%</td>
                  <td className="table-code">&le; {metaRiesgoBajo}%</td>
                  <td>
                    <span className={`risk-pill ${riesgoPct <= metaRiesgoBajo ? 'bajo' : 'alto'}`}>
                      {riesgoPct <= metaRiesgoBajo ? 'En meta' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Predicciones generadas</td>
                  <td className="table-code">{b.conPrediccion}</td>
                  <td className="table-code">{b.conPerfil}</td>
                  <td>
                    <span className={`risk-pill ${b.conPrediccion === b.conPerfil ? 'bajo' : 'medio'}`}>
                      {b.conPrediccion === b.conPerfil ? 'Completo' : 'En curso'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>

          <div className="grid-2">
            <article className="card">
              <div className="section-header compact">
                <h2>Distribucion de riesgo</h2>
              </div>
              <div className="cohort-distribution" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="kpi-card lime" style={{ marginBottom: 8 }}>
                  <span className="kpi-label">Bajo</span>
                  <span className="kpi-value">{b.riesgoBajo}</span>
                </div>
                <div className="kpi-card" style={{ marginBottom: 8, borderTopColor: '#f6bb42' }}>
                  <span className="kpi-label">Medio</span>
                  <span className="kpi-value">{b.riesgoMedio}</span>
                </div>
                <div className="kpi-card" style={{ borderTopColor: '#da4453' }}>
                  <span className="kpi-label">Alto</span>
                  <span className="kpi-value">{b.riesgoAlto}</span>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="section-header compact">
                <h2>Cobertura del modelo</h2>
              </div>
              <div className="cohort-metrics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="cohort-metric-card">
                  <span className="label">Con perfil</span>
                  <span className="value">{b.conPerfil}</span>
                </div>
                <div className="cohort-metric-card">
                  <span className="label">Sin perfil</span>
                  <span className="value">{b.sinPerfil}</span>
                </div>
                <div className="cohort-metric-card">
                  <span className="label">Con prediccion</span>
                  <span className="value">{b.conPrediccion}</span>
                </div>
                <div className="cohort-metric-card">
                  <span className="label">Sin datos suficientes</span>
                  <span className="value">{b.sinDatosSuficientes ?? (b.conPerfil - b.conPrediccion)}</span>
                </div>
              </div>
            </article>
          </div>
        </>
      ) : null}
    </section>
  )
}

function DeanSummaryCards({ selectedProgram }) {
  const { status, students } = useRectorCohort(selectedProgram)
  if (status !== 'ready') return null
  const b = bucketize(students)
  const total = students.length
  const promedio = b.promedioPuntaje
  const cobertura = total > 0 ? Math.round((b.conPerfil / total) * 100) : 0
  return (
    <section className="grid-4 kpi-grid">
      <article className="kpi-card indigo">
        <span className="kpi-icon"><Icon name="users" size={22} /></span>
        <span className="kpi-value">{total}</span>
        <span className="kpi-label">Estudiantes del programa</span>
        <span className="kpi-delta">{cobertura}% con perfil</span>
      </article>
      <article className="kpi-card cyan">
        <span className="kpi-icon"><Icon name="trend" size={22} /></span>
        <span className="kpi-value">
          {promedio !== null ? Math.round(promedio) : '—'}
        </span>
        <span className="kpi-label">Puntaje promedio estimado</span>
        <span className="kpi-delta">cohorte {getProgramLabel(selectedProgram)}</span>
      </article>
      <article className="kpi-card lime">
        <span className="kpi-icon"><Icon name="shield" size={22} /></span>
        <span className="kpi-value">{b.riesgoBajo}</span>
        <span className="kpi-label">En riesgo bajo</span>
        <span className="kpi-delta">{b.riesgoMedio} medios · {b.riesgoAlto} altos</span>
      </article>
      <article className="kpi-card rose">
        <span className="kpi-icon"><Icon name="warning" size={22} /></span>
        <span className="kpi-value">{b.riesgoAlto}</span>
        <span className="kpi-label">En riesgo alto</span>
        <span className="kpi-delta">requieren intervencion prioritaria</span>
      </article>
    </section>
  )
}

function DeanTopStudentsTable({ selectedProgram }) {
  const { status, students } = useRectorCohort(selectedProgram)
  if (status !== 'ready') {
    return <p className="student-interpretation">Cargando...</p>
  }
  if (students.length === 0) {
    return <p className="student-interpretation">Sin estudiantes en el programa.</p>
  }
  const conPrediccion = students
    .filter((s) => s.puntajeEstimado !== null)
    .slice()
    .sort((a, b) => b.puntajeEstimado - a.puntajeEstimado)
    .slice(0, 8)
  if (conPrediccion.length === 0) {
    return (
      <p className="student-interpretation">
        Aun no hay estudiantes con prediccion registrada en este programa.
      </p>
    )
  }
  return (
    <table className="cohort-table">
      <thead>
        <tr>
          <th>Documento</th>
          <th>Nombre</th>
          <th>Puntaje</th>
          <th>Clase</th>
        </tr>
      </thead>
      <tbody>
        {conPrediccion.map((s) => (
          <tr key={s.id}>
            <td className="table-code">{s.documento}</td>
            <td>{s.username}</td>
            <td className="table-score">{Math.round(s.puntajeEstimado)}</td>
            <td>
              <ClasePill clase={s.clase} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DeanExecutiveReading({ selectedProgram }) {
  const { status, students } = useRectorCohort(selectedProgram)
  if (status !== 'ready') {
    return <p className="student-interpretation">Cargando...</p>
  }
  const b = bucketize(students)
  const mejor = students
    .filter((s) => s.puntajeEstimado !== null)
    .slice()
    .sort((a, x) => x.puntajeEstimado - a.puntajeEstimado)[0]
  return (
    <div className="report-cards">
      <article className="report-card">
        <h3>Programa asignado</h3>
        <p>
          Estas visualizando los indicadores de {getProgramLabel(selectedProgram)}.
          Cambia el selector del topbar para ver el otro programa de la facultad.
        </p>
      </article>
      <article className="report-card">
        <h3>Mejor estudiante visible</h3>
        <p>
          {mejor
            ? `${mejor.username} (${mejor.documento}) lidera el ranking con un puntaje estimado de ${Math.round(mejor.puntajeEstimado)}.`
            : 'Aun no hay estudiantes con prediccion registrada en el programa.'}
        </p>
      </article>
      <article className="report-card">
        <h3>Accion recomendada</h3>
        <p>
          {b.riesgoAlto > 0
            ? `Prioriza el acompanimiento a los ${b.riesgoAlto} estudiantes en riesgo alto y el cierre de los ${b.sinPerfil} perfiles pendientes.`
            : b.sinPerfil > 0
            ? `No hay riesgo alto, pero ${b.sinPerfil} estudiantes aun no completan el perfil. Promueve el onboarding para liberar la prediccion.`
            : 'Cobertura completa y sin riesgo alto detectado. Mantener seguimiento.'}
        </p>
      </article>
    </div>
  )
}

function ProfessorView({ user, onLogout, onUserUpdated }) {
  const [selectedProgram] = useState(user.program || 'sistemas')
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const professorSections = ROLE_CONFIG.profesor.nav
  const records = getProfessorRecordsByProgram(selectedProgram)
  const metrics = buildProfessorMetrics(records)
  const areaAverages = buildProfessorAreaAverages(records)
  const insights = buildProfessorInsights(records, metrics, areaAverages)
  const strategies = buildProfessorStrategies(metrics, areaAverages)
  const periodComparison = buildProfessorPeriodComparison(metrics)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const selectedStudent =
    records.find((record) => record.id === selectedStudentId) || records[0] || null

  const isDashboardSection = activeSectionIndex === 0
  const isMonitoringSection = activeSectionIndex === 1
  const isAlertsSection = activeSectionIndex === 2
  const isReportsSection = activeSectionIndex === 3

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      topbarControls={null}
      activeNavIndex={activeSectionIndex}
      onNavSelect={setActiveSectionIndex}
    >
      <section className="card student-section-state">
        <div>
          <p className="banner-kicker">Seccion activa</p>
          <h2>{professorSections[activeSectionIndex]}</h2>
          <p className="student-interpretation">
            Vista docente para analizar el grupo, priorizar riesgos y tomar decisiones academicas.
          </p>
        </div>
      </section>

      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Vista docente</p>
          <h1>{roleHomeTitle(user, selectedProgram)}</h1>
          <p className="banner-text">{roleHomeText(user, selectedProgram)}</p>
        </div>
        <div className="welcome-chip">
          <span>{getProgramLabel(selectedProgram)}</span>
          <span></span>
        </div>
      </section>

      {isDashboardSection ? (
        <>
          <CohortPanel user={user} />
          <ProfessorMetricsCards metrics={metrics} />
          <section className="grid-2 content-grid-dashboard">
            <ProfessorRiskDistributionCard metrics={metrics} />
            <ProfessorPeriodComparisonCard comparison={periodComparison} />
          </section>
          <ProfessorModelExecutionCard />
        </>
      ) : null}

      {isMonitoringSection ? (
        <>
          <ProfessorMetricsCards metrics={metrics} />
          <ProfessorStudentsTable
            records={records}
            selectedStudentId={selectedStudent?.id}
            onSelectStudent={(student) => setSelectedStudentId(student.id)}
          />
          <ProfessorSelectedStudentDetail student={selectedStudent} />
        </>
      ) : null}

      {isAlertsSection ? (
        <section className="grid-2 content-grid-dashboard">
          <ProfessorInsightsCard insights={insights} />
          <ProfessorStrategiesCard strategies={strategies} />
        </section>
      ) : null}

      {isReportsSection ? (
        <section className="grid-2 content-grid-dashboard">
          <ProfessorAreasAnalysisCard areaAverages={areaAverages} />
          <ProfessorPeriodComparisonCard comparison={periodComparison} />
        </section>
      ) : null}
    </DashboardShell>
  )
}

function riskFromClase(clase) {
  if (clase === 'alto') return 'bajo'
  if (clase === 'bajo') return 'alto'
  return 'medio'
}

// Pill unico para la clase predicha por el modelo.
//
// `clase` es el DESEMPENO proyectado (alto/medio/bajo), no el riesgo. El color
// del pill comunica el riesgo que implica: clase 'alto' (buen desempeno) es
// riesgo bajo y se pinta verde; clase 'bajo' es riesgo alto y se pinta rojo.
// Es la misma inversion que usa la vista del estudiante.
//
// Un estudiante sin historial academico (1er semestre) no tiene clase: se
// muestra explicitamente "Sin datos suficientes" en vez de una clase inventada.
function ClasePill({ clase }) {
  if (!clase) return <span className="muted-text">Sin datos suficientes</span>
  return <span className={`risk-pill ${riskFromClase(clase)}`}>{clase}</span>
}

const RISK_LABEL_FROM_CLASE = {
  alto: 'Riesgo bajo',
  medio: 'Riesgo medio',
  bajo: 'Riesgo alto',
}

const EMPTY_PROFILE_FORM = {
  promedio_acumulado: '',
  promedio_basicas: '',
  promedio_ingenieria: '',
  num_reprobadas: '',
  pct_creditos: '',
  semestre: '',
  estrato: '',
  acceso_internet: false,
  acceso_pc: false,
  trabaja: false,
  genero: '',
  edad: '',
  ciudad: '',
  horas_estudio_semana: '',
  nivel_ingles: 'B1',
  simulacros_realizados: '',
  asistencia_pct: '',
}

function profileToForm(profile) {
  if (!profile) return EMPTY_PROFILE_FORM
  return {
    promedio_acumulado: profile.promedio_acumulado ?? '',
    promedio_basicas: profile.promedio_basicas ?? '',
    promedio_ingenieria: profile.promedio_ingenieria ?? '',
    num_reprobadas: profile.num_reprobadas ?? '',
    pct_creditos: profile.pct_creditos ?? '',
    semestre: profile.semestre ?? '',
    estrato: profile.estrato ?? '',
    acceso_internet: !!profile.acceso_internet,
    acceso_pc: !!profile.acceso_pc,
    trabaja: !!profile.trabaja,
    genero: profile.genero ?? '',
    edad: profile.edad ?? '',
    ciudad: profile.ciudad ?? '',
    horas_estudio_semana: profile.horas_estudio_semana ?? '',
    nivel_ingles: profile.nivel_ingles ?? 'B1',
    simulacros_realizados: profile.simulacros_realizados ?? '',
    asistencia_pct: profile.asistencia_pct ?? '',
  }
}

function StudentProfileForm({ initialValues, onSubmit, onCancel, busy, error }) {
  const [form, setForm] = useState(initialValues || EMPTY_PROFILE_FORM)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      promedio_acumulado: form.promedio_acumulado === '' ? null : Number(form.promedio_acumulado),
      promedio_basicas: form.promedio_basicas === '' ? null : Number(form.promedio_basicas),
      promedio_ingenieria:
        form.promedio_ingenieria === '' ? null : Number(form.promedio_ingenieria),
      num_reprobadas: form.num_reprobadas === '' ? null : Number(form.num_reprobadas),
      pct_creditos: form.pct_creditos === '' ? null : Number(form.pct_creditos),
      semestre: form.semestre === '' ? null : Number(form.semestre),
      estrato: form.estrato === '' ? null : Number(form.estrato),
      acceso_internet: !!form.acceso_internet,
      acceso_pc: !!form.acceso_pc,
      trabaja: !!form.trabaja,
      genero: form.genero || null,
      edad: form.edad === '' ? null : Number(form.edad),
      ciudad: form.ciudad?.trim() || null,
      horas_estudio_semana:
        form.horas_estudio_semana === '' ? null : Number(form.horas_estudio_semana),
      nivel_ingles: form.nivel_ingles || null,
      simulacros_realizados:
        form.simulacros_realizados === '' ? null : Number(form.simulacros_realizados),
      asistencia_pct: form.asistencia_pct === '' ? null : Number(form.asistencia_pct),
    }
    onSubmit(payload)
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <h3 className="form-group-title">Desempeno academico</h3>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Promedio acumulado (0–5)</span>
          <input
            className="auth-input"
            type="number"
            step="0.01"
            min="0"
            max="5"
            value={form.promedio_acumulado}
            onChange={(e) => update('promedio_acumulado', e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Promedio en materias basicas</span>
          <input
            className="auth-input"
            type="number"
            step="0.01"
            min="0"
            max="5"
            value={form.promedio_basicas}
            onChange={(e) => update('promedio_basicas', e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Promedio en ingenieria</span>
          <input
            className="auth-input"
            type="number"
            step="0.01"
            min="0"
            max="5"
            value={form.promedio_ingenieria}
            onChange={(e) => update('promedio_ingenieria', e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Materias reprobadas</span>
          <input
            className="auth-input"
            type="number"
            min="0"
            max="30"
            value={form.num_reprobadas}
            onChange={(e) => update('num_reprobadas', e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>% de creditos aprobados</span>
          <input
            className="auth-input"
            type="number"
            min="0"
            max="100"
            value={form.pct_creditos}
            onChange={(e) => update('pct_creditos', e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Semestre actual</span>
          <input
            className="auth-input"
            type="number"
            min="1"
            max="12"
            value={form.semestre}
            onChange={(e) => update('semestre', e.target.value)}
            required
          />
        </label>
      </div>

      <h3 className="form-group-title">Contexto socioeconomico</h3>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Estrato socioeconomico</span>
          <select
            className="auth-input auth-select"
            value={form.estrato}
            onChange={(e) => update('estrato', e.target.value)}
            required
          >
            <option value="">Seleccionar…</option>
            {[1, 2, 3, 4, 5, 6].map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={!!form.acceso_internet}
            onChange={(e) => update('acceso_internet', e.target.checked)}
          />
          <span>Tengo internet en casa</span>
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={!!form.acceso_pc}
            onChange={(e) => update('acceso_pc', e.target.checked)}
          />
          <span>Tengo computador/laptop propio</span>
        </label>
        <label className="form-field checkbox-field">
          <input
            type="checkbox"
            checked={!!form.trabaja}
            onChange={(e) => update('trabaja', e.target.checked)}
          />
          <span>Estudio y trabajo</span>
        </label>
      </div>

      <h3 className="form-group-title">Datos demograficos</h3>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Genero</span>
          <select
            className="auth-input auth-select"
            value={form.genero}
            onChange={(e) => update('genero', e.target.value)}
          >
            <option value="">Prefiero no decir</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </label>
        <label className="form-field">
          <span>Edad</span>
          <input
            className="auth-input"
            type="number"
            min="14"
            max="80"
            value={form.edad}
            onChange={(e) => update('edad', e.target.value)}
          />
        </label>
        <label className="form-field" style={{ gridColumn: '1 / -1' }}>
          <span>Ciudad de residencia</span>
          <input
            className="auth-input"
            type="text"
            maxLength="60"
            value={form.ciudad}
            onChange={(e) => update('ciudad', e.target.value)}
          />
        </label>
      </div>

      <h3 className="form-group-title">Habitos de estudio</h3>
      <div className="form-grid-2">
        <label className="form-field">
          <span>Horas de estudio por semana</span>
          <input
            className="auth-input"
            type="number"
            min="0"
            max="80"
            value={form.horas_estudio_semana}
            onChange={(e) => update('horas_estudio_semana', e.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Nivel de ingles</span>
          <select
            className="auth-input auth-select"
            value={form.nivel_ingles}
            onChange={(e) => update('nivel_ingles', e.target.value)}
          >
            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lv) => (
              <option key={lv} value={lv}>{lv}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Simulacros Saber Pro realizados</span>
          <input
            className="auth-input"
            type="number"
            min="0"
            max="50"
            value={form.simulacros_realizados}
            onChange={(e) => update('simulacros_realizados', e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Asistencia a clases (%)</span>
          <input
            className="auth-input"
            type="number"
            min="0"
            max="100"
            value={form.asistencia_pct}
            onChange={(e) => update('asistencia_pct', e.target.value)}
          />
        </label>
      </div>

      {error ? <p className="auth-feedback error">{error}</p> : null}

      <div className="form-actions">
        {onCancel ? (
          <button
            type="button"
            className="auth-button auth-button-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar
          </button>
        ) : null}
        <button className="auth-button" type="submit" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar y calcular prediccion'}
        </button>
      </div>
    </form>
  )
}

function StudentOnboarding({ onComplete, initial }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(payload) {
    setBusy(true)
    setError(null)
    try {
      const result = await apiSaveStudentProfile(payload)
      if (!result.ok) {
        setError(result.message || 'No se pudo guardar el perfil.')
        return
      }
      onComplete(result.profile, result.prediction)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="onboarding-wrap card">
      <div className="onboarding-header">
        <p className="banner-kicker">Bienvenido</p>
        <h1>Cuentanos sobre ti para generar tu prediccion</h1>
        <p className="banner-text">
          Estos datos alimentan el modelo predictivo del Saber Pro. Con tu informacion
          academica, socioeconomica, demografica y tus habitos de estudio podremos
          estimar tu nivel de desempeno (bajo, medio o alto) y entregarte
          recomendaciones personalizadas. Puedes actualizarlos cuando quieras.
        </p>
      </div>
      <StudentProfileForm
        initialValues={profileToForm(initial)}
        onSubmit={handleSubmit}
        busy={busy}
        error={error}
      />
    </section>
  )
}

function StudentView({ user, onLogout, onUserUpdated }) {
  const studentSections = ROLE_CONFIG.estudiante.nav
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [state, setState] = useState({
    status: 'loading', // 'loading' | 'onboarding' | 'ready'
    profile: null,
    prediction: null,
    predictions: [],
  })

  useEffect(() => {
    let alive = true
    Promise.all([apiGetStudentProfile(), apiGetStudentPredictions()]).then(
      ([profileRes, predRes]) => {
        if (!alive) return
        const profile = profileRes.ok ? profileRes.profile : null
        const prediction = profileRes.ok ? profileRes.prediction : null
        const predictions = predRes.ok ? predRes.predictions || [] : []
        setState({
          status: profile?.completed ? 'ready' : 'onboarding',
          profile,
          prediction,
          predictions,
        })
      },
    )
    return () => {
      alive = false
    }
  }, [])

  function handleCompleteOnboarding(profile, prediction) {
    setState({
      status: 'ready',
      profile,
      prediction,
      predictions: [prediction, ...(state.predictions || [])],
    })
  }

  if (state.status === 'loading') {
    return (
      <DashboardShell user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} searchPlaceholder="">
        <section className="card empty-state">
          <p>Cargando tu informacion…</p>
        </section>
      </DashboardShell>
    )
  }

  if (state.status === 'onboarding') {
    return (
      <DashboardShell
        user={user}
        onLogout={onLogout}
        onUserUpdated={onUserUpdated}
        searchPlaceholder=""
        customNav={['Completa tu perfil']}
      >
        <StudentOnboarding
          onComplete={handleCompleteOnboarding}
          initial={state.profile}
        />
      </DashboardShell>
    )
  }

  // Estudiante con perfil institucional completo pero SIN historial academico
  // todavia (lo normal en primer semestre): el modelo no emite prediccion
  // porque no tiene nada que evaluar. Se explica en vez de mostrar una clase
  // inventada.
  if (state.status === 'ready' && !state.prediction) {
    return (
      <DashboardShell
        user={user}
        onLogout={onLogout}
        onUserUpdated={onUserUpdated}
        searchPlaceholder=""
        customNav={['Tu prediccion']}
      >
        <section className="card empty-state">
          <h2>Aun no hay datos suficientes para predecir</h2>
          <p className="student-interpretation">
            Tu informacion institucional esta completa, pero todavia no tienes historial
            academico registrado (lo normal si estas en tu primer semestre). Sin
            promedios el modelo no puede estimar tu desempeno en Saber Pro: te
            mostraria un resultado inventado en lugar de una prediccion.
          </p>
          <p className="student-interpretation">
            En cuanto se registre tu primer promedio, tu prediccion aparecera aqui
            automaticamente. Si ya cursaste materias y sigue asi, contacta al
            administrador de tu programa para actualizar tu informacion.
          </p>
        </section>
      </DashboardShell>
    )
  }

  const profile = state.profile
  const prediction = state.prediction
  const predictions = state.predictions
  const activeSectionLabel = studentSections[activeSectionIndex] || studentSections[0]
  const isSummarySection = activeSectionIndex === 0
  const isPredictionSection = activeSectionIndex === 1
  const isRecommendationSection = activeSectionIndex === 2

  const riskLevel = prediction ? riskFromClase(prediction.clase) : 'medio'
  const riskLabel = prediction
    ? RISK_LABEL_FROM_CLASE[prediction.clase] || 'Riesgo medio'
    : 'Sin clasificacion'

  const progress = predictions
    .slice(0, 5)
    .reverse()
    .map((p, i) => ({
      label: `T${i + 1}`,
      score: p.puntajeEstimado,
    }))

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      searchPlaceholder=""
      activeNavIndex={activeSectionIndex}
      onNavSelect={setActiveSectionIndex}
    >
      <section className="card student-section-state">
        <div>
          <p className="banner-kicker">Seccion activa</p>
          <h2>{activeSectionLabel}</h2>
          <p className="student-interpretation">
            Tus datos provienen del roster institucional del programa y son la
            fuente de verdad para tu prediccion. Si necesitas corregirlos,
            contacta al administrador de tu programa.
          </p>
        </div>
      </section>

      {isSummarySection ? (
        <>
          <section className="welcome-banner card student-banner">
            <div>
              <p className="banner-kicker">Vista del estudiante</p>
              <h1>Hola, {user.username.split(' ')[0]}</h1>
              <p className="banner-text">
                Tu desempeno proyectado en las pruebas Saber Pro y los factores
                que mas estan influyendo en el resultado.
              </p>
            </div>
            <div className="welcome-chip">
              <span>{getProgramLabel(profile?.semestre ? user.program : user.program)}</span>
              <span>Semestre {profile?.semestre ?? '—'}</span>
            </div>
          </section>

          <section className="grid-2 content-grid-dashboard student-layout">
            <article className="card">
              <div className="section-header">
                <h2>Mi resultado proyectado</h2>
                <span className={`risk-pill ${riskLevel}`}>{riskLabel}</span>
              </div>
              <div className="student-score-box">
                <div className="student-score-value">
                  {prediction?.puntajeEstimado ?? '—'}
                </div>
                <div className="student-score-meta">
                  Puntaje estimado en el Saber Pro (escala 0-300)
                  {prediction?.puntajeMinimo != null &&
                  prediction?.puntajeMaximo != null ? (
                    <>
                      {' '}
                      · rango probable{' '}
                      <strong>
                        {prediction.puntajeMinimo} - {prediction.puntajeMaximo}
                      </strong>
                    </>
                  ) : null}
                </div>
                <div className="student-score-meta">
                  Banda <strong>{prediction?.clase ?? '—'}</strong> · probabilidad{' '}
                  {prediction
                    ? `${Math.round((prediction.probabilidad || 0) * 100)}%`
                    : '—'}
                </div>
              </div>
              <div className="student-data-list">
                <div className="student-data-row">
                  <span>Promedio acumulado</span>
                  <strong>{profile?.promedio_acumulado?.toFixed(2) ?? '—'}</strong>
                </div>
                <div className="student-data-row">
                  <span>Horas de estudio/semana</span>
                  <strong>{profile?.horas_estudio_semana ?? '—'}</strong>
                </div>
                <div className="student-data-row">
                  <span>Asistencia</span>
                  <strong>
                    {profile?.asistencia_pct
                      ? `${profile.asistencia_pct}%`
                      : '—'}
                  </strong>
                </div>
                <div className="student-data-row">
                  <span>Nivel de ingles</span>
                  <strong>{profile?.nivel_ingles ?? '—'}</strong>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="section-header compact">
                <h2>Factores con mayor impacto</h2>
              </div>
              <div className="student-data-list">
                {(prediction?.factores || []).map((f) => (
                  <div className="student-data-row" key={f.label}>
                    <span>{f.label}</span>
                    <strong>
                      {f.value}
                      <em
                        className={`risk-pill ${
                          f.impact === 'Positivo'
                            ? 'bajo'
                            : f.impact === 'A mejorar'
                              ? 'alto'
                              : 'medio'
                        }`}
                        style={{ marginLeft: 8 }}
                      >
                        {f.impact}
                      </em>
                    </strong>
                  </div>
                ))}
                {!prediction ? (
                  <p className="student-interpretation">
                    Aun no tenemos prediccion. Contacta al administrador de tu
                    programa para verificar que estes en el roster institucional.
                  </p>
                ) : null}
              </div>
            </article>
          </section>

          <StudentRiskVisualCard riskLevel={riskLevel} />
        </>
      ) : null}

      {isPredictionSection ? (
        <>
          <section className="welcome-banner card student-banner">
            <div>
              <p className="banner-kicker">Mi prediccion</p>
              <h1>
                Puntaje estimado {prediction?.puntajeEstimado ?? '—'} sobre 300 · banda{' '}
                {prediction?.clase ?? '—'}
              </h1>
              <p className="banner-text">
                Desglose por areas del modelo, comparacion con la cohorte y
                evolucion de tus calculos previos.
              </p>
            </div>
          </section>
          <section className="student-block-grid">
            <StudentPerformanceAreasCard areas={prediction?.areas || []} />
            <StudentComparisonCard
              studentScore={prediction?.puntajeEstimado ?? 0}
              comparison={{
                groupLabel: 'Promedio de tu cohorte',
                groupAverage:
                  predictions.length > 1
                    ? Math.round(
                        predictions.reduce((sum, p) => sum + (p.puntajeEstimado || 0), 0) /
                          predictions.length,
                      )
                    : prediction?.puntajeEstimado ?? 0,
              }}
            />
            <StudentProgressCard
              progress={
                progress.length
                  ? progress
                  : [
                      { label: 'T1', score: prediction?.puntajeEstimado ?? 0 },
                    ]
              }
            />
            <StudentRiskVisualCard riskLevel={riskLevel} />
          </section>
        </>
      ) : null}

      {isRecommendationSection ? (
        <>
          <section className="student-block-grid">
            <StudentRecommendationsCard
              recommendations={
                prediction?.recomendaciones || { improve: [], actions: [] }
              }
            />
            <article className="card student-block">
              <div className="section-header compact">
                <h2>Interpretacion automatica</h2>
              </div>
              <p className="student-interpretation">
                {prediction
                  ? `Tu puntaje estimado en el Saber Pro es de ${prediction.puntajeEstimado} sobre 300${
                      prediction.puntajeMinimo != null &&
                      prediction.puntajeMaximo != null
                        ? `, con un rango probable de ${prediction.puntajeMinimo} a ${prediction.puntajeMaximo} puntos`
                        : ''
                    }. Eso lo ubica en la banda ${prediction.clase}, con una probabilidad del ${Math.round(
                      (prediction.probabilidad || 0) * 100,
                    )}% de caer en ella. El margen es amplio: el resultado real depende tambien de factores que no aparecen en tu historial academico, como la preparacion especifica para la prueba.`
                  : 'Aun no hay prediccion. Llena tu perfil para generar el analisis.'}
              </p>
              <div className="student-data-list">
                <div className="student-data-row">
                  <span>Materias reprobadas</span>
                  <strong>{profile?.num_reprobadas ?? '—'}</strong>
                </div>
                <div className="student-data-row">
                  <span>Avance en creditos</span>
                  <strong>
                    {profile?.pct_creditos ? `${profile.pct_creditos}%` : '—'}
                  </strong>
                </div>
                <div className="student-data-row">
                  <span>Simulacros realizados</span>
                  <strong>{profile?.simulacros_realizados ?? '—'}</strong>
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}
    </DashboardShell>
  )
}

// =====================================================================
// ADMIN VIEW (solo rol 'administrador')
// =====================================================================

const ADMIN_ROLE_OPTIONS = [
  { value: 'rector', label: 'Rector' },
  { value: 'decano', label: 'Decano' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'estudiante', label: 'Estudiante' },
]

const ADMIN_PROGRAM_OPTIONS = [
  { value: 'sistemas', label: 'Sistemas' },
  { value: 'all', label: 'Todas (all)' },
]

const ADMIN_ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  ...ADMIN_ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
]

const ADMIN_PROGRAM_FILTER_OPTIONS = [
  { value: '', label: 'Todos los programas' },
  ...ADMIN_PROGRAM_OPTIONS,
]

function adminRoleLabel(role) {
  return ADMIN_ROLE_OPTIONS.find((o) => o.value === role)?.label || role
}

function adminProgramLabel(program) {
  if (program === 'all') return 'Todas'
  return ADMIN_PROGRAM_OPTIONS.find((o) => o.value === program)?.label || program
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return String(value)
  }
}

// Captura errores de render en la UI para que un bug del JSX no deje la
// pantalla en blanco (muestra el error + la traza en pantalla).
class AdminComparativoErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[AdminComparativoSection]', error, info)
  }
  render() {
    if (this.state.error) {
      const err = this.state.error
      return (
        <section className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ margin: 0, color: 'var(--danger)' }}>Error al cargar Comparativo</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-soft)' }}>
            {String(err?.message || err)}
          </p>
          <pre style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            maxHeight: '300px',
          }}>
            {String(err?.stack || '')}
          </pre>
          <button
            type="button"
            className="auth-button-sm"
            style={{ marginTop: '0.75rem' }}
            onClick={() => this.setState({ error: null })}
          >
            Reintentar
          </button>
        </section>
      )
    }
    return this.props.children
  }
}

// ErrorBoundary reutilizable para cualquier panel admin.
// Captura errores de render y los muestra en pantalla en lugar de dejar
// la pagina en blanco. Acepta `section` como prop para personalizar el titulo.
class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error(`[${this.props.section || 'AdminPanel'}]`, error, info)
  }
  render() {
    if (this.state.error) {
      const err = this.state.error
      return (
        <section className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ margin: 0, color: 'var(--danger)' }}>
            Error al cargar {this.props.section || 'el panel'}
          </h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-soft)' }}>
            {String(err?.message || err)}
          </p>
          <pre style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            background: 'var(--surface-3)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            maxHeight: '300px',
          }}>
            {String(err?.stack || '')}
          </pre>
          <button
            type="button"
            className="auth-button-sm"
            style={{ marginTop: '0.75rem' }}
            onClick={() => this.setState({ error: null })}
          >
            Reintentar
          </button>
        </section>
      )
    }
    return this.props.children
  }
}

// Genera un analisis ejecutivo en lenguaje natural a partir de las metricas
// agregadas. Produce 2-3 frases segun los datos disponibles.
function generateExecutiveAnalysis(metrics) {
  if (!metrics || metrics.totalEstudiantes === 0) {
    return 'Aun no hay estudiantes registrados en la cohorte.'
  }
  const total = metrics.totalEstudiantes
  const conPerfil = metrics.conPerfil
  const conPrediccion = metrics.conPrediccion
  const sinPerfil = metrics.sinPerfil
  const dist = metrics.distribucion || {}
  // `distribucion` es el DESEMPENO proyectado (clase del modelo). El RIESGO es
  // su inversa: riesgo alto = clase baja (el estudiante que necesita
  // intervencion). El backend ya entrega los dos cubos separados en
  // `metrics.riesgo`; usarlos evita que el panel llame "riesgo alto" a los
  // mejores estudiantes de la cohorte.
  const riesgo = metrics.riesgo || {
    alto: dist.bajo || 0,
    medio: dist.medio || 0,
    bajo: dist.alto || 0,
  }
  const alto = riesgo.alto || 0
  const medio = riesgo.medio || 0
  const bajo = riesgo.bajo || 0
  const sinDatos = metrics.sinDatosSuficientes || 0
  const pct = (metrics.porcentajes || {})
  const sentences = []

  // Cohorte general
  sentences.push(
    `La cohorte de Sistemas cuenta con ${total} estudiante${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'}.`,
  )

  // Cobertura del perfil
  if (conPerfil === total) {
    sentences.push(
      'La cobertura del perfil institucional es del 100%, lo que permite hacer seguimiento personalizado a cada estudiante.',
    )
  } else if (sinPerfil > 0) {
    sentences.push(
      `${conPerfil} estudiantes (${pct.coberturaPerfil ?? 0}%) completaron el perfil institucional; quedan ${sinPerfil} pendientes de onboarding.`,
    )
  }

  // Cobertura de prediccion
  if (conPrediccion === 0 && metrics.conPerfil > 0) {
    sentences.push(
      'Ningun estudiante tiene prediccion del modelo todavia; puedes generarlas desde el panel de Analisis con "Recomputar predicciones".',
    )
  } else if (conPrediccion > 0 && conPrediccion < conPerfil) {
    const faltan = conPerfil - conPrediccion
    sentences.push(
      `${conPrediccion} estudiantes (${pct.coberturaPrediccion ?? 0}% del total, ${Math.round((conPrediccion / Math.max(conPerfil, 1)) * 100)}% de los que tienen perfil) cuentan con prediccion del modelo.`,
    )
    if (sinDatos > 0) {
      sentences.push(
        `Los ${sinDatos} estudiantes restantes (${Math.round((sinDatos / Math.max(total, 1)) * 100)}% de la cohorte) todavia no tienen historial academico: son estudiantes de primer semestre que aun no han acumulado notas, asi que el modelo no emite prediccion para ellos hasta que tengan un promedio registrado.`,
      )
    } else if (faltan > 0) {
      sentences.push(`Faltan ${faltan} por procesar.`)
    }
  } else if (conPrediccion === conPerfil && conPerfil > 0) {
    sentences.push(
      'Todos los estudiantes con perfil cuentan con una prediccion del modelo actualizada.',
    )
  }

  // Distribucion de riesgo
  if (alto + medio + bajo > 0) {
    const predCount = alto + medio + bajo
    sentences.push(
      `Sobre ${predCount} estudiantes evaluados, ${alto} estan en riesgo alto (${pct.riesgoAltoPct ?? 0}% del total), ${medio} en riesgo medio (${pct.riesgoMedioPct ?? 0}%) y ${bajo} en riesgo bajo (${pct.riesgoBajoPct ?? 0}%).`,
    )
    if (alto > 0) {
      sentences.push(
        `Prioriza intervencion con los ${alto} estudiante${alto === 1 ? '' : 's'} en riesgo alto para reducir el riesgo de desercion antes del examen Saber Pro.`,
      )
    } else {
      sentences.push(
        `No se identificaron estudiantes en riesgo alto: la cohorte esta en una posicion saludable de cara a Saber Pro.`,
      )
    }
  }

  // Promedio de puntaje
  if (metrics.promedioPuntaje !== null && metrics.promedioPuntaje !== undefined) {
    const nivel =
      metrics.promedioPuntaje >= 250 ? 'competitivo' :
      metrics.promedioPuntaje >= 200 ? 'moderado' : 'bajo'
    sentences.push(
      `El promedio estimado de puntaje Saber Pro es de ${metrics.promedioPuntaje} puntos, lo que sugiere un desempeno ${nivel} frente a la media nacional.`,
    )
  }

  return sentences.join(' ')
}

function AdminComparativoSection() {
  const [sis, setSis] = useState({ status: 'loading', metrics: null, students: [], error: null })

  useEffect(() => {
    let alive = true
    apiGetCohort('sistemas')
      .then((sisRes) => {
        if (!alive) return
        setSis({
          status: sisRes.ok ? 'ready' : 'error',
          metrics: sisRes.metrics || null,
          students: sisRes.students || [],
          error: sisRes.ok ? null : sisRes.message || 'Error',
        })
      })
      .catch((err) => {
        if (!alive) return
        setSis({ status: 'error', metrics: null, students: [], error: err.message || 'Error de red' })
      })
    return () => {
      alive = false
    }
  }, [])

  const metrics = sis.metrics
  const dist = metrics?.distribucion || { alto: 0, medio: 0, bajo: 0 }
  // Riesgo = inversa del desempeno. `distribucion` son las clases que predice
  // el modelo; `riesgo` es el cubo de riesgo (alto = clase baja).
  const rsk = metrics?.riesgo || {
    alto: dist.bajo || 0,
    medio: dist.medio || 0,
    bajo: dist.alto || 0,
  }
  const total = metrics?.totalEstudiantes || 0
  // Denominador de la barra: solo los estudiantes con prediccion. Los que
  // aun no tienen historial academico no se evaluan y no deben aparecer como
  // "riesgo bajo" (serian una bolsa de riesgo ficticia).
  const evaluados = rsk.alto + rsk.medio + rsk.bajo
  const topRisk = (sis.students || [])
    .filter((s) => s.clase)
    .slice()
    .sort((a, b) => (a.puntajeEstimado ?? 9999) - (b.puntajeEstimado ?? 9999))
    .slice(0, 5)

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Comparativo institucional</p>
          <h2>Cohorte de Sistemas</h2>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-soft)', fontSize: '0.92rem', maxWidth: 620 }}>
            Indicadores agregados del programa academico, calculados en vivo desde la base de datos
            institucional y las predicciones generadas por el modelo <code>real-data-v1</code>.
          </p>
        </div>
      </div>

      {sis.status === 'loading' ? (
        <p className="student-interpretation">Cargando cohorte...</p>
      ) : null}
      {sis.status === 'error' ? (
        <p className="auth-feedback error">No se pudo cargar la cohorte: {sis.error}</p>
      ) : null}

      {sis.status === 'ready' && metrics ? (
        <>
          {/* ---- 1) Cards KPI principales ---- */}
          <section className="grid-4 comparativo-kpis">
            <article className="kpi-card indigo">
              <div className="kpi-icon"><Icon name="users" size={22} /></div>
              <p className="kpi-value">{total}</p>
              <p className="kpi-label">Total estudiantes</p>
              <p className="kpi-detail">Registrados en la cohorte</p>
            </article>
            <article className="kpi-card cyan">
              <div className="kpi-icon"><Icon name="check" size={22} /></div>
              <p className="kpi-value">{metrics.conPerfil}</p>
              <p className="kpi-label">Con perfil completo</p>
              <p className="kpi-detail">
                {(metrics.porcentajes?.coberturaPerfil ?? 0).toFixed(1)}% del total
              </p>
            </article>
            <article className="kpi-card violet">
              <div className="kpi-icon"><Icon name="target" size={22} /></div>
              <p className="kpi-value">{metrics.conPrediccion}</p>
              <p className="kpi-label">Con prediccion del modelo</p>
              <p className="kpi-detail">
                {(metrics.porcentajes?.coberturaPrediccion ?? 0).toFixed(1)}% del total
              </p>
            </article>
            <article className="kpi-card rose">
              <div className="kpi-icon"><Icon name="warning" size={22} /></div>
              <p className="kpi-value">{rsk.alto}</p>
              <p className="kpi-label">En riesgo alto</p>
              <p className="kpi-detail">
                {(metrics.porcentajes?.riesgoAltoPct ?? 0).toFixed(1)}% del total
              </p>
            </article>
            <article className="kpi-card amber">
              <div className="kpi-icon"><Icon name="info" size={22} /></div>
              <p className="kpi-value">{metrics.sinDatosSuficientes || 0}</p>
              <p className="kpi-label">Sin datos suficientes</p>
              <p className="kpi-detail">Sin historial academico</p>
            </article>
          </section>

          {/* ---- 2) Distribucion de riesgo ---- */}
          <article className="card">
            <div className="section-header">
              <h2>Distribucion de riesgo</h2>
              <span className="live-chip">{rsk.alto + rsk.medio + rsk.bajo} evaluados</span>
            </div>

            {rsk.alto + rsk.medio + rsk.bajo === 0 ? (
              <div className="data-table-empty">
                <p>Aun no hay predicciones para esta cohorte.</p>
                <p className="student-interpretation" style={{ marginTop: '0.5rem' }}>
                  Las predicciones se generan automaticamente al completar el perfil institucional,
                  o puedes dispararlas manualmente desde el panel de Analisis del modelo.
                </p>
              </div>
            ) : (
              <>
                <div className="risk-distribution-bar" aria-label="Distribucion de riesgo">
                  <div
                    className="risk-segment bajo"
                    style={{ width: `${((rsk.bajo || 0) / Math.max(evaluados, 1)) * 100}%` }}
                  >
                    {(rsk.bajo || 0) > 0 ? (
                      <span className="risk-segment-label">
                        {((rsk.bajo || 0) / Math.max(evaluados, 1) * 100).toFixed(0)}%
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="risk-segment medio"
                    style={{ width: `${((rsk.medio || 0) / Math.max(evaluados, 1)) * 100}%` }}
                  >
                    {(rsk.medio || 0) > 0 ? (
                      <span className="risk-segment-label">
                        {((rsk.medio || 0) / Math.max(evaluados, 1) * 100).toFixed(0)}%
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="risk-segment alto"
                    style={{ width: `${((rsk.alto || 0) / Math.max(evaluados, 1)) * 100}%` }}
                  >
                    {(rsk.alto || 0) > 0 ? (
                      <span className="risk-segment-label">
                        {((rsk.alto || 0) / Math.max(evaluados, 1) * 100).toFixed(0)}%
                      </span>
                    ) : null}
                  </div>
                </div>

                <ul className="risk-distribution-legend">
                  <li>
                    <span className="risk-dot bajo" aria-hidden="true" />
                    <span className="risk-legend-label">Riesgo bajo</span>
                    <span className="risk-legend-value">
                      <strong>{rsk.bajo || 0}</strong>
                      <span className="risk-legend-pct">
                        {(metrics.porcentajes?.riesgoBajoPct ?? 0).toFixed(1)}%
                      </span>
                    </span>
                  </li>
                  <li>
                    <span className="risk-dot medio" aria-hidden="true" />
                    <span className="risk-legend-label">Riesgo medio</span>
                    <span className="risk-legend-value">
                      <strong>{rsk.medio || 0}</strong>
                      <span className="risk-legend-pct">
                        {(metrics.porcentajes?.riesgoMedioPct ?? 0).toFixed(1)}%
                      </span>
                    </span>
                  </li>
                  <li>
                    <span className="risk-dot alto" aria-hidden="true" />
                    <span className="risk-legend-label">Riesgo alto</span>
                    <span className="risk-legend-value">
                      <strong>{rsk.alto || 0}</strong>
                      <span className="risk-legend-pct">
                        {(metrics.porcentajes?.riesgoAltoPct ?? 0).toFixed(1)}%
                      </span>
                    </span>
                  </li>
                </ul>
              </>
            )}
          </article>

          {/* ---- 3) Analisis ejecutivo ---- */}
          <article className="card comparativo-analysis-card">
            <div className="section-header compact">
              <h2>
                <Icon name="chart" size={18} />
                <span style={{ marginLeft: '0.5rem' }}>Analisis ejecutivo</span>
              </h2>
            </div>
            <p className="comparativo-analysis-text">
              {generateExecutiveAnalysis(metrics)}
            </p>
          </article>

          {/* ---- 4) Tabla de metricas detalladas ---- */}
          <article className="card">
            <div className="section-header compact">
              <h2>Metricas detalladas</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th style={{ width: '15%' }} className="num">Valor</th>
                  <th style={{ width: '15%' }} className="num">Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total de estudiantes</td>
                  <td className="table-code">{total}</td>
                  <td className="table-code">100.0%</td>
                </tr>
                <tr>
                  <td>Con perfil institucional</td>
                  <td className="table-code">{metrics.conPerfil}</td>
                  <td className="table-code">
                    {(metrics.porcentajes?.coberturaPerfil ?? 0).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td>Sin perfil</td>
                  <td className="table-code">{metrics.sinPerfil}</td>
                  <td className="table-code">
                    {total > 0 ? ((metrics.sinPerfil / total) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
                <tr>
                  <td>Con prediccion del modelo</td>
                  <td className="table-code">{metrics.conPrediccion}</td>
                  <td className="table-code">
                    {(metrics.porcentajes?.coberturaPrediccion ?? 0).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td>Sin datos suficientes (1er semestre)</td>
                  <td className="table-code">{metrics.sinDatosSuficientes || 0}</td>
                  <td className="table-code">
                    {total > 0 ? (((metrics.sinDatosSuficientes || 0) / total) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="risk-dot bajo" aria-hidden="true" /> Riesgo bajo
                  </td>
                  <td className="table-code">{rsk.bajo || 0}</td>
                  <td className="table-code">
                    {(metrics.porcentajes?.riesgoBajoPct ?? 0).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="risk-dot medio" aria-hidden="true" /> Riesgo medio
                  </td>
                  <td className="table-code">{rsk.medio || 0}</td>
                  <td className="table-code">
                    {(metrics.porcentajes?.riesgoMedioPct ?? 0).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="risk-dot alto" aria-hidden="true" /> Riesgo alto
                  </td>
                  <td className="table-code">{rsk.alto || 0}</td>
                  <td className="table-code">
                    {(metrics.porcentajes?.riesgoAltoPct ?? 0).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td>Promedio estimado de puntaje Saber Pro</td>
                  <td className="table-code">
                    {metrics.promedioPuntaje !== null && metrics.promedioPuntaje !== undefined
                      ? `${metrics.promedioPuntaje} pts`
                      : '—'}
                  </td>
                  <td className="table-code">—</td>
                </tr>
              </tbody>
            </table>
          </article>

          {/* ---- 5) Top estudiantes en riesgo ---- */}
          <article className="card">
            <div className="section-header">
              <h2>Top estudiantes en riesgo</h2>
              <span className="live-chip">5 con peor prediccion</span>
            </div>
            {topRisk.length === 0 ? (
              <div className="data-table-empty">
                <p>Aun no hay estudiantes con prediccion para mostrar el ranking de riesgo.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Puntaje estimado</th>
                    <th>Probabilidad</th>
                    <th>Clase</th>
                  </tr>
                </thead>
                <tbody>
                  {topRisk.map((s) => (
                    <tr key={s.id} className={s.clase === 'alto' ? 'pending' : ''}>
                      <td className="table-code">{s.documento}</td>
                      <td>{s.username || '—'}</td>
                      <td className="table-code">
                        {s.puntajeEstimado !== null && s.puntajeEstimado !== undefined
                          ? `${Math.round(s.puntajeEstimado)} pts`
                          : '—'}
                      </td>
                      <td className="table-code">
                        {s.probabilidad !== null && s.probabilidad !== undefined
                          ? `${Math.round(s.probabilidad * 100)}%`
                          : '—'}
                      </td>
                      <td>
                        <ClasePill clase={s.clase} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>
        </>
      ) : null}
    </section>
  )
}

// Renderiza una mini-barra horizontal usada en distribuciones demograficas.
// `pct` es 0-100, `color` es una clase CSS (info, success, warning, etc).
function MiniBar({ pct, color = 'info' }) {
  const safe = Math.max(0, Math.min(100, Number(pct) || 0))
  return (
    <div className="mini-bar-track" aria-label={`${safe.toFixed(1)}%`}>
      <div className={`mini-bar-fill mini-bar-${color}`} style={{ width: `${safe}%` }} />
    </div>
  )
}

// Mapa de colores por categoria (info/success/warning) para las mini-barras.
const COLOR_BY_KEY = {
  // Nivel de ingles: del mas bajo al mas alto
  'A1': 'danger',
  'A2': 'warning',
  'A2+': 'warning',
  'B1': 'info',
  'B1+': 'info',
  'B2': 'cyan',
  'C1': 'success',
  'C2': 'success',
  // Genero
  'M': 'info',
  'F': 'rose',
  // Estrato (1-6)
  '1': 'danger',
  '2': 'warning',
  '3': 'info',
  '4': 'info',
  '5': 'cyan',
  '6': 'success',
  // Trabaja
  'true': 'warning',
  'false': 'success',
}

function AdminReportesSection() {
  const [summaryStatus, setSummaryStatus] = useState('loading')
  const [cohortStatus, setCohortStatus] = useState('loading')
  const [summary, setSummary] = useState(null)
  const [students, setStudents] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([apiGetCohort('all'), apiGetAdminReportSummary('all')])
      .then(([cohort, sum]) => {
        if (!alive) return
        if (cohort.ok) {
          setStudents(cohort.students || [])
          setCohortStatus('ready')
        } else {
          setError(cohort.message || 'Error cargando cohorte.')
          setCohortStatus('error')
        }
        if (sum.ok) {
          setSummary(sum)
          setSummaryStatus('ready')
        } else {
          setError(sum.message || 'Error generando el resumen.')
          setSummaryStatus('error')
        }
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message || 'Error de red.')
        setSummaryStatus('error')
        setCohortStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  function exportCsv() {
    // 30+ columnas academicas + contacto + estado del modelo.
    const headers = [
      'documento',
      'nombre',
      'email',
      'programa',
      'activo',
      'completado',
      'semestre',
      'estrato',
      'edad',
      'genero',
      'ciudad',
      'trabaja',
      'acceso_internet',
      'acceso_pc',
      'horas_estudio_semana',
      'nivel_ingles',
      'simulacros_realizados',
      'asistencia_pct',
      'promedio_acumulado',
      'promedio_basicas',
      'promedio_ingenieria',
      'promedio_programacion',
      'promedio_matematica_estadistica',
      'num_reprobadas',
      'pct_creditos',
      'creditos_aprobados',
      'asignaturas_aprobadas',
      'clase_predicha',
      'puntaje_estimado',
      'probabilidad',
      'fecha_prediccion',
    ]
    const rows = students.map((s) => [
      s.documento || '',
      s.username || '',
      s.email || '',
      s.program || '',
      s.isActive === false ? 'no' : 'si',
      s.completed ? 'si' : 'no',
      s.semestre ?? '',
      s.estrato ?? '',
      s.edad ?? '',
      s.genero || '',
      s.ciudad || '',
      s.trabaja === true ? 'si' : s.trabaja === false ? 'no' : '',
      s.accesoInternet === true ? 'si' : s.accesoInternet === false ? 'no' : '',
      s.accesoPc === true ? 'si' : s.accesoPc === false ? 'no' : '',
      s.horasEstudio ?? '',
      s.nivelIngles || '',
      s.simulacrosRealizados ?? '',
      s.asistencia ?? '',
      s.promedioAcumulado ?? '',
      s.promedioBasicas ?? '',
      s.promedioIngenieria ?? '',
      s.promedioProgramacion ?? '',
      s.promedioMatEstadistica ?? '',
      s.numReprobadas ?? '',
      s.pctCreditos ?? '',
      s.creditosAprobados ?? '',
      s.asignaturasAprobadas ?? '',
      s.clase || '',
      s.puntajeEstimado ?? '',
      s.probabilidad ?? '',
      s.predictionAt || '',
    ])
    const escape = (v) => {
      const str = String(v ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_saberpro_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Computos derivados (segun datos disponibles).
  const total = summary?.total ?? students.length
  const totalActivos = students.filter((s) => s.isActive !== false).length
  const totalConPerfil = students.filter((s) => s.completed === true).length
  const totalConPrediccion = students.filter((s) => s.puntajeEstimado !== null && s.puntajeEstimado !== undefined).length
  const totalRiesgoAlto = students.filter((s) => s.clase === 'alto').length
  const promedios = summary?.promedios || {}

  // Distribucion de puntaje la recalculamos en frontend para tener widths exactos.
  // Los datos ya vienen del backend en summary.histogramaPuntaje.
  const histograma = summary?.histogramaPuntaje || []
  const maxHistCount = histograma.reduce((m, h) => Math.max(m, h.count), 0)
  const totalInHist = histograma.reduce((a, h) => a + h.count, 0) || 1

  // Distribuciones principales (accedemos con fallback seguro)
  const distIngles = (summary?.distribuciones?.nivelIngles) || []
  const distGenero = (summary?.distribuciones?.genero) || []
  const distEstrato = (summary?.distribuciones?.estrato) || []
  const distTrabaja = (summary?.distribuciones?.trabaja) || []
  const distSemestre = (summary?.distribuciones?.semestre) || []
  const distHoras = (summary?.distribuciones?.horasEstudio) || []
  const distCiudades = (summary?.distribuciones?.ciudadesTop) || []

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Reportes</p>
          <h2>Cohorte y desempeno institucional</h2>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-soft)', fontSize: '0.92rem', maxWidth: 720 }}>
            Distribuciones academicas y demograficas de los estudiantes, calculadas en vivo
            contra la base de datos institucional y las predicciones del modelo
            <code> real-data-v1</code>.
          </p>
        </div>
        <div className="filter-group" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="auth-button"
            type="button"
            onClick={exportCsv}
            disabled={cohortStatus !== 'ready' || students.length === 0}
          >
            <Icon name="download" size={16} />
            Exportar CSV completo
          </button>
        </div>
      </div>

      {summaryStatus === 'loading' && cohortStatus === 'loading' ? (
        <p className="student-interpretation">Cargando reporte...</p>
      ) : null}
      {error ? <p className="auth-feedback error">{error}</p> : null}

      {summaryStatus === 'ready' ? (
        <>
          {/* ---- 1) KPI cards principales (8) ---- */}
          <section className="reportes-kpi-grid">
            <article className="kpi-card indigo">
              <div className="kpi-icon"><Icon name="users" size={22} /></div>
              <p className="kpi-value">{total}</p>
              <p className="kpi-label">Total estudiantes</p>
              <p className="kpi-detail">Registrados en la cohorte</p>
            </article>
            <article className="kpi-card cyan">
              <div className="kpi-icon"><Icon name="check" size={22} /></div>
              <p className="kpi-value">{totalActivos}</p>
              <p className="kpi-label">Cuentas activas</p>
              <p className="kpi-detail">Con acceso al sistema</p>
            </article>
            <article className="kpi-card lime">
              <div className="kpi-icon"><Icon name="user" size={22} /></div>
              <p className="kpi-value">{totalConPerfil}</p>
              <p className="kpi-label">Con perfil completo</p>
              <p className="kpi-detail">{pctValue(totalConPerfil, total)}% de la cohorte</p>
            </article>
            <article className="kpi-card violet">
              <div className="kpi-icon"><Icon name="target" size={22} /></div>
              <p className="kpi-value">{totalConPrediccion}</p>
              <p className="kpi-label">Con prediccion del modelo</p>
              <p className="kpi-detail">{pctValue(totalConPrediccion, total)}% de la cohorte</p>
            </article>
            <article className="kpi-card rose">
              <div className="kpi-icon"><Icon name="warning" size={22} /></div>
              <p className="kpi-value">{totalRiesgoAlto}</p>
              <p className="kpi-label">En riesgo alto</p>
              <p className="kpi-detail">{pctValue(totalRiesgoAlto, total)}% de la cohorte</p>
            </article>
            <article className="kpi-card amber">
              <div className="kpi-icon"><Icon name="trend" size={22} /></div>
              <p className="kpi-value">
                {promedios.promedioAcumulado !== null && promedios.promedioAcumulado !== undefined
                  ? promedios.promedioAcumulado.toFixed(1)
                  : '—'}
              </p>
              <p className="kpi-label">Promedio acumulado</p>
              <p className="kpi-detail">Calificacion institucional</p>
            </article>
            <article className="kpi-card emerald">
              <div className="kpi-icon"><Icon name="chart" size={22} /></div>
              <p className="kpi-value">
                {promedios.asistenciaPromedio !== null && promedios.asistenciaPromedio !== undefined
                  ? `${Math.round(promedios.asistenciaPromedio)}%`
                  : '—'}
              </p>
              <p className="kpi-label">Asistencia promedio</p>
              <p className="kpi-detail">Indice de presencia</p>
            </article>
            <article className="kpi-card cyan">
              <div className="kpi-icon"><Icon name="book" size={22} /></div>
              <p className="kpi-value">
                {promedios.horasEstudioPromedio !== null && promedios.horasEstudioPromedio !== undefined
                  ? `${Math.round(promedios.horasEstudioPromedio)} h`
                  : '—'}
              </p>
              <p className="kpi-label">Horas de estudio/sem</p>
              <p className="kpi-detail">Promedio cohorte</p>
            </article>
          </section>

          {/* ---- 2) Promedios academicos ---- */}
          <article className="card">
            <div className="section-header compact">
              <h2>Promedios academicos</h2>
            </div>
            <div className="reportes-metrics-grid">
              <MetricBox label="Promedio acumulado" value={promedios.promedioAcumulado} decimals={2} unit="/5.0" />
              <MetricBox label="Promedio matematicas basicas" value={promedios.promedioBasicas} decimals={2} unit="/5.0" />
              <MetricBox label="Promedio ingenieria" value={promedios.promedioIngenieria} decimals={2} unit="/5.0" />
              <MetricBox label="Promedio programacion" value={promedios.promedioProgramacion} decimals={2} unit="/5.0" />
              <MetricBox label="Promedio mate/estadistica" value={promedios.promedioMatEstadistica} decimals={2} unit="/5.0" />
              <MetricBox label="Asistencia promedio" value={promedios.asistenciaPromedio} decimals={0} unit="%" />
              <MetricBox label="Edad promedio" value={promedios.edadPromedio} decimals={0} unit=" anos" />
              <MetricBox label="Avance creditos" value={promedios.avanceCreditosPromedio} decimals={0} unit="%" />
              <MetricBox label="Total reprobadas" value={promedios.totalReprobadas} decimals={0} />
              <MetricBox label="Creditos aprobados (total)" value={promedios.totalCreditosAprobados} decimals={0} />
              <MetricBox label="Asignaturas aprobadas (total)" value={promedios.totalAsignaturasAprobadas} decimals={0} />
              <MetricBox label="Simulacros realizados (total)" value={promedios.totalSimulacros} decimals={0} />
            </div>
          </article>

          {/* ---- 3) Distribucion por puntaje (histograma) ---- */}
          <article className="card">
            <div className="section-header">
              <h2>Distribución de puntaje estimado</h2>
              <span className="live-chip">{totalInHist} estudiantes evaluados</span>
            </div>
            {maxHistCount === 0 ? (
              <div className="data-table-empty">
                <p>No hay predicciones para esta cohorte todavia.</p>
              </div>
            ) : (
              <div className="histogram-bars">
                {histograma.map((bin) => {
                  const pctBar = maxHistCount > 0 ? (bin.count / maxHistCount) * 100 : 0
                  const pctCohorte = totalInHist > 0 ? (bin.count / totalInHist) * 100 : 0
                  return (
                    <div key={bin.key} className="histogram-row">
                      <div className="histogram-label">{bin.key}</div>
                      <div className="histogram-track">
                        <div
                          className="histogram-fill"
                          style={{ width: `${pctBar}%` }}
                        >
                          <span className="histogram-value">{bin.count}</span>
                        </div>
                      </div>
                      <div className="histogram-pct">{pctCohorte.toFixed(1)}%</div>
                    </div>
                  )
                })}
              </div>
            )}
          </article>

          {/* ---- 4) Distribuciones demograficas (en grid) ---- */}
          <section className="reportes-distrib-grid">
            <DistCard title="Nivel de ingles" rows={distIngles} />
            <DistCard title="Genero" rows={distGenero} />
            <DistCard title="Estrato socioeconomico" rows={distEstrato} />
            <DistCard title="Trabaja actualmente" rows={distTrabaja.map((r) => ({
              ...r,
              key: r.key === 'true' ? 'Si' : r.key === 'false' ? 'No' : r.key,
            }))} />
            <DistCard title="Horas de estudio semanales" rows={distHoras} />
            <DistCard title="Top 10 ciudades" rows={distCiudades} />
          </section>

          {/* ---- 5) Distribucion por semestre (en grid aparte) ---- */}
          <article className="card">
            <div className="section-header compact">
              <h2>Estudiantes por semestre</h2>
            </div>
            {distSemestre.length === 0 ? (
              <div className="data-table-empty"><p>Sin datos de semestre.</p></div>
            ) : (
              <div className="histogram-bars">
                {distSemestre.map((bin) => {
                  const maxSemestre = Math.max(...distSemestre.map((b) => b.count))
                  const pctBar = maxSemestre > 0 ? (bin.count / maxSemestre) * 100 : 0
                  const pctCohorte = total > 0 ? (bin.count / total) * 100 : 0
                  return (
                    <div key={bin.key} className="histogram-row">
                      <div className="histogram-label">Sem {bin.key}</div>
                      <div className="histogram-track">
                        <div className="histogram-fill" style={{ width: `${pctBar}%` }}>
                          <span className="histogram-value">{bin.count}</span>
                        </div>
                      </div>
                      <div className="histogram-pct">{pctCohorte.toFixed(1)}%</div>
                    </div>
                  )
                })}
              </div>
            )}
          </article>

          {/* ---- 6) Top 5 mejor y peor ---- */}
          <section className="grid-2">
            <article className="card">
              <div className="section-header compact">
                <h2>Top 5 mejor puntaje estimado</h2>
              </div>
              {summary.topMejor.length === 0 ? (
                <div className="data-table-empty"><p>Sin datos.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Nombre</th>
                      <th>Puntaje</th>
                      <th>Prob.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topMejor.map((s) => (
                      <tr key={s.id}>
                        <td className="table-code">{s.documento}</td>
                        <td>{s.nombre}</td>
                        <td className="table-code">{Math.round(s.puntajeEstimado)} pts</td>
                        <td className="table-code">{Math.round((s.probabilidad || 0) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>

            <article className="card">
              <div className="section-header compact">
                <h2>Top 5 peor puntaje estimado</h2>
              </div>
              {summary.topPeor.length === 0 ? (
                <div className="data-table-empty"><p>Sin datos.</p></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Nombre</th>
                      <th>Puntaje</th>
                      <th>Prob.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topPeor.map((s) => (
                      <tr key={s.id} className="pending">
                        <td className="table-code">{s.documento}</td>
                        <td>{s.nombre}</td>
                        <td className="table-code">{Math.round(s.puntajeEstimado)} pts</td>
                        <td className="table-code">{Math.round((s.probabilidad || 0) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </article>
          </section>
        </>
      ) : null}
    </section>
  )
}

// Helper: porcentaje seguro (evita division por cero).
function pctValue(n, total) {
  if (!total || total === 0) return '0'
  return ((Number(n) / Number(total)) * 100).toFixed(1)
}

// Caja de metrica academica con valor grande + unidad.
function MetricBox({ label, value, decimals = 2, unit }) {
  let display = '—'
  if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
    display = `${Number(value).toFixed(decimals)}${unit || ''}`
  }
  return (
    <div className="reportes-metric-box">
      <p className="reportes-metric-label">{label}</p>
      <p className="reportes-metric-value">{display}</p>
    </div>
  )
}

// Tarjeta de distribucion categorica con mini-barras horizontales.
function DistCard({ title, rows }) {
  const safeRows = rows || []
  return (
    <article className="card">
      <div className="section-header compact">
        <h2>{title}</h2>
      </div>
      {safeRows.length === 0 ? (
        <div className="data-table-empty"><p>Sin datos.</p></div>
      ) : (
        <ul className="dist-list">
          {safeRows.map((r) => (
            <li key={r.key} className="dist-list-item">
              <div className="dist-list-header">
                <span className="dist-list-key">{r.key}</span>
                <span className="dist-list-meta">
                  <strong>{r.count}</strong>
                  <span className="dist-list-pct">{(r.pct || 0).toFixed(1)}%</span>
                </span>
              </div>
              <MiniBar pct={r.pct} color={COLOR_BY_KEY[r.key] || 'info'} />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function AdminStatsPanel() {
  const [status, setStatus] = useState('loading')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiGetAdminStats()
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          setError(res.message || 'No se pudieron cargar las estadisticas.')
          setStatus('error')
          return
        }
        setStats(res)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Error de red.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') {
    return <p className="student-interpretation">Cargando estadisticas...</p>
  }
  if (status === 'error') {
    return <p className="auth-feedback error">{error}</p>
  }
  const { total, totalInactivos, byRole, byProgram, admins } = stats
  return (
    <section className="cohort-toolbar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="cohort-metrics-grid">
        <div className="cohort-metric-card">
          <span className="label">Usuarios activos</span>
          <span className="value">{total}</span>
          <span className="hint">Cuentas con acceso al sistema</span>
        </div>
        <div className="cohort-metric-card">
          <span className="label">Administradores activos</span>
          <span className="value">{admins?.activos ?? 0}</span>
          <span className="hint">Cuentas con rol administrador</span>
        </div>
        <div className="cohort-metric-card">
          <span className="label">Estudiantes activos</span>
          <span className="value">{byRole?.estudiante ?? 0}</span>
          <span className="hint">Cuentas con rol estudiante</span>
        </div>
        <div className="cohort-metric-card">
          <span className="label">Cuentas desactivadas</span>
          <span className="value">{totalInactivos}</span>
          <span className="hint">No pueden iniciar sesion</span>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <article className="card">
          <div className="section-header compact">
            <h2>Distribucion por rol</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Rol</th>
                <th>Activos</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_ROLE_OPTIONS.map((r) => (
                <tr key={r.value}>
                  <td>{r.label}</td>
                  <td className="table-code">{byRole?.[r.value] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="card">
          <div className="section-header compact">
            <h2>Distribucion por programa</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Programa</th>
                <th>Activos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sistemas</td>
                <td className="table-code">{byProgram?.sistemas ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>
  )
}

function UserUpsertModal({ initialUser, onClose, onSaved }) {
  const isEdit = Boolean(initialUser)
  const [documento, setDocumento] = useState(initialUser?.documento || '')
  const [username, setUsername] = useState(initialUser?.username || '')
  const [email, setEmail] = useState(initialUser?.email || '')
  const [role, setRole] = useState(initialUser?.role || 'estudiante')
  const [program, setProgram] = useState(
    initialUser?.program && initialUser.program !== 'all' ? initialUser.program : 'sistemas',
  )
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)

  // Si el rol es estudiante, el programa debe ser 'sistemas'.
  const effectiveProgram = role === 'estudiante' ? 'sistemas' : program

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving) return
    setFeedback(null)
    setSaving(true)
    try {
      const payload = {
        documento: documento.toString().trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role,
        program: effectiveProgram,
      }
      const res = isEdit
        ? await apiUpdateAdminUser(initialUser.id, {
            username: payload.username,
            email: payload.email,
            role: payload.role,
            program: payload.program,
          })
        : await apiUpsertAdminUser(payload)
      if (!res.ok) {
        setFeedback({ ok: false, message: res.message || 'No se pudo guardar.' })
        return
      }
      onSaved?.(res)
    } catch (err) {
      setFeedback({ ok: false, message: err.message || 'Error de red.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="account-modal-backdrop" onClick={onClose}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <header className="account-modal-header">
          <div>
            <p className="banner-kicker">{isEdit ? 'Editar usuario' : 'Crear usuario'}</p>
            <h2>{isEdit ? `Cuenta ${initialUser.documento}` : 'Asignar nueva cuenta'}</h2>
          </div>
          <button
            type="button"
            className="account-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <section className="account-section">
          <p className="student-interpretation" style={{ margin: 0 }}>
            La contrasena se asigna automaticamente como el numero de documento. Si
            la cuenta ya existe, se actualizara nombre, correo, rol y programa, y se
            reiniciara la contrasena.
          </p>
          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="auth-label" htmlFor="upsert-doc">
              Documento
            </label>
            <input
              id="upsert-doc"
              className="auth-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={documento}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
              maxLength="15"
              required
              disabled={isEdit}
            />

            <label className="auth-label" htmlFor="upsert-name">
              Nombre completo
            </label>
            <input
              id="upsert-name"
              className="auth-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <label className="auth-label" htmlFor="upsert-email">
              Correo institucional
            </label>
            <input
              id="upsert-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="auth-label" htmlFor="upsert-role">
              Rol
            </label>
            <select
              id="upsert-role"
              className="auth-input auth-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ADMIN_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="auth-label" htmlFor="upsert-program">
              Programa
            </label>
            <select
              id="upsert-program"
              className="auth-input auth-select"
              value={effectiveProgram}
              onChange={(e) => setProgram(e.target.value)}
              disabled={role === 'estudiante'}
            >
              {ADMIN_PROGRAM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {role === 'estudiante' ? (
              <p className="student-interpretation" style={{ margin: 0 }}>
                Los estudiantes siempre quedan asignados al programa Sistemas.
              </p>
            ) : null}

            {feedback ? (
              <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
                {feedback.message}
              </p>
            ) : null}
            <div className="form-actions">
              <button className="auth-button" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear / actualizar'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function AdminUsersPanel({ currentUser }) {
  const [status, setStatus] = useState('loading')
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ role: '', program: '', isActive: 'true', search: '' })
  const [error, setError] = useState(null)
  const [modalUser, setModalUser] = useState(null) // null = cerrado, undefined = crear
  const [refreshKey, setRefreshKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function load() {
    setStatus('loading')
    setError(null)
    const res = await apiListAdminUsers({
      role: filters.role || undefined,
      program: filters.program || undefined,
      isActive: filters.isActive === '' ? undefined : filters.isActive,
      search: filters.search || undefined,
      limit: 200,
      offset: 0,
    })
    if (!res.ok) {
      setError(res.message || 'No se pudo cargar la lista.')
      setStatus('error')
      return
    }
    setUsers(res.users || [])
    setTotal(res.total || 0)
    setStatus('ready')
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role, filters.program, filters.isActive, filters.search, refreshKey])

  async function handleToggleActive(user) {
    if (busy) return
    await doToggleActive(user)
  }

  async function doToggleActive(user) {
    setBusy(true)
    try {
      const res = user.isActive
        ? await apiDeactivateAdminUser(user.id)
        : await apiActivateAdminUser(user.id)
      if (!res.ok) {
        toast.error(res.message || 'Operacion no completada.')
        return
      }
      toast.success(
        user.isActive
          ? `${user.username} fue desactivado.`
          : `${user.username} fue reactivado.`,
      )
      setRefreshKey((k) => k + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Gestion de usuarios</p>
          <h2>Asignar roles y administrar cuentas</h2>
        </div>
        <div className="filter-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="auth-button"
            type="button"
            onClick={() => setModalUser(undefined)}
          >
            + Crear / asignar
          </button>
        </div>
      </div>

      <div className="cohort-toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          className="auth-input"
          type="search"
          placeholder="Buscar por nombre, correo o documento"
          value={filters.search}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value, offset: 0 }))
          }
          style={{ minWidth: 240 }}
        />
        <select
          className="auth-input auth-select"
          value={filters.role}
          onChange={(e) =>
            setFilters((f) => ({ ...f, role: e.target.value, offset: 0 }))
          }
        >
          {ADMIN_ROLE_FILTER_OPTIONS.map((o) => (
            <option key={`role-${o.value || '_all'}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="auth-input auth-select"
          value={filters.program}
          onChange={(e) =>
            setFilters((f) => ({ ...f, program: e.target.value, offset: 0 }))
          }
        >
          {ADMIN_PROGRAM_FILTER_OPTIONS.map((o) => (
            <option key={`prog-${o.value || '_all'}`} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="auth-input auth-select"
          value={filters.isActive}
          onChange={(e) =>
            setFilters((f) => ({ ...f, isActive: e.target.value, offset: 0 }))
          }
        >
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
          <option value="">Todos</option>
        </select>
      </div>

      <div className="cohort-metrics-grid">
        <div className="cohort-metric-card">
          <span className="label">Total filtrado</span>
          <span className="value">{total}</span>
        </div>
        <div className="cohort-metric-card">
          <span className="label">Activos</span>
          <span className="value">{users.filter((u) => u.isActive).length}</span>
        </div>
        <div className="cohort-metric-card">
          <span className="label">Inactivos</span>
          <span className="value">{users.filter((u) => !u.isActive).length}</span>
        </div>
      </div>

      {status === 'loading' ? (
        <p className="student-interpretation">Cargando usuarios...</p>
      ) : null}
      {status === 'error' ? <p className="auth-feedback error">{error}</p> : null}

      {status === 'ready' ? (
        <article className="card">
          <DataTable
            rows={users}
            searchFields={['documento', 'username', 'email']}
            searchPlaceholder="Buscar por nombre, documento o correo"
            defaultPageSize={25}
            rowKey={(u) => u.id}
            rowClassName={(u) => (u.isActive ? '' : 'pending')}
            emptyMessage="No hay usuarios con esos filtros."
            columns={[
              { key: 'documento', label: 'Documento', className: 'table-code' },
              { key: 'username', label: 'Nombre' },
              { key: 'email', label: 'Correo' },
              {
                key: 'role',
                label: 'Rol',
                render: (u) => <span className="risk-pill bajo">{adminRoleLabel(u.role)}</span>,
              },
              { key: 'program', label: 'Programa', render: (u) => adminProgramLabel(u.program) },
              {
                key: 'isActive',
                label: 'Estado',
                render: (u) => (
                  <span className={`risk-pill ${u.isActive ? 'bajo' : 'alto'}`}>
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: 'Acciones',
                render: (u) => {
                  const isSelf = u.id === currentUser.id
                  return (
                    <div className="row-actions">
                      <button
                        className="auth-button-sm secondary"
                        type="button"
                        onClick={() => setModalUser(u)}
                      >
                        Editar
                      </button>
                      {u.isActive ? (
                        <button
                          className="auth-button-sm danger"
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={isSelf || busy}
                          title={isSelf ? 'No puedes desactivarte a ti mismo' : ''}
                        >
                          Desactivar
                        </button>
                      ) : (
                        <button
                          className="auth-button-sm secondary"
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={busy}
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  )
                },
              },
            ]}
          />
        </article>
      ) : null}

      {modalUser !== null ? (
        <UserUpsertModal
          initialUser={modalUser || null}
          currentUser={currentUser}
          onClose={() => setModalUser(null)}
          onSaved={() => {
            setModalUser(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      ) : null}
    </section>
  )
}

// ---- Acciones del audit log ----
// code -> { label, icon, tone, description }
// tone es una de: success | danger | info | warning | muted | neutral
const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: {
    label: 'Inicio de sesion exitoso',
    icon: 'check',
    tone: 'success',
    description: 'El usuario ingreso correctamente al sistema.',
  },
  LOGIN_FAIL: {
    label: 'Inicio de sesion fallido',
    icon: 'x',
    tone: 'danger',
    description: 'Intento de inicio de sesion con credenciales incorrectas.',
  },
  PASSWORD_CHANGE: {
    label: 'Cambio de contrasena',
    icon: 'settings',
    tone: 'info',
    description: 'El usuario modifico su contrasena desde su cuenta.',
  },
  RECOVER_REQUEST: {
    label: 'Solicitud de recuperacion',
    icon: 'warning',
    tone: 'warning',
    description: 'Se solicito recuperacion de contrasena para una cuenta.',
  },
  USER_UPSERT: {
    label: 'Creacion de usuario',
    icon: 'userPlus',
    tone: 'success',
    description: 'Se creo o reasigno un usuario del sistema.',
  },
  USER_EDIT: {
    label: 'Edicion de usuario',
    icon: 'settings',
    tone: 'info',
    description: 'Se modificaron datos de un usuario existente.',
  },
  USER_DEACTIVATE: {
    label: 'Usuario desactivado',
    icon: 'x',
    tone: 'danger',
    description: 'Se desactivo una cuenta. No podra iniciar sesion hasta reactivarla.',
  },
  USER_ACTIVATE: {
    label: 'Usuario reactivado',
    icon: 'check',
    tone: 'success',
    description: 'Se reactivo una cuenta previamente desactivada.',
  },
  update_user: {
    label: 'Actualizacion de usuario',
    icon: 'settings',
    tone: 'info',
    description: 'Se actualizaron datos de un usuario.',
  },
  EXPORT_METRICS_CSV: {
    label: 'Exportar metricas CSV',
    icon: 'download',
    tone: 'muted',
    description: 'Se descargo el CSV de metricas del modelo.',
  },
}

function getAuditActionMeta(code) {
  return (
    AUDIT_ACTIONS[code] || {
      label: code,
      icon: 'crown',
      tone: 'neutral',
      description: 'Accion registrada en el sistema.',
    }
  )
}

// Lista ordenada segun la gravedad / naturaleza (las sensibles al inicio)
const AUDIT_ACTION_ORDER = [
  'LOGIN_FAIL',
  'RECOVER_REQUEST',
  'USER_DEACTIVATE',
  'USER_ACTIVATE',
  'USER_UPSERT',
  'USER_EDIT',
  'update_user',
  'PASSWORD_CHANGE',
  'LOGIN_SUCCESS',
  'EXPORT_METRICS_CSV',
]

function AuditDetailsModal({ entry, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!entry) return null

  const meta = getAuditActionMeta(entry.accion)
  const detalles = entry.detalles || {}
  const detalleEntries = Object.entries(detalles)

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`audit-details-modal audit-details-${meta.tone}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="audit-modal-title"
      >
        <header className="audit-details-header">
          <div className="audit-details-icon" aria-hidden="true">
            <Icon name={meta.icon} size={22} />
          </div>
          <div className="audit-details-text">
            <p className="audit-details-kicker">Detalle del evento</p>
            <h3 id="audit-modal-title">{meta.label}</h3>
            <p className="audit-details-subtitle">{meta.description}</p>
          </div>
          <button
            type="button"
            className="audit-details-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="x" size={16} />
          </button>
        </header>

        <section className="audit-details-meta">
          <div className="audit-details-meta-item">
            <span className="audit-details-meta-label">Codigo</span>
            <span className="audit-details-meta-value audit-code">{entry.accion}</span>
          </div>
          <div className="audit-details-meta-item">
            <span className="audit-details-meta-label">Fecha y hora</span>
            <span className="audit-details-meta-value">{formatDate(entry.createdAt)}</span>
          </div>
          <div className="audit-details-meta-item">
            <span className="audit-details-meta-label">Administrador</span>
            <span className="audit-details-meta-value">
              {entry.adminEmail || (entry.adminId != null ? `id ${entry.adminId}` : '—')}
            </span>
          </div>
          <div className="audit-details-meta-item">
            <span className="audit-details-meta-label">Documento objetivo</span>
            <span className="audit-details-meta-value audit-code">
              {entry.targetDocumento || '—'}
            </span>
          </div>
        </section>

        <section className="audit-details-body">
          <h4>Informacion capturada</h4>
          {detalleEntries.length === 0 ? (
            <p className="audit-details-empty">
              Esta accion no registro informacion adicional.
            </p>
          ) : (
            <dl className="audit-details-list">
              {detalleEntries.map(([key, value]) => (
                <div key={key} className="audit-details-row">
                  <dt>{key}</dt>
                  <dd>
                    {typeof value === 'object' && value !== null
                      ? <code>{JSON.stringify(value, null, 2)}</code>
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <footer className="audit-details-actions">
          <button
            type="button"
            className="audit-details-button primary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  )
}

function AdminAuditPanel() {
  const [status, setStatus] = useState('loading')
  const [entries, setEntries] = useState([])
  const [filterEmail, setFilterEmail] = useState('')
  const [filterAccion, setFilterAccion] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [viewingEntry, setViewingEntry] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    apiGetAdminAudit({
      limit: 200,
      offset: 0,
      adminEmail: filterEmail || undefined,
      accion: filterAccion || undefined,
      createdAtFrom: dateFrom ? `${dateFrom} 00:00:00` : undefined,
      createdAtTo: dateTo ? `${dateTo} 23:59:59` : undefined,
    })
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          setError(res.message || 'No se pudo cargar la auditoria.')
          setStatus('error')
          return
        }
        setEntries(res.entries || [])
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Error de red.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [filterEmail, filterAccion, dateFrom, dateTo, refreshKey])

  async function handleExportCsv() {
    setExporting(true)
    try {
      const res = await apiGetAdminAudit({
        limit: 10000,
        offset: 0,
        adminEmail: filterEmail || undefined,
        accion: filterAccion || undefined,
        createdAtFrom: dateFrom ? `${dateFrom} 00:00:00` : undefined,
        createdAtTo: dateTo ? `${dateTo} 23:59:59` : undefined,
      })
      if (!res.ok) {
        alert(res.message || 'No se pudo exportar la auditoria.')
        return
      }
      // Construir CSV en cliente. Escape RFC 4180. Exporta labels amigables
      // en vez de los codigos crudos, para que el CSV sea legible.
      const header = ['Fecha', 'Administrador', 'Accion', 'Documento objetivo', 'Detalles']
      const escape = (v) => {
        if (v === null || v === undefined) return ''
        const s = String(v)
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }
      const lines = [header.join(',')]
      for (const e of res.entries || []) {
        const meta = getAuditActionMeta(e.accion)
        lines.push([
          escape(e.createdAt),
          escape(e.adminEmail || (e.adminId != null ? `id ${e.adminId}` : '')),
          escape(meta.label),
          escape(e.targetDocumento || ''),
          escape(JSON.stringify(e.detalles || {})),
        ].join(','))
      }
      const csv = lines.join('\n') + '\n'
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <AuditDetailsModal
        entry={viewingEntry}
        onClose={() => setViewingEntry(null)}
      />

      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Auditoria</p>
          <h2>Historial de acciones administrativas</h2>
        </div>
        <div className="filter-group" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="auth-button-secondary"
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button
            className="auth-button-secondary"
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refrescar
          </button>
        </div>
      </div>

      <div className="cohort-toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          className="auth-input"
          type="search"
          placeholder="Filtrar por email del administrador"
          value={filterEmail}
          onChange={(e) => setFilterEmail(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select
          className="auth-input"
          value={filterAccion}
          onChange={(e) => setFilterAccion(e.target.value)}
          style={{ minWidth: 220 }}
        >
          <option value="">Todas las acciones</option>
          {AUDIT_ACTION_ORDER.map((code) => {
            const meta = getAuditActionMeta(code)
            return (
              <option key={code} value={code}>
                {meta.label}
              </option>
            )
          })}
        </select>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
          Desde
          <input
            className="auth-input"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
          Hasta
          <input
            className="auth-input"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <button
          className="auth-button-secondary"
          type="button"
          onClick={() => {
            setFilterEmail('')
            setFilterAccion('')
            setDateFrom('')
            setDateTo('')
          }}
        >
          Limpiar filtros
        </button>
      </div>

      {status === 'loading' ? <p className="student-interpretation">Cargando...</p> : null}
      {status === 'error' ? <p className="auth-feedback error">{error}</p> : null}

      {status === 'ready' ? (
        <article className="card">
          <DataTable
            rows={entries}
            searchFields={['adminEmail', 'targetDocumento', 'accion']}
            searchPlaceholder="Buscar por admin, documento o accion"
            defaultPageSize={20}
            rowKey={(e) => e.id}
            emptyMessage="Sin registros para los filtros aplicados."
            columns={[
              {
                key: 'createdAt',
                label: 'Fecha',
                className: 'table-code',
                render: (e) => formatDate(e.createdAt),
              },
              { key: 'adminEmail', label: 'Administrador', render: (e) => e.adminEmail || `id ${e.adminId}` },
              {
                key: 'accion',
                label: 'Accion',
                render: (e) => {
                  const meta = getAuditActionMeta(e.accion)
                  return (
                    <span
                      className={`audit-action-pill audit-action-${meta.tone}`}
                      title={e.accion}
                    >
                      <Icon name={meta.icon} size={12} />
                      <span>{meta.label}</span>
                    </span>
                  )
                },
              },
              {
                key: 'targetDocumento',
                label: 'Documento objetivo',
                className: 'table-code',
                render: (e) => e.targetDocumento || '—',
              },
              {
                key: 'userAgent',
                label: 'Cliente',
                render: (e) => {
                  const p = parseUserAgent(e.userAgent)
                  const label = shortClientLabel(e.userAgent)
                  const tone = p.isApi ? 'risk-pill medio' : 'risk-pill bajo'
                  return (
                    <span
                      title={e.userAgent || ''}
                      className={tone}
                      style={{ fontSize: '0.72rem', padding: '0.18rem 0.5rem' }}
                    >
                      {p.isApi ? <Icon name="command" size={11} /> : <Icon name="user" size={11} />}
                      <span style={{ marginLeft: '0.25rem' }}>{label}</span>
                    </span>
                  )
                },
              },
              {
                key: 'detalles',
                label: 'Detalles',
                render: (e) => (
                  <button
                    type="button"
                    className="audit-details-trigger"
                    onClick={() => setViewingEntry(e)}
                  >
                    <Icon name="search" size={13} />
                    <span>Ver</span>
                  </button>
                ),
              },
            ]}
          />
        </article>
      ) : null}
    </section>
  )
}

// =====================================================================
// Analisis del modelo ML (solo administrador)
// Muestra metricas, graficos y formulario para probar el modelo real
// (saberpro_model.pkl, version real-data-v1) via FastAPI :8000.
// =====================================================================

// Origen del backend (sin /api). Sirve para resolver URLs absolutas a
// archivos estaticos servidos por Express (e.g. /assets/analysis/*.png).
const BACKEND_ORIGIN = (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api')
  .replace(/\/api\/?$/, '')

const ANALYSIS_IMAGES = [
  { src: `${BACKEND_ORIGIN}/assets/analysis/comparacion_metricas.png`, alt: 'Comparacion de metricas', title: 'Comparacion de metricas' },
  { src: `${BACKEND_ORIGIN}/assets/analysis/matriz_confusion_gradientboostingclassifier.png`, alt: 'Matriz de confusion (GB)', title: 'Matriz de confusion - Gradient Boosting' },
  { src: `${BACKEND_ORIGIN}/assets/analysis/matriz_confusion_logisticregression.png`, alt: 'Matriz de confusion (LR)', title: 'Matriz de confusion - Logistic Regression' },
  { src: `${BACKEND_ORIGIN}/assets/analysis/feature_importance.png`, alt: 'Importancia de features', title: 'Importancia de features' },
  { src: `${BACKEND_ORIGIN}/assets/analysis/distribucion_clases.png`, alt: 'Distribucion de clases', title: 'Distribucion real vs predicha' },
  { src: `${BACKEND_ORIGIN}/assets/analysis/roc_curves.png`, alt: 'Curvas ROC', title: 'Curvas ROC (one-vs-rest)' },
]

const PREDICT_FORM_DEFAULTS = {
  promedio_materias_basicas: 3.5,
  promedio_ingenieria: 3.5,
  promedio_programacion: 3.5,
  promedio_matematica_estadistica: 3.5,
  asignaturas_reprobadas: 1,
  porcentaje_avance: 70,
  semestre_actual: 5,
  estrato: 3,
  creditos_aprobados: 80,
  asignaturas_aprobadas: 25,
  edad: 22,
  genero: 'M',
  promedio_ingles_nivel: 'B1',
}

function MetricCard({ label, value, hint, tone = 'default' }) {
  return (
    <article className={`card metric-card metric-card-${tone}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </article>
  )
}

// Pill de estado de servicios: 3 puntos verde/amarillo/rojo segun health.
function HealthPill({ health, status }) {
  const dot = (state) => state === 'up' || state === 'connected'
    ? 'health-up'
    : state === 'degraded'
      ? 'health-degraded'
      : 'health-down'
  if (status === 'loading') {
    return <span className="muted-text small">Verificando servicios...</span>
  }
  if (!health) return <span className="muted-text small">Sin conexion</span>
  return (
    <div className="health-pill" aria-label="Estado de servicios">
      <span className={`health-dot ${dot(health.express)}`}><span className="health-dot-mark" /> Express</span>
      <span className={`health-dot ${dot(health.db)}`}><span className="health-dot-mark" /> BD</span>
      <span
        title={`FastAPI · modelo ${health.model_version || ''}`}
        className={`health-dot ${dot(health.fastapi)}`}
      >
        <span className="health-dot-mark" /> FastAPI
      </span>
    </div>
  )
}

// Fila de la tabla comparativa LR vs GB con destacado del ganador.
function CompareRow({ label, a, b, fmt }) {
  const cmp = (x, y) => (x == null && y == null ? 0 : x == null ? -1 : y == null ? 1 : y - x)
  const winner = cmp(a, b)
  return (
    <tr>
      <td className="compare-label">{label}</td>
      <td className={`table-code ${winner > 0 ? 'compare-loser' : ''}`}>{a != null ? fmt(a) : '-'}</td>
      <td className={`table-code ${winner < 0 ? 'compare-loser' : ''}`}>{b != null ? fmt(b) : '-'}</td>
      <td>
        {winner > 0 ? (
          <span className="compare-winner compare-winner-lr">LR &star;</span>
        ) : winner < 0 ? (
          <span className="compare-winner compare-winner-gb">GB &star;</span>
        ) : (
          <span className="muted-text small">empate</span>
        )}
      </td>
    </tr>
  )
}

function AdminAnalysisPanel() {
  const [metricsStatus, setMetricsStatus] = useState('loading')
  const [metrics, setMetrics] = useState(null)
  const [metricsError, setMetricsError] = useState('')
  const [datasetStatus, setDatasetStatus] = useState('loading')
  const [datasetStats, setDatasetStats] = useState(null)
  const [qualityStatus, setQualityStatus] = useState('loading')
  const [quality, setQuality] = useState(null)
  const [healthStatus, setHealthStatus] = useState('loading')
  const [health, setHealth] = useState(null)
  const [form, setForm] = useState(PREDICT_FORM_DEFAULTS)
  const [predictStatus, setPredictStatus] = useState('idle')
  const [prediction, setPrediction] = useState(null)
  const [predictError, setPredictError] = useState('')
  const [exportingCsv, setExportingCsv] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMetricsStatus('loading')
    apiGetAnalysisMetrics()
      .then((res) => {
        if (cancelled) return
        if (res.ok) { setMetrics(res.metrics); setMetricsStatus('ready') }
        else { setMetricsError(res.message || 'No se pudo cargar las metricas.'); setMetricsStatus('error') }
      })
      .catch((err) => {
        if (cancelled) return
        setMetricsError(err.message || 'Error desconocido')
        setMetricsStatus('error')
      })
    setDatasetStatus('loading')
    apiGetAnalysisDatasetStats()
      .then((res) => {
        if (cancelled) return
        if (res.ok) { setDatasetStats(res); setDatasetStatus('ready') }
        else { setDatasetStatus('error') }
      })
      .catch(() => { if (!cancelled) setDatasetStatus('error') })
    setQualityStatus('loading')
    apiGetAnalysisDataQuality()
      .then((res) => {
        if (cancelled) return
        if (res.ok) { setQuality(res); setQualityStatus('ready') }
        else { setQualityStatus('error') }
      })
      .catch(() => { if (!cancelled) setQualityStatus('error') })
    // Health: usamos el helper apiHealth existente (no requiere auth).
    import('./api.js').then(({ apiHealth }) => {
      apiHealth().then((res) => {
        if (cancelled) return
        if (res && (res.express || res.db)) { setHealth(res); setHealthStatus('ready') }
        else { setHealthStatus('error') }
      }).catch(() => { if (!cancelled) setHealthStatus('error') })
    })
    return () => { cancelled = true }
  }, [])

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handlePredict(event) {
    event.preventDefault()
    setPredictStatus('loading')
    setPredictError('')
    setPrediction(null)
    apiPostAnalysisPredict(form)
      .then((res) => {
        if (res.ok) {
          setPrediction(res)
          setPredictStatus('ready')
        } else {
          setPredictError(res.message || 'No se pudo obtener la prediccion.')
          setPredictStatus('error')
        }
      })
      .catch((err) => {
        setPredictError(err.message || 'Error desconocido')
        setPredictStatus('error')
      })
  }

  async function handleExportCsv() {
    setExportingCsv(true)
    try {
      const res = await apiGetAnalysisMetricsCsv()
      if (!res.ok) {
        alert(res.message || 'No se pudo descargar el CSV.')
        return
      }
      const url = URL.createObjectURL(res.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'saberpro_metrics.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExportingCsv(false)
    }
  }

  // Helpers para metricas
  const bestName = metrics?.best_model
  const bestM = bestName ? metrics.all_models[bestName] : null
  const lrM = metrics?.all_models?.LogisticRegression
  const gbM = metrics?.all_models?.GradientBoostingClassifier
  const fmt = (n, d = 4) => (n == null ? '-' : Number(n).toFixed(d))

  return (
    <div className="analysis-panel">
      <section className="card welcome-banner analysis-hero">
        <div>
          <p className="banner-kicker">Modelo predictivo</p>
          <h2>Analisis del modelo entrenado con datos reales</h2>
          <p className="banner-text">
            Esta vista resume el desempeno del clasificador Gradient Boosting
            entrenado con 627 registros del dataset
            {' '}<code>dataset_saber_pro_real</code> (736 filas, 109 excluidas por
            promedio acumulado en 0). Target derivado de{' '}
            <code>promedio_acumulado</code>: Bajo &lt; 3.0, Medio 3.0-3.99,
            Alto &gt;= 4.0.
          </p>
        </div>
        <HealthPill health={health} status={healthStatus} />
      </section>

      <section className="analysis-kpis">
        <article className="kpi-card indigo">
          <div className="kpi-icon"><Icon name="trophy" size={22} /></div>
          <p className="kpi-value kpi-value-text">{bestName || (metricsStatus === 'loading' ? 'Cargando...' : 'N/D')}</p>
          <p className="kpi-label">Mejor modelo</p>
          <p className="kpi-detail">Seleccionado por accuracy</p>
        </article>
        <article className="kpi-card cyan">
          <div className="kpi-icon"><Icon name="target" size={22} /></div>
          <p className="kpi-value">{bestM && bestM.accuracy != null ? bestM.accuracy.toFixed(4) : '-'}</p>
          <p className="kpi-label">Accuracy</p>
          <p className="kpi-detail">Sobre 126 muestras de test</p>
        </article>
        <article className="kpi-card violet">
          <div className="kpi-icon"><Icon name="chart" size={22} /></div>
          <p className="kpi-value">{bestM && bestM.f1_weighted != null ? bestM.f1_weighted.toFixed(4) : '-'}</p>
          <p className="kpi-label">F1 weighted</p>
          <p className="kpi-detail">Promedio ponderado por soporte</p>
        </article>
        <article className="kpi-card lime">
          <div className="kpi-icon"><Icon name="trend" size={22} /></div>
          <p className="kpi-value">{bestM && bestM.roc_auc_ovr_weighted != null
            ? bestM.roc_auc_ovr_weighted.toFixed(4) : '-'}</p>
          <p className="kpi-label">ROC AUC (OvR)</p>
          <p className="kpi-detail">Promedio one-vs-rest</p>
        </article>
        <article className="kpi-card rose">
          <div className="kpi-icon"><Icon name="file" size={22} /></div>
          <p className="kpi-value">{metrics ? `${metrics.rows_used} / ${metrics.rows_total}` : '-'}</p>
          <p className="kpi-label">Filas usadas</p>
          <p className="kpi-detail">109 excluidas (promedio=0)</p>
        </article>
        <article className="kpi-card emerald">
          <div className="kpi-icon"><Icon name="inbox" size={22} /></div>
          <p className="kpi-value kpi-value-text">{metrics ? metrics.model_version : '-'}</p>
          <p className="kpi-label">Version</p>
          <p className="kpi-detail">train_from_real.py</p>
        </article>
      </section>

      {metricsStatus === 'error' ? (
        <div className="card error-banner">
          <strong>No se pudieron cargar las metricas:</strong> {metricsError}
        </div>
      ) : null}

      <section className="card">
        <div className="section-header">
          <h3>Comparativa de modelos (Logistic Regression vs Gradient Boosting)</h3>
          <button
            className="auth-button-secondary"
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv || !metrics}
          >
            {exportingCsv ? 'Descargando...' : 'Descargar CSV'}
          </button>
        </div>
        <p className="muted-text">
          Comparacion lado a lado de los dos modelos entrenados con
          {' '}<code>desercion_metrics.json</code>. La estrella marca al ganador
          por accuracy en el conjunto de test.
        </p>
        {metricsStatus === 'ready' && (lrM || gbM) ? (
          <table className="ab-compare-table">
            <thead>
              <tr>
                <th>Metrica</th>
                <th>Logistic Regression</th>
                <th>Gradient Boosting</th>
                <th>Ganador</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Accuracy" a={lrM?.accuracy} b={gbM?.accuracy} fmt={fmt} />
              <CompareRow label="Precision (weighted)" a={lrM?.precision_weighted} b={gbM?.precision_weighted} fmt={fmt} />
              <CompareRow label="Recall (weighted)" a={lrM?.recall_weighted} b={gbM?.recall_weighted} fmt={fmt} />
              <CompareRow label="F1 (weighted)" a={lrM?.f1_weighted} b={gbM?.f1_weighted} fmt={fmt} />
              <CompareRow label="ROC AUC (OvR)" a={lrM?.roc_auc_ovr_weighted} b={gbM?.roc_auc_ovr_weighted} fmt={fmt} />
            </tbody>
          </table>
        ) : null}
        {metricsStatus === 'loading' ? <p>Cargando...</p> : null}
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Distribucion del dataset</h3>
          <span className="live-chip">{datasetStats?.total || '—'} registros</span>
        </div>
        {datasetStatus === 'loading' ? (
          <div className="dataset-distribution">
            <div className="skeleton skeleton-stacked" />
            <div className="skeleton skeleton-stacked" />
            <div className="skeleton skeleton-stacked" />
          </div>
        ) : null}
        {datasetStatus === 'error' ? <p className="muted-text">No se pudo cargar la distribucion.</p> : null}
        {datasetStatus === 'ready' && datasetStats ? (
          (() => {
            const dist = datasetStats.target_distribution || {}
            const total = datasetStats.total || 1
            return (
              <div className="dataset-distribution">
                {['Bajo', 'Medio', 'Alto'].map((cls) => {
                  const n = Number(dist[cls] || 0)
                  const pct = total > 0 ? (n / total) * 100 : 0
                  return (
                    <div key={cls} className={`dataset-card dataset-${cls.toLowerCase()}`}>
                      <div className="dataset-card-header">
                        <span className="dataset-card-label">{cls}</span>
                        <span className="dataset-card-pct">{pct.toFixed(1)}%</span>
                      </div>
                      <p className="dataset-card-value">{n}</p>
                      <div className="dataset-card-bar">
                        <div className="dataset-card-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="dataset-card-meta">{n} de {total} registros</p>
                    </div>
                  )
                })}
              </div>
            )
          })()
        ) : null}
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Calidad del dataset</h3>
          <span className="live-chip">Nulos y categoricas</span>
        </div>
        <p className="muted-text">
          Conteo de valores nulos por columna usada por el modelo, mas la
          distribucion de las variables categoricas. Una barra roja indica
          {' '}&gt;= 5% de nulos (segun la practica habitual de limpieza de datos).
        </p>
        {qualityStatus === 'loading' ? <p className="muted-text">Cargando calidad...</p> : null}
        {qualityStatus === 'error' ? <p className="muted-text">No se pudo cargar la calidad del dataset.</p> : null}
        {qualityStatus === 'ready' && quality ? (
          (() => {
            const total = quality.totals.rows || 1
            const nullsArr = Object.entries(quality.nulls || {})
              .map(([col, n]) => {
                const pct = (n / total) * 100
                return { col, n, pct }
              })
              .sort((a, b) => b.pct - a.pct)
            return (
              <>
                <div className="nulls-grid">
                  {nullsArr.map(({ col, n, pct }) => {
                    const tone = pct >= 5 ? 'high' : pct > 0 ? 'low' : 'none'
                    return (
                      <div key={col} className={`null-pill null-${tone}`}>
                        <div className="null-pill-header">
                          <span className="null-name" title={col}>{col}</span>
                          <span className="null-pct">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="null-bar">
                          <div className={`null-bar-fill null-bar-${tone}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                        </div>
                        <span className="null-count">{n} nulos</span>
                      </div>
                    )
                  })}
                </div>
                <div className="histograms">
                  {Object.entries(quality.categoricals || {}).map(([col, buckets]) => {
                    const entries = Object.entries(buckets)
                    const max = entries.reduce((m, [, v]) => Math.max(m, v), 0) || 1
                    return (
                      <div key={col} className="histogram">
                        <h4 className="histogram-title">{col}</h4>
                        <ul className="histogram-list">
                          {entries.map(([bucket, n]) => (
                            <li key={bucket} className="hist-row">
                              <span className="hist-label">{bucket}</span>
                              <div className="hist-track">
                                <div
                                  className="hist-fill"
                                  style={{ width: `${(n / max) * 100}%` }}
                                />
                              </div>
                              <span className="hist-count">{n}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()
        ) : null}
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Graficos del analisis</h3>
          <span className="live-chip">PNG · {ANALYSIS_IMAGES.length} figuras</span>
        </div>
        <p className="muted-text">
          Generados por <code>ml/analyze_results.py</code> a partir del
          modelo serializado en <code>ml/trained_models/saberpro_model.pkl</code>.
        </p>
        <div className="analysis-gallery">
          {ANALYSIS_IMAGES.map((img) => (
            <figure key={img.src} className="analysis-figure">
              <img src={img.src} alt={img.alt} loading="lazy" />
              <figcaption>
                <span>{img.title}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Probar el modelo</h3>
          <span className="live-chip">13 features</span>
        </div>
        <p className="muted-text">
          Envia 13 features al modelo real. La peticion pasa por Express
          (puerto 4000) y luego a FastAPI (puerto 8000) que carga el .pkl.
        </p>
        <form onSubmit={handlePredict} className="predict-form">
          <div className="form-grid predict-form-grid">
            <label className="form-field">
              <span>Promedio basicas (0-5)</span>
              <input type="number" step="0.01" min="0" max="5" required
                value={form.promedio_materias_basicas}
                onChange={(e) => updateField('promedio_materias_basicas', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Promedio ingenieria (0-5)</span>
              <input type="number" step="0.01" min="0" max="5" required
                value={form.promedio_ingenieria}
                onChange={(e) => updateField('promedio_ingenieria', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Promedio programacion (0-5)</span>
              <input type="number" step="0.01" min="0" max="5" required
                value={form.promedio_programacion}
                onChange={(e) => updateField('promedio_programacion', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Promedio matematica/estadistica (0-5)</span>
              <input type="number" step="0.01" min="0" max="5" required
                value={form.promedio_matematica_estadistica}
                onChange={(e) => updateField('promedio_matematica_estadistica', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Asignaturas reprobadas (0-50)</span>
              <input type="number" min="0" max="50" required
                value={form.asignaturas_reprobadas}
                onChange={(e) => updateField('asignaturas_reprobadas', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Porcentaje avance (0-100)</span>
              <input type="number" step="0.1" min="0" max="100" required
                value={form.porcentaje_avance}
                onChange={(e) => updateField('porcentaje_avance', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Semestre actual (1-12)</span>
              <input type="number" min="1" max="12" required
                value={form.semestre_actual}
                onChange={(e) => updateField('semestre_actual', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Estrato (1-6)</span>
              <input type="number" min="1" max="6" required
                value={form.estrato}
                onChange={(e) => updateField('estrato', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Creditos aprobados (0-300)</span>
              <input type="number" min="0" max="300" required
                value={form.creditos_aprobados}
                onChange={(e) => updateField('creditos_aprobados', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Asignaturas aprobadas (0-80)</span>
              <input type="number" min="0" max="80" required
                value={form.asignaturas_aprobadas}
                onChange={(e) => updateField('asignaturas_aprobadas', Number(e.target.value))} />
            </label>
            <label className="form-field">
              <span>Edad (14-80)</span>
              <input type="number" min="14" max="80" required
                value={form.edad}
                onChange={(e) => updateField('edad', Number(e.target.value))} />
            </label>
            <label>
              <span>Genero</span>
              <select value={form.genero}
                onChange={(e) => updateField('genero', e.target.value)}>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </label>
            <label>
              <span>Nivel de ingles</span>
              <select value={form.promedio_ingles_nivel}
                onChange={(e) => updateField('promedio_ingles_nivel', e.target.value)}>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={predictStatus === 'loading'}>
            {predictStatus === 'loading' ? 'Prediciendo...' : 'Predecir con el modelo real'}
          </button>
        </form>

        {predictStatus === 'error' ? (
          <div className="error-banner">
            <strong>Error:</strong> {predictError}
          </div>
        ) : null}

        {predictStatus === 'ready' && prediction && prediction.resultado ? (
          (() => {
            const outcome = (prediction.resultado || 'bajo').toLowerCase()
            const probOrder = ['bajo', 'medio', 'alto']
            const iconName = outcome === 'alto' ? 'warning' : outcome === 'medio' ? 'trophy' : 'check'
            const conf = Number(prediction.confidence_pct ?? (prediction.probabilidad != null ? prediction.probabilidad * 100 : null))
            const confDisplay = conf != null && !Number.isNaN(conf) ? `${conf.toFixed(1)}%` : '—'
            const fallbackProbability = probOrder.reduce((acc, k) => {
              acc[k] = Math.round((conf != null ? (1 - conf / 100) / 2 : 1 / 3) * 1000) / 10
              return acc
            }, {})
            return (
          <div className="prediction-result">
            <div className={`prediction-badge prediction-${outcome}`}>
              <div className="prediction-icon" aria-hidden="true">
                <Icon name={iconName} size={22} />
              </div>
              <div className="prediction-body">
                <span className="prediction-label">Prediccion del modelo</span>
                <span className="prediction-class">{prediction.resultado}</span>
              </div>
              <span className="prediction-confidence" title="Confianza del modelo">
                {confDisplay} <small style={{ fontWeight: 500, opacity: 0.7 }}>confianza</small>
              </span>
            </div>
            {prediction.probabilities ? (
              <div className="probability-bars">
                {probOrder.map((k) => {
                  const label = k.charAt(0).toUpperCase() + k.slice(1)
                  const p = Number(prediction.probabilities[label] ?? fallbackProbability[k])
                  return (
                    <div key={k} className={`prob-row prob-${k}`}>
                      <span className="prob-name">{label}</span>
                      <div className="prob-bar-track">
                        <div
                          className="prob-bar-fill"
                          style={{ width: `${Math.max(0, Math.min(100, p))}%` }}
                        />
                      </div>
                      <span className="prob-value">{p.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="probability-bars">
                {probOrder.map((k) => {
                  const label = k.charAt(0).toUpperCase() + k.slice(1)
                  const p = fallbackProbability[k]
                  return (
                    <div key={k} className={`prob-row prob-${k}`}>
                      <span className="prob-name">{label}</span>
                      <div className="prob-bar-track">
                        <div className="prob-bar-fill" style={{ width: `${p}%` }} />
                      </div>
                      <span className="prob-value">{p.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            )}
            {Array.isArray(prediction.feature_contributions) && prediction.feature_contributions.length > 0 ? (
              <div className="shap-section">
                <h4>Contribuciones SHAP por feature</h4>
                <p className="muted-text small">
                  Cada barra muestra el aporte de la feature a la probabilidad
                  de la clase predicha (<em>{prediction.resultado}</em>).
                  {' '}Rojo = la aumenta, verde = la disminuye. Lista ordenada
                  por magnitud de impacto.
                </p>
                {(() => {
                  const maxAbs = Math.max(
                    ...prediction.feature_contributions.map((c) => Math.abs(Number(c.contribution) || 0)),
                    1e-9,
                  )
                  return (
                    <ul className="shap-list">
                      {prediction.feature_contributions.map((c, i) => {
                        const val = Number(c.contribution) || 0
                        const widthPct = (Math.abs(val) / maxAbs) * 50
                        const isPos = val > 0
                        return (
                          <li key={`${c.feature}-${i}`} className="shap-row">
                            <span className="shap-name" title={c.feature}>{c.feature}</span>
                            <div className="shap-track">
                              <div
                                className={isPos ? 'shap-fill shap-pos' : 'shap-fill shap-neg'}
                                style={{ width: `${widthPct}%` }}
                                title={`${val.toFixed(4)}`}
                              />
                            </div>
                            <span className={`shap-value ${isPos ? 'shap-pos' : 'shap-neg'}`}>
                              {isPos ? '+' : ''}{val.toFixed(4)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )
                })()}
              </div>
            ) : null}
            {prediction.recomendacion ? (
              <p className="prediction-recommendation">{prediction.recomendacion}</p>
            ) : null}
            <p className="prediction-meta">
              <strong>Modelo:</strong> {prediction.model_version || '—'}
              {prediction.timestamp
                ? ` · ${new Date(prediction.timestamp).toLocaleString()}`
                : ''}
            </p>
          </div>
            )
          })()
        ) : null}
      </section>
    </div>
  )
}

function AdminView({ user, onLogout, onUserUpdated }) {
  const [activeNavIndex, setActiveNavIndex] = useState(0)
  const navItems = ROLE_CONFIG.administrador.nav
  const sectionLabel = navItems[activeNavIndex] || navItems[0]

  function renderSection() {
    switch (activeNavIndex) {
      case 0:
        return (
          <>
            <section className="welcome-banner card">
              <div>
                <p className="banner-kicker">Vista del administrador</p>
                <h1>Centro de control institucional</h1>
                <p className="banner-text">
                  Desde aqui puedes asignar roles, ver todos los usuarios del sistema,
                  activar o desactivar cuentas, y consultar el historial de cambios
                  realizados por administradores anteriores.
                </p>
              </div>
              <div className="welcome-chip">
                <span>{user.email}</span>
                <span>· {user.documento}</span>
              </div>
            </section>
            <AdminStatsPanel />
            <section className="card" style={{ marginTop: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem' }}>Actividad reciente</h3>
              <RecentActivity limit={5} />
            </section>
          </>
        )
      case 1:
        return <AdminUsersPanel currentUser={user} />
      case 2:
        return <AdminAuditPanel />
      case 3:
        return (
          <AdminComparativoErrorBoundary>
            <AdminComparativoSection />
          </AdminComparativoErrorBoundary>
        )
      case 4:
        return <AdminReportesSection />
      case 5:
        return (
          <AdminErrorBoundary section="Analisis del modelo">
            <AdminAnalysisPanel />
          </AdminErrorBoundary>
        )
      default:
        return null
    }
  }

  // Items de navegacion rapida para el command palette.
  // (Eliminado 2026-10-14: ya no usamos command palette.)

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      activeNavIndex={activeNavIndex}
      onNavSelect={setActiveNavIndex}
    >
      <Breadcrumbs
        items={[
          { label: 'Inicio', onClick: () => setActiveNavIndex(0) },
          { label: 'Administrador' },
          { label: sectionLabel },
        ]}
      />
      {renderSection()}
    </DashboardShell>
  )
}

function HomePage({ user, onLogout, onUserUpdated }) {
  if (user.role === 'administrador') {
    return <AdminView user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />
  }

  if (user.role === 'rector') {
    return <RectorView user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />
  }

  if (user.role === 'decano') {
    return <DeanView user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />
  }

  if (user.role === 'profesor') {
    return <ProfessorView user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />
  }

  return <StudentView user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />
}

function App() {
  const [session, setSession] = useState(loadSession)

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session))
      return
    }

    window.localStorage.removeItem(STORAGE_SESSION_KEY)
  }, [session])

  // Al montar, si hay token vigente, refresca la sesion desde /auth/me.
  // Si el token expiró o es inválido, limpia la sesion local.
  useEffect(() => {
    let cancelled = false
    apiMe().then((result) => {
      if (cancelled) return
      if (result.ok && result.user) {
        setSession(normalizeUser(result.user))
      } else if (result.status === 401) {
        apiLogout()
        setSession(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogin({ identifier, password }) {
    const result = await apiLogin({ identifier, password })

    if (!result.ok) {
      return { ok: false, message: result.message || 'No se pudo iniciar sesion.' }
    }

    const normalized = normalizeUser(result.user)
    setSession(normalized)

    const roleLabel = ROLE_CONFIG[normalized.role]?.label?.toLowerCase() || normalized.role
    return { ok: true, message: `Acceso correcto como ${roleLabel}.` }
  }

  async function handleRecover(identifier) {
    const result = await apiRecover(identifier.trim())
    if (!result.ok) {
      return {
        ok: false,
        message: result.message || 'No encontramos una cuenta con ese usuario.',
      }
    }
    return { ok: true, message: result.message }
  }

  function handleLogout() {
    apiLogout()
    setSession(null)
  }

  return (
    <ToastProvider>
      <SessionBanner token={getToken()} />
      <Routes>
        <Route path="/" element={<Navigate to={session ? '/inicio' : '/login'} replace />} />
        <Route
          path="/login"
          element={
            session ? <Navigate to="/inicio" replace /> : <LoginForm onLogin={handleLogin} />
          }
        />
        {/* El registro publico fue removido: los estudiantes se importan desde el backend.
            Redirigimos a /login por si alguien conserva un enlace antiguo. */}
        <Route path="/register" element={<Navigate to={session ? '/inicio' : '/login'} replace />} />
        <Route
          path="/forgot-password"
          element={
            session ? (
              <Navigate to="/inicio" replace />
            ) : (
              <ForgotPasswordForm onRecover={handleRecover} />
            )
          }
        />
        <Route
          path="/inicio"
          element={
            session ? (
              <HomePage
                user={session}
                onLogout={handleLogout}
                onUserUpdated={(updated) => setSession(normalizeUser(updated))}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={session ? '/inicio' : '/login'} replace />} />
      </Routes>
    </ToastProvider>
  )
}

export default App
