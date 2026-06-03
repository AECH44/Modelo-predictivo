import { useEffect, useState } from 'react'
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
  apiGetAdminStats,
  apiGetCohort,
  apiGetGoogleAuthUrl,
  apiGetStudentPredictions,
  apiGetStudentProfile,
  apiListAdminUsers,
  apiLogin,
  apiLogout,
  apiMe,
  apiRecover,
  apiSaveStudentProfile,
  apiUpdateAdminUser,
  apiUpdateProfile,
  apiUpsertAdminUser,
  setToken as apiSetToken,
} from './api.js'

const STORAGE_SESSION_KEY = 'saberpro.session'

const PROGRAMS = {
  sistemas: 'Ingenieria de Sistemas',
  industrial: 'Ingenieria Industrial',
}

const EMPTY_VALUE = ''

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
    nav: ['Panel Administrador', 'Usuarios', 'Auditoria', 'Comparativo', 'Reportes'],
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

// Las cuentas demo y los usuarios reales viven en la base de datos
// (tabla `usuarios`). El cliente no almacena correos ni contrasenas.

const PROGRAM_OPTIONS = [
  { value: 'sistemas', label: 'Ingenieria de Sistemas' },
  { value: 'industrial', label: 'Ingenieria Industrial' },
]

const RECTOR_PROGRAM_OPTIONS = [
  { value: 'all', label: 'Ambas ingenierias' },
  ...PROGRAM_OPTIONS,
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
      program: 'industrial',
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
      program: 'industrial',
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
      program: 'industrial',
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
  if (
    (user.role === 'rector' || user.role === 'administrador') &&
    selectedProgram === 'all'
  ) {
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

function StudentComparisonCard({ studentScore, comparison }) {
  const gap = studentScore - comparison.groupAverage
  const maxScore = Math.max(studentScore, comparison.groupAverage)

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
    } catch (err) {
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
          Usuario *
        </label>
        <input
          id="login-identifier"
          className="auth-input"
          type="text"
          placeholder="Correo o numero de documento"
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
          El sistema solo permite el ingreso con correo institucional
          <strong> @unac.edu.co</strong>. Si eres estudiante y aun no tienes
          credenciales, contacta a tu programa para que te sean asignadas.
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
        return
      }
      setPwFeedback({ ok: true, message: 'Contrasena actualizada.' })
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
  onUserUpdated,
  children,
  searchPlaceholder = 'Buscar estudiante...',
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
          {user.role !== 'estudiante' ? (
            <div className="search-box">
              <span className="topbar-icon">
                <Icon name="search" size={16} />
              </span>
              <input type="text" placeholder={searchPlaceholder} />
            </div>
          ) : null}
          {topbarControls}
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
    setData((s) => ({ ...s, status: 'loading' }))
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
              <option value="all">Ambas ingenierias</option>
              <option value="sistemas">Ingenieria de Sistemas</option>
              <option value="industrial">Ingenieria Industrial</option>
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
                  render: (s) =>
                    s.clase ? (
                      <span
                        className={`risk-pill ${
                          s.clase === 'alto'
                            ? 'bajo'
                            : s.clase === 'bajo'
                              ? 'alto'
                              : 'medio'
                        }`}
                      >
                        {s.clase}
                      </span>
                    ) : (
                      'sin prediccion'
                    ),
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
  const [selectedProgram, setSelectedProgram] = useState('all')

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
      onUserUpdated={onUserUpdated}
      searchPlaceholder="Buscar programa o estudiante..."
      topbarControls={topbarControls}
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
    setState({ status: 'loading', students: [], metrics: null, error: null })
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

function pct(value) {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value * 100)}%`
}

function avgOf(list, fn) {
  const xs = list.map(fn).filter((v) => v !== null && v !== undefined && Number.isFinite(v))
  if (!xs.length) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function bucketize(students) {
  return {
    conPerfil: students.filter((s) => s.completed).length,
    conPrediccion: students.filter((s) => s.puntajeEstimado !== null).length,
    sinPerfil: students.filter((s) => !s.completed).length,
    riesgoAlto: students.filter((s) => s.clase === 'alto').length,
    riesgoMedio: students.filter((s) => s.clase === 'medio').length,
    riesgoBajo: students.filter((s) => s.clase === 'bajo').length,
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
  const [visibleSummaries, setVisibleSummaries] = useState([])
  useEffect(() => {
    if (status !== 'ready') return
    const programs = selectedProgram === 'all' ? ['sistemas', 'industrial'] : [selectedProgram]
    const summaries = programs.map((program) => {
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
    setVisibleSummaries(summaries)
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
            {selectedProgram === 'all' ? '2 ingenierias evaluadas' : getProgramLabel(selectedProgram)}
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
  const riesgoAlto = inScope.filter((s) => s.clase === 'alto').length
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
          : 'Todos los estudiantes en el ambito seleccionado ya tienen perfil completo.',
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
function RectorComparativoSection({ selectedProgram }) {
  const sistemas = useRectorCohort('sistemas')
  const industrial = useRectorCohort('industrial')
  const isReady = sistemas.status === 'ready' && industrial.status === 'ready'

  const programas = [
    { value: 'sistemas', label: 'Ingenieria de Sistemas', state: sistemas },
    { value: 'industrial', label: 'Ingenieria Industrial', state: industrial },
  ]
  const visible =
    selectedProgram === 'all' ? programas : programas.filter((p) => p.value === selectedProgram)

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Comparativo</p>
          <h1>Sistemas vs Industrial</h1>
          <p className="banner-text">
            Comparacion de las dos ingenierias evaluadas con la cohorte real.
            {selectedProgram !== 'all'
              ? ` Mostrando solo ${getProgramLabel(selectedProgram)}.`
              : ''}
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
                  <span className="label">Sin prediccion</span>
                  <span className="value">{b.conPerfil - b.conPrediccion}</span>
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
                        <span className={`risk-pill ${s.clase || 'bajo'}`}>
                          {s.clase || '—'}
                        </span>
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
  const [selectedProgram, setSelectedProgram] = useState(user.program || 'sistemas')
  // El decano inicia directamente en "Programas" (idx 0) para que pueda
  // escoger el programa y ver el listado de estudiantes con filtros.
  const [activeNavIndex, setActiveNavIndex] = useState(0)

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
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      topbarControls={topbarControls}
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
          <span>· {selectedProgram === 'sistemas' ? 'Ingenieria de Sistemas' : 'Ingenieria Industrial'}</span>
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
                    render: (s) =>
                      s.clase ? (
                        <span className={`risk-pill ${s.clase}`}>{s.clase}</span>
                      ) : (
                        '—'
                      ),
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

function DeanBenchmarkingSection({ user, selectedProgram }) {
  // El otro programa contra el que se compara.
  const other = selectedProgram === 'sistemas' ? 'industrial' : 'sistemas'
  const ownState = useRectorCohort(selectedProgram)
  const otherState = useRectorCohort(other)
  const isReady = ownState.status === 'ready' && otherState.status === 'ready'

  const fixed = user.program && user.program !== 'all' ? user.program : null
  const baseProgram = fixed || selectedProgram
  const baseState = fixed
    ? fixed === selectedProgram
      ? ownState
      : otherState
    : ownState

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <section className="welcome-banner card">
        <div>
          <p className="banner-kicker">Benchmarking</p>
          <h1>{getProgramLabel(baseProgram)} vs {getProgramLabel(other)}</h1>
          <p className="banner-text">
            Comparacion de los indicadores clave del programa bajo tu responsabilidad
            contra la otra ingenieria de la facultad.
          </p>
        </div>
      </section>

      {isReady ? (
        <>
          <article className="card">
            <div className="section-header compact">
              <h2>Comparativa de indicadores</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>{getProgramLabel(baseProgram)}</th>
                  <th>{getProgramLabel(other)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Estudiantes</td>
                  <td className="table-code">{baseState.students.length}</td>
                  <td className="table-code">
                    {fixed ? otherState.students.length : otherState.students.length}
                  </td>
                </tr>
                <tr>
                  <td>Con perfil completo</td>
                  <td className="table-code">{bucketize(baseState.students).conPerfil}</td>
                  <td className="table-code">{bucketize(otherState.students).conPerfil}</td>
                </tr>
                <tr>
                  <td>Con prediccion</td>
                  <td className="table-code">{bucketize(baseState.students).conPrediccion}</td>
                  <td className="table-code">{bucketize(otherState.students).conPrediccion}</td>
                </tr>
                <tr>
                  <td>Promedio estimado</td>
                  <td className="table-score">
                    {(() => {
                      const v = bucketize(baseState.students).promedioPuntaje
                      return v !== null ? Math.round(v) : '—'
                    })()}
                  </td>
                  <td className="table-score">
                    {(() => {
                      const v = bucketize(otherState.students).promedioPuntaje
                      return v !== null ? Math.round(v) : '—'
                    })()}
                  </td>
                </tr>
                <tr>
                  <td>Asistencia promedio</td>
                  <td className="table-code">
                    {(() => {
                      const v = bucketize(baseState.students).promedioAsistencia
                      return v !== null ? `${Math.round(v)}%` : '—'
                    })()}
                  </td>
                  <td className="table-code">
                    {(() => {
                      const v = bucketize(otherState.students).promedioAsistencia
                      return v !== null ? `${Math.round(v)}%` : '—'
                    })()}
                  </td>
                </tr>
                <tr>
                  <td>Riesgo alto</td>
                  <td className="table-code">{bucketize(baseState.students).riesgoAlto}</td>
                  <td className="table-code">{bucketize(otherState.students).riesgoAlto}</td>
                </tr>
              </tbody>
            </table>
          </article>

          <article className="card">
            <div className="section-header compact">
              <h2>Lectura del benchmarking</h2>
            </div>
            <DeanBenchmarkingReading
              baseLabel={getProgramLabel(baseProgram)}
              otherLabel={getProgramLabel(other)}
              base={bucketize(baseState.students)}
              other={bucketize(otherState.students)}
            />
          </article>
        </>
      ) : (
        <p className="student-interpretation">Cargando comparativa...</p>
      )}
    </section>
  )
}

function DeanBenchmarkingReading({ baseLabel, otherLabel, base, other }) {
  const brecha = base.riesgoAlto - other.riesgoAlto
  const coberturaBase = base.conPerfil
  const coberturaOther = other.conPerfil
  return (
    <div className="report-cards">
      <article className="report-card">
        <h3>Riesgo alto vs la otra ingenieria</h3>
        <p>
          {baseLabel} tiene {base.riesgoAlto} estudiantes en riesgo alto;
          {' '}{otherLabel} tiene {other.riesgoAlto}.
          {brecha > 0
            ? ` La brecha es de +${brecha} a favor de la otra carrera, lo que sugiere priorizar intervencion.`
            : brecha < 0
            ? ` La diferencia es favorable en ${-brecha} estudiantes respecto a la otra carrera.`
            : ' Estan empatados en este indicador.'}
        </p>
      </article>
      <article className="report-card">
        <h3>Cobertura de perfil</h3>
        <p>
          {coberturaBase} estudiantes del programa bajo tu responsabilidad ya
          completaron el perfil, contra {coberturaOther} del otro. La
          diferencia es {coberturaBase - coberturaOther >= 0 ? 'positiva' : 'negativa'} en {Math.abs(coberturaBase - coberturaOther)}.
        </p>
      </article>
      <article className="report-card">
        <h3>Accion recomendada</h3>
        <p>
          {brecha > 0 || coberturaBase < coberturaOther
            ? 'Priorizar el cierre de perfiles pendientes y reforzar el acompanimiento a los estudiantes en riesgo alto.'
            : 'Mantener el ritmo actual y aprovechar la buena cobertura para enfocarse en la calidad del modelo predictivo.'}
        </p>
      </article>
    </div>
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
                  <span className="label">Sin prediccion</span>
                  <span className="value">{b.conPerfil - b.conPrediccion}</span>
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
              <span className={`risk-pill ${s.clase || 'bajo'}`}>{s.clase || '—'}</span>
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
  const [selectedProgram, setSelectedProgram] = useState(user.program || 'sistemas')
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
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      topbarControls={topbarControls}
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
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

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

  async function handleSaveUpdate(payload) {
    setSaving(true)
    setSaveError(null)
    try {
      const result = await apiSaveStudentProfile(payload)
      if (!result.ok) {
        setSaveError(result.message || 'No se pudo guardar.')
        return
      }
      setState((s) => ({
        ...s,
        profile: result.profile,
        prediction: result.prediction,
        predictions: [result.prediction, ...(s.predictions || [])],
      }))
      setEditing(false)
    } finally {
      setSaving(false)
    }
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

  if (editing) {
    return (
      <DashboardShell
        user={user}
        onLogout={onLogout}
        onUserUpdated={onUserUpdated}
        searchPlaceholder=""
        customNav={studentSections}
        activeNavIndex={activeSectionIndex}
        onNavSelect={setActiveSectionIndex}
      >
        <section className="onboarding-wrap card">
          <div className="onboarding-header">
            <p className="banner-kicker">Actualizar mis datos</p>
            <h1>Edita tu perfil y vuelve a calcular tu prediccion</h1>
            <p className="banner-text">
              Cualquier cambio guardado generara una nueva prediccion y quedara
              registrado en tu historial.
            </p>
          </div>
          <StudentProfileForm
            initialValues={profileToForm(profile)}
            onSubmit={handleSaveUpdate}
            onCancel={() => {
              setEditing(false)
              setSaveError(null)
            }}
            busy={saving}
            error={saveError}
          />
        </section>
      </DashboardShell>
    )
  }

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
            Mostrando tu informacion personalizada calculada por el modelo predictivo
            con los datos que registraste.
          </p>
        </div>
        <button
          type="button"
          className="auth-button auth-button-secondary"
          onClick={() => setEditing(true)}
        >
          Actualizar mis datos
        </button>
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
                  Puntaje estimado · clase{' '}
                  <strong>{prediction?.clase ?? '—'}</strong> · confianza{' '}
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
                    Aun no tenemos prediccion. Pulsa "Actualizar mis datos".
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
                Clase {prediction?.clase ?? '—'} · {prediction?.puntajeEstimado ?? '—'} puntos
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
                  ? `Tu desempeno proyectado se ubica en la clase ${prediction.clase} con un puntaje estimado de ${prediction.puntajeEstimado}. El modelo asigna una confianza del ${Math.round(
                      (prediction.probabilidad || 0) * 100,
                    )}% a esta clasificacion.`
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
  { value: 'profesor', label: 'Profesor' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'estudiante', label: 'Estudiante' },
]

const ADMIN_PROGRAM_OPTIONS = [
  { value: 'sistemas', label: 'Sistemas' },
  { value: 'industrial', label: 'Industrial' },
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

function AdminComparativoSection() {
  const [sis, setSis] = useState({ status: 'loading', metrics: null, students: [], error: null })
  const [ind, setInd] = useState({ status: 'loading', metrics: null, students: [], error: null })

  useEffect(() => {
    let alive = true
    Promise.all([apiGetCohort('sistemas'), apiGetCohort('industrial')])
      .then(([sisRes, indRes]) => {
        if (!alive) return
        setSis({
          status: sisRes.ok ? 'ready' : 'error',
          metrics: sisRes.metrics || null,
          students: sisRes.students || [],
          error: sisRes.ok ? null : sisRes.message || 'Error',
        })
        setInd({
          status: indRes.ok ? 'ready' : 'error',
          metrics: indRes.metrics || null,
          students: indRes.students || [],
          error: indRes.ok ? null : indRes.message || 'Error',
        })
      })
      .catch((err) => {
        if (!alive) return
        setSis({ status: 'error', metrics: null, students: [], error: err.message || 'Error de red' })
        setInd({ status: 'error', metrics: null, students: [], error: err.message || 'Error de red' })
      })
    return () => {
      alive = false
    }
  }, [])

  function metricRow(label, sisVal, indVal) {
    return (
      <tr key={label}>
        <td>{label}</td>
        <td className="table-code">{sisVal ?? '—'}</td>
        <td className="table-code">{indVal ?? '—'}</td>
      </tr>
    )
  }

  function buildRows(metrics) {
    if (!metrics) return []
    return [
      { label: 'Estudiantes con perfil', value: metrics.conPerfil },
      { label: 'Estudiantes con prediccion', value: metrics.conPrediccion },
      { label: 'Sin perfil', value: metrics.sinPerfil },
      { label: 'Riesgo alto', value: metrics.riesgoAlto },
      { label: 'Riesgo medio', value: metrics.riesgoMedio },
      { label: 'Riesgo bajo', value: metrics.riesgoBajo },
      {
        label: 'Promedio estimado (puntaje)',
        value:
          metrics.promedioPuntaje !== null && metrics.promedioPuntaje !== undefined
            ? Math.round(metrics.promedioPuntaje)
            : '—',
      },
    ]
  }

  const sisRows = buildRows(sis.metrics)
  const indRows = buildRows(ind.metrics)

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Comparativo institucional</p>
          <h2>Sistemas vs Industrial</h2>
        </div>
      </div>
      <article className="card">
        <div className="section-header compact">
          <h2>Metricas comparadas</h2>
        </div>
        {sis.status === 'loading' || ind.status === 'loading' ? (
          <p className="student-interpretation">Cargando cohortes...</p>
        ) : null}
        {sis.status === 'error' ? (
          <p className="auth-feedback error">Sistemas: {sis.error}</p>
        ) : null}
        {ind.status === 'error' ? (
          <p className="auth-feedback error">Industrial: {ind.error}</p>
        ) : null}
        {sis.status === 'ready' && ind.status === 'ready' ? (
          (sis.metrics?.conPerfil === 0 && ind.metrics?.conPerfil === 0) ? (
            <div className="data-table-empty">
              <p>Aun no hay estudiantes con perfil completado en ninguno de los dos programas.</p>
              <p className="student-interpretation" style={{ marginTop: '0.5rem' }}>
                Cuando los estudiantes diligencien su formulario de onboarding, podras ver aqui
                el comparativo de metricas entre Sistemas e Industrial.
              </p>
            </div>
          ) : (
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Sistemas</th>
                <th>Industrial</th>
              </tr>
            </thead>
            <tbody>
              {metricRow('Estudiantes con perfil', sis.metrics?.conPerfil, ind.metrics?.conPerfil)}
              {metricRow('Estudiantes con prediccion', sis.metrics?.conPrediccion, ind.metrics?.conPrediccion)}
              {metricRow('Sin perfil', sis.metrics?.sinPerfil, ind.metrics?.sinPerfil)}
              {metricRow('Riesgo alto', sis.metrics?.riesgoAlto, ind.metrics?.riesgoAlto)}
              {metricRow('Riesgo medio', sis.metrics?.riesgoMedio, ind.metrics?.riesgoMedio)}
              {metricRow('Riesgo bajo', sis.metrics?.riesgoBajo, ind.metrics?.riesgoBajo)}
              {metricRow(
                'Promedio estimado (puntaje)',
                sis.metrics?.promedioPuntaje !== null && sis.metrics?.promedioPuntaje !== undefined
                  ? Math.round(sis.metrics.promedioPuntaje)
                  : '—',
                ind.metrics?.promedioPuntaje !== null && ind.metrics?.promedioPuntaje !== undefined
                  ? Math.round(ind.metrics.promedioPuntaje)
                  : '—',
              )}
            </tbody>
          </table>
          )
        ) : null}
      </article>
    </section>
  )
}

function AdminReportesSection() {
  const [status, setStatus] = useState('loading')
  const [students, setStudents] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setStatus('loading')
    apiGetCohort('all')
      .then((res) => {
        if (!alive) return
        if (!res.ok) {
          setError(res.message || 'No se pudo cargar la cohorte.')
          setStatus('error')
          return
        }
        setStudents(res.students || [])
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message || 'Error de red.')
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [])

  function exportCsv() {
    const headers = [
      'documento',
      'nombre',
      'email',
      'programa',
      'rol',
      'clase',
      'puntaje_estimado',
      'probabilidad',
      'activo',
    ]
    const rows = students.map((s) => [
      s.documento || '',
      s.username || '',
      s.email || '',
      s.program || '',
      s.role || '',
      s.clase || '',
      s.puntajeEstimado ?? '',
      s.probabilidad ?? '',
      s.isActive === false ? 'no' : 'si',
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
    a.download = `cohorte_saberpro_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const totalActivos = students.filter((s) => s.isActive !== false).length
  const totalConPrediccion = students.filter((s) => s.puntajeEstimado !== null && s.puntajeEstimado !== undefined).length

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Reportes</p>
          <h2>Exportacion de la cohorte</h2>
        </div>
        <div className="filter-group" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="auth-button"
            type="button"
            onClick={exportCsv}
            disabled={status !== 'ready' || students.length === 0}
          >
            <Icon name="download" size={16} />
            Exportar CSV
          </button>
        </div>
      </div>
      {status === 'loading' ? <p className="student-interpretation">Cargando cohorte...</p> : null}
      {status === 'error' ? <p className="auth-feedback error">{error}</p> : null}
      {status === 'ready' ? (
        <div className="cohort-metrics-grid">
          <div className="cohort-metric-card">
            <span className="label">Total de estudiantes</span>
            <span className="value">{students.length}</span>
            <span className="hint">Cuentas con rol estudiante</span>
          </div>
          <div className="cohort-metric-card">
            <span className="label">Cuentas activas</span>
            <span className="value">{totalActivos}</span>
            <span className="hint">Con acceso al sistema</span>
          </div>
          <div className="cohort-metric-card">
            <span className="label">Con prediccion</span>
            <span className="value">{totalConPrediccion}</span>
            <span className="hint">Han completado el perfil</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function AdminStatsPanel() {
  const [status, setStatus] = useState('loading')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
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
              <tr>
                <td>Industrial</td>
                <td className="table-code">{byProgram?.industrial ?? 0}</td>
              </tr>
              <tr>
                <td>Todas (all)</td>
                <td className="table-code">{byProgram?.all ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>
  )
}

function UserUpsertModal({ initialUser, currentUser, onClose, onSaved }) {
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
    if (user.isActive) {
      const ok = window.confirm(
        `Desactivar a ${user.username}? No podra iniciar sesion hasta que lo reactives.`,
      )
      if (!ok) return
    }
    setBusy(true)
    try {
      const res = user.isActive
        ? await apiDeactivateAdminUser(user.id)
        : await apiActivateAdminUser(user.id)
      if (!res.ok) {
        window.alert(res.message || 'Operacion no completada.')
        return
      }
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

function AdminAuditPanel() {
  const [status, setStatus] = useState('loading')
  const [entries, setEntries] = useState([])
  const [filterEmail, setFilterEmail] = useState('')
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    apiGetAdminAudit({
      limit: 200,
      offset: 0,
      adminEmail: filterEmail || undefined,
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
  }, [filterEmail, refreshKey])

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <div className="cohort-toolbar">
        <div>
          <p className="banner-kicker">Auditoria</p>
          <h2>Historial de acciones administrativas</h2>
        </div>
        <div className="filter-group" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="auth-button-secondary"
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refrescar
          </button>
        </div>
      </div>

      <div className="cohort-toolbar" style={{ gap: '0.75rem' }}>
        <input
          className="auth-input"
          type="search"
          placeholder="Filtrar por email del administrador"
          value={filterEmail}
          onChange={(e) => setFilterEmail(e.target.value)}
          style={{ minWidth: 280 }}
        />
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
                render: (e) => <span className="risk-pill bajo">{e.accion}</span>,
              },
              {
                key: 'targetDocumento',
                label: 'Documento objetivo',
                className: 'table-code',
                render: (e) => e.targetDocumento || '—',
              },
              {
                key: 'detalles',
                label: 'Detalles',
                render: (e) => (
                  <details>
                    <summary style={{ cursor: 'pointer' }}>ver</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', maxWidth: 480 }}>
                      {JSON.stringify(e.detalles || {}, null, 2)}
                    </pre>
                  </details>
                ),
              },
            ]}
          />
        </article>
      ) : null}
    </section>
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
          </>
        )
      case 1:
        return <AdminUsersPanel currentUser={user} />
      case 2:
        return <AdminAuditPanel />
      case 3:
        return <AdminComparativoSection />
      case 4:
        return <AdminReportesSection />
      default:
        return null
    }
  }

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      onUserUpdated={onUserUpdated}
      activeNavIndex={activeNavIndex}
      onNavSelect={setActiveNavIndex}
    >
      <p className="student-interpretation" style={{ margin: 0 }}>
        Seccion actual: <strong>{sectionLabel}</strong>
      </p>
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

  async function handleProfileUpdate(data) {
    if (!session || session.role !== 'estudiante') {
      return {
        ok: false,
        message: 'Solo los estudiantes pueden actualizar este formulario.',
      }
    }

    const result = await apiUpdateProfile({
      age: data.age,
      semester: data.semester,
      studyHours: data.studyHours,
      englishLevel: data.englishLevel,
      program: data.program,
    })

    if (!result.ok) {
      return { ok: false, message: result.message || 'No se pudo guardar el perfil.' }
    }

    setSession(normalizeUser(result.user))
    return { ok: true, message: 'Tus datos personales fueron actualizados.' }
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
  )
}

export default App
