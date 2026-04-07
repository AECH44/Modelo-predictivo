import { useEffect, useState } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import './App.css'

const STORAGE_USERS_KEY = 'saberpro.users'
const STORAGE_SESSION_KEY = 'saberpro.session'

const PROGRAMS = {
  sistemas: 'Ingenieria de Sistemas',
  industrial: 'Ingenieria Industrial',
}

const EMPTY_VALUE = ''

const ROLE_CONFIG = {
  rector: {
    label: 'Rector',
    icon: '👑',
    department: 'Rectoria',
    topbarTitle: 'Panel Rector',
    topbarSubtitle: 'Universidad Nacional · Seguimiento institucional 2024',
    nav: ['Panel Rector', 'Metas estrategicas', 'Comparativo', 'Reportes'],
  },
  decano: {
    label: 'Decano',
    icon: '👨‍💼',
    department: 'Facultad de Ingenieria',
    topbarTitle: 'Dashboard Ejecutivo',
    topbarSubtitle: 'Analisis por programa academico',
    nav: ['Dashboard', 'Programas', 'Benchmarking', 'Indicadores'],
  },
  profesor: {
    label: 'Profesor',
    icon: '👨‍🏫',
    department: 'Vista Docente',
    topbarTitle: 'Desempeno de la cohorte',
    topbarSubtitle: 'Seguimiento academico de estudiantes',
    nav: ['Dashboard', 'Monitoreo', 'Alertas', 'Reportes'],
  },
  estudiante: {
    label: 'Estudiante',
    icon: '👨‍🎓',
    department: 'Portal Estudiantil',
    topbarTitle: 'Mi progreso',
    topbarSubtitle: 'Consulta personal y actualizacion de datos',
    nav: ['Mi resumen', 'Mi prediccion', 'Recomendaciones'],
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
    program: 'industrial',
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
    program: 'industrial',
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

const defaultUsers = [
  {
    username: 'Dra. Maria del Carmen',
    email: 'rector@saberpro.edu.co',
    age: '54',
    password: '123456',
    role: 'rector',
    program: 'all',
  },
  {
    username: 'Dr. Roberto Martinez',
    email: 'decano@saberpro.edu.co',
    age: '47',
    password: '123456',
    role: 'decano',
    program: 'sistemas',
  },
  {
    username: 'Prof. Carlos Lopez',
    email: 'profesor@saberpro.edu.co',
    age: '39',
    password: '123456',
    role: 'profesor',
    program: 'sistemas',
  },
  {
    username: 'Jhan Carlos Mesa',
    email: 'jhan.mesa@saberpro.edu.co',
    age: '24',
    password: '123456',
    role: 'estudiante',
    program: 'industrial',
    studentRecordId: 'stu-ind-02',
    semester: '',
    studyHours: '',
    englishLevel: '',
  },
]

const demoAccounts = [
  { role: 'Rector', email: 'rector@saberpro.edu.co', password: '123456' },
  { role: 'Decano', email: 'decano@saberpro.edu.co', password: '123456' },
  { role: 'Profesor', email: 'profesor@saberpro.edu.co', password: '123456' },
  { role: 'Estudiante', email: 'jhan.mesa@saberpro.edu.co', password: '123456' },
]

const LEGACY_REMOVED_EMAILS = new Set([
  'admin@saberpro.edu.co',
  'decano.sistemas@saberpro.edu.co',
  'decano.industrial@saberpro.edu.co',
  'profesor.sistemas@saberpro.edu.co',
  'profesor.industrial@saberpro.edu.co',
  'laura@saberpro.edu.co',
  'camila@saberpro.edu.co',
  'carlos.andres@saberpro.edu.co',
  'jhan.carlos@saberpro.edu.co',
])

const PROGRAM_OPTIONS = [
  { value: 'sistemas', label: 'Ingenieria de Sistemas' },
  { value: 'industrial', label: 'Ingenieria Industrial' },
]

const RECTOR_PROGRAM_OPTIONS = [
  { value: 'all', label: 'Ambas ingenierias' },
  ...PROGRAM_OPTIONS,
]

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
    username,
    email: normalizedEmail,
    age: String(user.age || '20'),
    password: user.password || '123456',
    role,
    program,
    studentRecordId: user.studentRecordId || null,
    semester: String(user.semester || user.currentSemester || '8'),
    studyHours: String(user.studyHours || '12'),
    englishLevel: user.englishLevel || 'B1',
  }
}

function mergeUsers(storedUsers) {
  const userMap = new Map()

  defaultUsers.map(normalizeUser).forEach((user) => {
    userMap.set(user.email, user)
  })

  storedUsers
    .map(normalizeUser)
    .filter((user) => !LEGACY_REMOVED_EMAILS.has(user.email))
    .forEach((user) => {
    userMap.set(user.email, user)
  })

  return [...userMap.values()]
}

function loadUsers() {
  const storedUsers = readStorage(STORAGE_USERS_KEY, [])
  return mergeUsers(storedUsers)
}

function loadSession() {
  const storedSession = readStorage(STORAGE_SESSION_KEY, null)
  return storedSession ? normalizeUser(storedSession) : null
}

function sanitizeUser(user) {
  return normalizeUser(user)
}

function getProgramLabel(program) {
  if (program === 'all') {
    return 'Vista institucional'
  }

  return PROGRAMS[program] || PROGRAMS.sistemas
}

function getStudentRecordForUser(user) {
  const matchedRecord = STUDENT_RECORDS.find(
    (record) => record.id === user.studentRecordId || record.email === user.email,
  )

  if (matchedRecord) {
    return {
      ...matchedRecord,
      name: user.username,
      age: user.age,
      semester: Number(user.semester || matchedRecord.semester),
      studyHours: Number(user.studyHours || matchedRecord.studyHours),
      englishLevel: user.englishLevel || matchedRecord.englishLevel,
      program: user.program || matchedRecord.program,
    }
  }

  return {
    id: user.studentRecordId || user.email,
    name: user.username,
    email: user.email,
    code: '',
    program: user.program,
    semester: '',
    age: user.age,
    predictedScore: '',
    actualScore: '',
    trend: '',
    risk: '',
    studyHours: '',
    englishLevel: user.englishLevel || '',
    strengths: [],
    recommendation: '',
  }
}

function getScopedStudents(user, selectedProgram = user.program) {
  if (user.role === 'rector' && selectedProgram === 'all') {
    return STUDENT_RECORDS
  }

  if (user.role === 'rector' || user.role === 'decano' || user.role === 'profesor') {
    return STUDENT_RECORDS.filter((record) => record.program === selectedProgram)
  }

  return [getStudentRecordForUser(user)]
}

function buildProgramSummary(program) {
  return {
    program,
    label: getProgramLabel(program),
    students: EMPTY_VALUE,
    averagePredicted: EMPTY_VALUE,
    averageActual: EMPTY_VALUE,
    highRisk: EMPTY_VALUE,
    topStudent: EMPTY_VALUE,
  }
}

function metricCardsForRole(user) {
  if (user.role === 'rector') {
    return [
      {
        icon: '🎓',
        value: EMPTY_VALUE,
        label: 'Total de estudiantes',
        detail: '',
        accent: 'indigo',
      },
      {
        icon: '📈',
        value: EMPTY_VALUE,
        label: 'Promedio institucional',
        detail: '',
        accent: 'cyan',
      },
      {
        icon: '⚠️',
        value: EMPTY_VALUE,
        label: 'Riesgo critico',
        detail: '',
        accent: 'rose',
      },
      {
        icon: '🏆',
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
        icon: '👥',
        value: EMPTY_VALUE,
        label: 'Estudiantes del programa',
        detail: '',
        accent: 'indigo',
      },
      {
        icon: '🎯',
        value: EMPTY_VALUE,
        label: 'Promedio predicho',
        detail: '',
        accent: 'cyan',
      },
      {
        icon: '⚠️',
        value: EMPTY_VALUE,
        label: 'Riesgo alto',
        detail: '',
        accent: 'rose',
      },
      {
        icon: '📚',
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
        icon: '👥',
        value: EMPTY_VALUE,
        label: 'Estudiantes en cohorte',
        detail: '',
        accent: 'indigo',
      },
      {
        icon: '📈',
        value: EMPTY_VALUE,
        label: 'Promedio predicho',
        detail: '',
        accent: 'cyan',
      },
      {
        icon: '🚨',
        value: EMPTY_VALUE,
        label: 'Casos criticos',
        detail: '',
        accent: 'rose',
      },
      {
        icon: '✅',
        value: EMPTY_VALUE,
        label: 'Riesgo bajo',
        detail: '',
        accent: 'lime',
      },
    ]
  }

  return [
    {
      icon: '🎯',
      value: EMPTY_VALUE,
      label: 'Mi puntaje predicho',
      detail: '',
      accent: 'indigo',
    },
    {
      icon: '📊',
      value: EMPTY_VALUE,
      label: 'Mi referencia real',
      detail: '',
      accent: 'cyan',
    },
    {
      icon: '⚠️',
      value: EMPTY_VALUE,
      label: 'Nivel de riesgo',
      detail: '',
      accent: 'rose',
    },
    {
      icon: '📘',
      value: EMPTY_VALUE,
      label: 'Horas de estudio',
      detail: '',
      accent: 'lime',
    },
  ]
}

function roleHomeTitle(user, selectedProgram = user.program) {
  if (user.role === 'rector') {
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
  if (user.role === 'rector') {
    return selectedProgram === 'all'
      ? 'Acceso agregado a las dos ingenierias evaluadas, con comparacion institucional y prioridades rectorales.'
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

function AuthLayout({ eyebrow, title, description, children }) {
  return (
    <div className="auth-page">
      <section className="auth-panel auth-spotlight">
        <div>
          <span className="auth-kicker">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
        </div>

        <div className="auth-demo-card demo-accounts-card">
          <p className="auth-demo-label">Cuentas de prueba</p>
          <div className="demo-accounts-list">
            {demoAccounts.map((account) => (
              <div className="demo-account-item" key={account.email}>
                <strong>{account.role}</strong>
                <span>{account.email}</span>
                <span>{account.password}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="auth-panel auth-card">{children}</section>
    </div>
  )
}

function LoginForm({ onLogin }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [feedback, setFeedback] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()

    const result = onLogin(formData)
    setFeedback(result)

    if (result.ok) {
      navigate('/inicio', { replace: true })
    }
  }

  return (
    <AuthLayout
      eyebrow="Inicio de sesion"
      title="Acceso por rol"
      description="Cada perfil entra a una vista diferente: rector, decano, profesor o estudiante."
    >
      <div className="auth-form-header">
        <h2>Bienvenido</h2>
        <p>Inicia sesion con la cuenta del rol que quieras revisar.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="login-email">
          Correo
        </label>
        <input
          id="login-email"
          className="auth-input"
          type="email"
          placeholder="nombre@correo.com"
          value={formData.email}
          onChange={(event) =>
            setFormData((current) => ({ ...current, email: event.target.value }))
          }
          required
        />

        <label className="auth-label" htmlFor="login-password">
          Contrasena
        </label>
        <input
          id="login-password"
          className="auth-input"
          type="password"
          placeholder="Minimo 6 caracteres"
          value={formData.password}
          onChange={(event) =>
            setFormData((current) => ({ ...current, password: event.target.value }))
          }
          required
        />

        {feedback ? (
          <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
            {feedback.message}
          </p>
        ) : null}

        <button className="auth-button" type="submit">
          Iniciar sesion
        </button>
      </form>

      <div className="auth-links">
        <NavLink to="/register">Crear cuenta de estudiante</NavLink>
        <NavLink to="/forgot-password">Olvide mi contrasena</NavLink>
      </div>
    </AuthLayout>
  )
}

function RegisterForm({ onRegister }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    age: '',
    password: '',
    program: 'sistemas',
  })
  const [feedback, setFeedback] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()

    const result = onRegister(formData)
    setFeedback(result)

    if (result.ok) {
      navigate('/inicio', { replace: true })
    }
  }

  return (
    <AuthLayout
      eyebrow="Registro"
      title="Registro estudiantil"
      description="El registro crea una cuenta de estudiante y solo permite escoger entre Ingenieria de Sistemas o Industrial."
    >
      <div className="auth-form-header">
        <h2>Nueva cuenta</h2>
        <p>Este formulario crea usuarios con vista exclusiva de estudiante.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="register-username">
          Nombre de usuario
        </label>
        <input
          id="register-username"
          className="auth-input"
          type="text"
          placeholder="Tu nombre"
          value={formData.username}
          onChange={(event) =>
            setFormData((current) => ({ ...current, username: event.target.value }))
          }
          required
        />

        <label className="auth-label" htmlFor="register-email">
          Correo
        </label>
        <input
          id="register-email"
          className="auth-input"
          type="email"
          placeholder="nombre@correo.com"
          value={formData.email}
          onChange={(event) =>
            setFormData((current) => ({ ...current, email: event.target.value }))
          }
          required
        />

        <label className="auth-label" htmlFor="register-age">
          Edad
        </label>
        <input
          id="register-age"
          className="auth-input"
          type="number"
          min="14"
          max="99"
          placeholder="Ej. 21"
          value={formData.age}
          onChange={(event) =>
            setFormData((current) => ({ ...current, age: event.target.value }))
          }
          required
        />

        <label className="auth-label" htmlFor="register-program">
          Carrera
        </label>
        <select
          id="register-program"
          className="auth-input auth-select"
          value={formData.program}
          onChange={(event) =>
            setFormData((current) => ({ ...current, program: event.target.value }))
          }
        >
          <option value="sistemas">Ingenieria de Sistemas</option>
          <option value="industrial">Ingenieria Industrial</option>
        </select>

        <label className="auth-label" htmlFor="register-password">
          Contrasena
        </label>
        <input
          id="register-password"
          className="auth-input"
          type="password"
          placeholder="Minimo 6 caracteres"
          value={formData.password}
          onChange={(event) =>
            setFormData((current) => ({ ...current, password: event.target.value }))
          }
          required
        />

        {feedback ? (
          <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
            {feedback.message}
          </p>
        ) : null}

        <button className="auth-button" type="submit">
          Registrarme e iniciar sesion
        </button>
      </form>

      <div className="auth-links single-link">
        <NavLink to="/login">Ya tengo cuenta</NavLink>
      </div>
    </AuthLayout>
  )
}

function ForgotPasswordForm({ onRecover }) {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    setFeedback(onRecover(email))
  }

  return (
    <AuthLayout
      eyebrow="Recuperacion"
      title="Recupera el acceso"
      description="El flujo sigue siendo basico, pero ahora valida la cuenta segun el rol registrado."
    >
      <div className="auth-form-header">
        <h2>Olvide mi contrasena</h2>
        <p>Ingresa tu correo para confirmar que existe en el sistema local.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="forgot-email">
          Correo registrado
        </label>
        <input
          id="forgot-email"
          className="auth-input"
          type="email"
          placeholder="nombre@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {feedback ? (
          <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
            {feedback.message}
          </p>
        ) : null}

        <button className="auth-button" type="submit">
          Validar correo
        </button>
      </form>

      <div className="auth-links single-link">
        <NavLink to="/login">Volver al login</NavLink>
      </div>
    </AuthLayout>
  )
}

function DashboardShell({
  user,
  onLogout,
  children,
  searchPlaceholder = 'Buscar estudiante...',
  topbarControls = null,
}) {
  const navigate = useNavigate()
  const roleSettings = ROLE_CONFIG[user.role] || ROLE_CONFIG.estudiante

  function handleLogout() {
    onLogout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="logo-name">Saber Pro</div>
          <div className="logo-sub">PREDICTOR IA</div>
          <div className="logo-dept">{roleSettings.department}</div>
        </div>

        <nav className="sidebar-nav">
          {roleSettings.nav.map((label, index) => (
            <button className={`nav-item ${index === 0 ? 'active' : ''}`} key={label} type="button">
              <span className="nav-icon">{index === 0 ? roleSettings.icon : '•'}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="user-card">
          <div className="user-avatar">{roleSettings.icon}</div>
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
        <header className="topbar">
          <div>
            <div className="topbar-title">{roleSettings.topbarTitle}</div>
            <div className="topbar-sub">{roleSettings.topbarSubtitle}</div>
          </div>
          <div className="topbar-actions">
            {user.role !== 'estudiante' ? (
              <div className="search-box">
                <span>🔍</span>
                <input type="text" placeholder={searchPlaceholder} />
              </div>
            ) : null}
            {topbarControls}
            <button className="logout-button" type="button" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </header>

        <div className="content-area">{children}</div>
      </main>
    </div>
  )
}

function MetricsGrid({ user, records, selectedProgram }) {
  return (
    <section className="grid-4">
      {metricCardsForRole(user, records, selectedProgram).map((metric) => (
        <article className={`kpi-card ${metric.accent}`} key={metric.label}>
          <div className="kpi-icon">{metric.icon}</div>
          <div className="kpi-value">{metric.value}</div>
          <div className="kpi-label">{metric.label}</div>
          <div className="kpi-delta">{metric.detail}</div>
        </article>
      ))}
    </section>
  )
}

function RectorView({ user, onLogout }) {
  const [selectedProgram, setSelectedProgram] = useState('all')
  const records = getScopedStudents(user, selectedProgram)
  const summaries = ['sistemas', 'industrial'].map(buildProgramSummary)
  const visibleSummaries =
    selectedProgram === 'all'
      ? summaries
      : summaries.filter((summary) => summary.program === selectedProgram)
  const topbarControls = (
    <select
      className="topbar-select"
      value={selectedProgram}
      onChange={(event) => setSelectedProgram(event.target.value)}
    >
      {RECTOR_PROGRAM_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      searchPlaceholder="Buscar programa o estudiante..."
      topbarControls={topbarControls}
    >
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Vision institucional</p>
          <h1>{roleHomeTitle(user, selectedProgram)}</h1>
          <p className="banner-text">{roleHomeText(user, selectedProgram)}</p>
        </div>
        <div className="welcome-chip">
          <span>{selectedProgram === 'all' ? '2 ingenierias evaluadas' : getProgramLabel(selectedProgram)}</span>
          <span></span>
        </div>
      </section>

      <MetricsGrid user={user} records={records} selectedProgram={selectedProgram} />

      <section className="grid-2 content-grid-dashboard">
        <article className="card">
          <div className="section-header">
            <h2>Desempeno por programa</h2>
            <span className="live-chip">Institucional</span>
          </div>
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
            </tbody>
          </table>
        </article>

        <article className="card">
          <div className="section-header compact">
            <h2>Prioridades rectorales</h2>
          </div>
          <div className="report-cards">
            <article className="report-card">
              <h3>Calidad academica</h3>
              <p></p>
            </article>
            <article className="report-card">
              <h3>Intervencion focalizada</h3>
              <p></p>
            </article>
            <article className="report-card">
              <h3>Cobertura del modelo</h3>
              <p></p>
            </article>
          </div>
        </article>
      </section>
    </DashboardShell>
  )
}

function DeanView({ user, onLogout }) {
  const [selectedProgram, setSelectedProgram] = useState(user.program || 'sistemas')
  const records = getScopedStudents(user, selectedProgram)
  const sortedRecords = records.slice().sort((left, right) => right.predictedScore - left.predictedScore)
  const topbarControls = (
    <select
      className="topbar-select"
      value={selectedProgram}
      onChange={(event) => setSelectedProgram(event.target.value)}
    >
      {PROGRAM_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  return (
    <DashboardShell user={user} onLogout={onLogout} topbarControls={topbarControls}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Vista del decano</p>
          <h1>{roleHomeTitle(user, selectedProgram)}</h1>
          <p className="banner-text">{roleHomeText(user, selectedProgram)}</p>
        </div>
        <div className="welcome-chip">
          <span>{getProgramLabel(selectedProgram)}</span>
          <span></span>
        </div>
      </section>

      <MetricsGrid
        user={{ ...user, program: selectedProgram }}
        records={records}
        selectedProgram={selectedProgram}
      />

      <section className="grid-2 content-grid-dashboard">
        <article className="card">
          <div className="section-header">
            <h2>Ranking de estudiantes del programa</h2>
            <span className="live-chip">Filtrado</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Codigo</th>
                <th>Pred.</th>
                <th>Tendencia</th>
                <th>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td className="table-code">{record.code}</td>
                  <td className="table-score">{record.predictedScore}</td>
                  <td>{record.trend}</td>
                  <td>{record.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <div className="section-header compact">
            <h2>Lectura ejecutiva</h2>
          </div>
          <div className="report-cards">
            <article className="report-card">
              <h3>Programa asignado</h3>
              <p></p>
            </article>
            <article className="report-card">
              <h3>Mejor estudiante visible</h3>
              <p></p>
            </article>
            <article className="report-card">
              <h3>Accion recomendada</h3>
              <p></p>
            </article>
          </div>
        </article>
      </section>
    </DashboardShell>
  )
}

function ProfessorView({ user, onLogout }) {
  const [selectedProgram, setSelectedProgram] = useState(user.program || 'sistemas')
  const records = getScopedStudents(user, selectedProgram)
  const topbarControls = (
    <select
      className="topbar-select"
      value={selectedProgram}
      onChange={(event) => setSelectedProgram(event.target.value)}
    >
      {PROGRAM_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  return (
    <DashboardShell user={user} onLogout={onLogout} topbarControls={topbarControls}>
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

      <MetricsGrid
        user={{ ...user, program: selectedProgram }}
        records={records}
        selectedProgram={selectedProgram}
      />

      <section className="grid-2 content-grid-dashboard">
        <article className="card">
          <div className="section-header">
            <h2>Seguimiento individual</h2>
            <span className="live-chip">Docente</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Codigo</th>
                <th>Pred.</th>
                <th>Riesgo</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.name}</td>
                  <td className="table-code">{record.code}</td>
                  <td className="table-score">{record.predictedScore}</td>
                  <td>{record.risk}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <div className="section-header compact">
            <h2>Alertas y recomendaciones</h2>
          </div>
          <div className="report-cards">
            <article className="report-card">
              <h3>Criticos</h3>
              <p></p>
            </article>
            <article className="report-card">
              <h3>Seguimiento activo</h3>
              <p></p>
            </article>
            <article className="report-card">
              <h3>Consejo pedagogico</h3>
              <p></p>
            </article>
          </div>
        </article>
      </section>
    </DashboardShell>
  )
}

function StudentView({ user, onLogout, onProfileUpdate }) {
  const studentRecord = getStudentRecordForUser(user)
  const [formData, setFormData] = useState({
    username: user.username,
    age: user.age,
    program: user.program,
    semester: user.semester,
    studyHours: user.studyHours,
    englishLevel: user.englishLevel,
  })
  const [feedback, setFeedback] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    const result = onProfileUpdate(formData)
    setFeedback(result)
  }

  return (
    <DashboardShell user={user} onLogout={onLogout} searchPlaceholder="">
      <section className="welcome-banner card student-banner">
        <div>
          <p className="banner-kicker">Vista del estudiante</p>
          <h1>{roleHomeTitle(user)}</h1>
          <p className="banner-text">{roleHomeText(user)}</p>
        </div>
        <div className="welcome-chip">
          <span>{getProgramLabel(studentRecord.program)}</span>
          <span></span>
        </div>
      </section>

      <MetricsGrid user={user} records={[studentRecord]} selectedProgram={user.program} />

      <section className="grid-2 content-grid-dashboard student-layout">
        <article className="card">
          <div className="section-header">
            <h2>Mi resultado y recomendaciones</h2>
            <span></span>
          </div>
          <div className="student-score-box">
            <div className="student-score-value">{studentRecord.predictedScore}</div>
            <div className="student-score-meta"></div>
          </div>
          <div className="student-data-list">
            <div className="student-data-row">
              <span>Mi resultado real de referencia</span>
              <strong>{studentRecord.actualScore}</strong>
            </div>
            <div className="student-data-row">
              <span>Tendencia</span>
              <strong>{studentRecord.trend}</strong>
            </div>
            <div className="student-data-row">
              <span>Fortalezas</span>
              <strong>{studentRecord.strengths.join(', ')}</strong>
            </div>
          </div>
          <div className="next-step-box student-note">
            <p className="next-step-kicker">Recomendacion personal</p>
            <p>{studentRecord.recommendation}</p>
          </div>
        </article>

        <article className="card">
          <div className="section-header compact">
            <h2>Actualizar mis datos</h2>
          </div>
          <form className="profile-form" onSubmit={handleSubmit}>
            <label className="auth-label" htmlFor="student-name">
              Nombre
            </label>
            <input
              id="student-name"
              className="auth-input"
              type="text"
              value={formData.username}
              onChange={(event) =>
                setFormData((current) => ({ ...current, username: event.target.value }))
              }
              required
            />

            <label className="auth-label" htmlFor="student-age">
              Edad
            </label>
            <input
              id="student-age"
              className="auth-input"
              type="number"
              min="14"
              max="99"
              value={formData.age}
              onChange={(event) =>
                setFormData((current) => ({ ...current, age: event.target.value }))
              }
              required
            />

            <label className="auth-label" htmlFor="student-semester">
              Semestre actual
            </label>
            <input
              id="student-semester"
              className="auth-input"
              type="number"
              min="1"
              max="12"
              value={formData.semester}
              onChange={(event) =>
                setFormData((current) => ({ ...current, semester: event.target.value }))
              }
              required
            />

            <label className="auth-label" htmlFor="student-program">
              Carrera
            </label>
            <select
              id="student-program"
              className="auth-input auth-select"
              value={formData.program}
              onChange={(event) =>
                setFormData((current) => ({ ...current, program: event.target.value }))
              }
            >
              {PROGRAM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="auth-label" htmlFor="student-hours">
              Horas de estudio por semana
            </label>
            <input
              id="student-hours"
              className="auth-input"
              type="number"
              min="1"
              max="60"
              value={formData.studyHours}
              onChange={(event) =>
                setFormData((current) => ({ ...current, studyHours: event.target.value }))
              }
              required
            />

            <label className="auth-label" htmlFor="student-english">
              Nivel de ingles
            </label>
            <select
              id="student-english"
              className="auth-input auth-select"
              value={formData.englishLevel}
              onChange={(event) =>
                setFormData((current) => ({ ...current, englishLevel: event.target.value }))
              }
            >
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
            </select>

            <div className="readonly-box">
              <div className="student-data-row">
                <span>Correo</span>
                <strong>{user.email}</strong>
              </div>
            </div>

            {feedback ? (
              <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
                {feedback.message}
              </p>
            ) : null}

            <button className="auth-button" type="submit">
              Guardar mis datos
            </button>
          </form>
        </article>
      </section>
    </DashboardShell>
  )
}

function HomePage({ user, onLogout, onProfileUpdate }) {
  if (user.role === 'rector') {
    return <RectorView user={user} onLogout={onLogout} />
  }

  if (user.role === 'decano') {
    return <DeanView user={user} onLogout={onLogout} />
  }

  if (user.role === 'profesor') {
    return <ProfessorView user={user} onLogout={onLogout} />
  }

  return <StudentView user={user} onLogout={onLogout} onProfileUpdate={onProfileUpdate} />
}

function App() {
  const [users, setUsers] = useState(loadUsers)
  const [session, setSession] = useState(loadSession)
  const effectiveUsers = mergeUsers(users)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(effectiveUsers))
  }, [effectiveUsers])

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session))
      return
    }

    window.localStorage.removeItem(STORAGE_SESSION_KEY)
  }, [session])

  function handleLogin({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase()
    const matchedUser = effectiveUsers.find((user) => user.email === normalizedEmail)

    if (!matchedUser) {
      return {
        ok: false,
        message: 'No existe una cuenta registrada con ese correo.',
      }
    }

    if (matchedUser.password !== password) {
      return {
        ok: false,
        message: 'La contrasena es incorrecta.',
      }
    }

    setSession(sanitizeUser(matchedUser))

    return {
      ok: true,
      message: `Acceso correcto como ${ROLE_CONFIG[matchedUser.role].label.toLowerCase()}.`,
    }
  }

  function handleRegister({ username, email, age, password, program }) {
    const normalizedEmail = email.trim().toLowerCase()

    if (!username.trim() || !normalizedEmail || !age.trim() || !password.trim()) {
      return {
        ok: false,
        message: 'Todos los campos son obligatorios.',
      }
    }

    if (effectiveUsers.some((user) => user.email === normalizedEmail)) {
      return {
        ok: false,
        message: 'Ese correo ya esta registrado.',
      }
    }

    if (password.trim().length < 6) {
      return {
        ok: false,
        message: 'La contrasena debe tener al menos 6 caracteres.',
      }
    }

    const studentPrefix = program === 'industrial' ? 'IND' : 'SIS'
    const newStudentId = `${studentPrefix}-${Date.now()}`
    const newUser = normalizeUser({
      username: username.trim(),
      email: normalizedEmail,
      age: age.trim(),
      password: password.trim(),
      role: 'estudiante',
      program,
      studentRecordId: newStudentId,
      semester: '8',
      studyHours: '12',
      englishLevel: 'B1',
    })

    setUsers([...effectiveUsers, newUser])
    setSession(sanitizeUser(newUser))

    return {
      ok: true,
      message: 'Registro completado como estudiante. Sesion iniciada.',
    }
  }

  function handleRecover(email) {
    const normalizedEmail = email.trim().toLowerCase()
    const matchedUser = effectiveUsers.find((user) => user.email === normalizedEmail)

    if (!matchedUser) {
      return {
        ok: false,
        message: 'No encontramos una cuenta con ese correo.',
      }
    }

    return {
      ok: true,
      message: `Correo validado. La cuenta pertenece al rol ${ROLE_CONFIG[matchedUser.role].label.toLowerCase()}.`,
    }
  }

  function handleLogout() {
    setSession(null)
  }

  function handleProfileUpdate(data) {
    if (!session || session.role !== 'estudiante') {
      return {
        ok: false,
        message: 'Solo los estudiantes pueden actualizar este formulario.',
      }
    }

    const updatedUser = sanitizeUser({
      ...session,
      ...data,
    })

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.email === session.email ? { ...user, ...updatedUser } : user,
      ),
    )
    setSession(updatedUser)

    return {
      ok: true,
      message: 'Tus datos personales fueron actualizados.',
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? '/inicio' : '/login'} replace />} />
      <Route
        path="/login"
        element={
          session ? <Navigate to="/inicio" replace /> : <LoginForm onLogin={handleLogin} />
        }
      />
      <Route
        path="/register"
        element={
          session ? (
            <Navigate to="/inicio" replace />
          ) : (
            <RegisterForm onRegister={handleRegister} />
          )
        }
      />
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
              onProfileUpdate={handleProfileUpdate}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={session ? '/inicio' : '/login'} replace />} />
    </Routes>
  )
}

export default App
