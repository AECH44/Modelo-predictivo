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

function metricCardsForRole(user, records = []) {
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

  const currentRecord = records[0] || {}
  const studentPredicted = withFallback(currentRecord.predictedScore, STUDENT_DASHBOARD_MOCK.predictedScore)
  const studentActual = withFallback(currentRecord.actualScore, STUDENT_DASHBOARD_MOCK.actualScore)
  const studentRisk = withFallback(currentRecord.risk, STUDENT_DASHBOARD_MOCK.risk)
  const studentStudyHours = withFallback(currentRecord.studyHours, STUDENT_DASHBOARD_MOCK.studyHours)

  return [
    {
      icon: '🎯',
      value: studentPredicted,
      label: 'Mi puntaje predicho',
      detail: 'Proyeccion actual',
      accent: 'indigo',
    },
    {
      icon: '📊',
      value: studentActual,
      label: 'Mi referencia real',
      detail: 'Ultimo referente reportado',
      accent: 'cyan',
    },
    {
      icon: '⚠️',
      value: getRiskVisualMeta(studentRisk).label,
      label: 'Nivel de riesgo',
      detail: 'Semaforo academico',
      accent: 'rose',
    },
    {
      icon: '📘',
      value: `${studentStudyHours}h`,
      label: 'Horas de estudio',
      detail: 'Dedicacion semanal',
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
      icon: '🔴',
      tone: 'danger',
      message: 'Existe probabilidad elevada de quedar por debajo del objetivo esperado.',
    }
  }

  if (normalized === 'bajo') {
    return {
      level: 'bajo',
      label: 'Riesgo bajo',
      icon: '🟢',
      tone: 'safe',
      message: 'Tu progreso actual es consistente con un desempeno esperado estable.',
    }
  }

  return {
    level: 'medio',
    label: 'Riesgo medio',
    icon: '🟡',
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
        <p>{riskMeta.icon}</p>
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
      icon: '🎯',
    },
    {
      label: 'Total estudiantes',
      value: metrics.total,
      detail: 'Cohorte activa',
      accent: 'cyan',
      icon: '👥',
    },
    {
      label: 'Riesgo alto',
      value: `${metrics.riskPct.alto}%`,
      detail: `${metrics.riskDistribution.alto} estudiantes`,
      accent: 'rose',
      icon: '🔴',
    },
    {
      label: 'Riesgo medio + bajo',
      value: `${metrics.riskPct.medio + metrics.riskPct.bajo}%`,
      detail: 'Distribucion actual',
      accent: 'lime',
      icon: '📊',
    },
  ]

  return (
    <section className="grid-4">
      {cards.map((card) => (
        <article className={`kpi-card ${card.accent}`} key={card.label}>
          <div className="kpi-icon">{card.icon}</div>
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
  activeNavIndex = 0,
  onNavSelect = null,
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
            <button
              className={`nav-item ${index === activeNavIndex ? 'active' : ''}`}
              key={label}
              type="button"
              onClick={() => onNavSelect?.(index, label)}
            >
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

function StudentView({ user, onLogout, onProfileUpdate }) {
  const studentRecord = getStudentRecordForUser(user)
  const studentSections = ROLE_CONFIG.estudiante.nav
  const resolvedStudentData = {
    predictedScore: Number(withFallback(studentRecord.predictedScore, STUDENT_DASHBOARD_MOCK.predictedScore)),
    actualScore: Number(withFallback(studentRecord.actualScore, STUDENT_DASHBOARD_MOCK.actualScore)),
    risk: withFallback(studentRecord.risk, STUDENT_DASHBOARD_MOCK.risk),
    studyHours: Number(withFallback(studentRecord.studyHours, STUDENT_DASHBOARD_MOCK.studyHours)),
    trend: withFallback(studentRecord.trend, STUDENT_DASHBOARD_MOCK.trend),
    strengths: withFallback(studentRecord.strengths, STUDENT_DASHBOARD_MOCK.strengths),
    recommendation: withFallback(studentRecord.recommendation, STUDENT_DASHBOARD_MOCK.recommendation),
  }
  const analysisText = buildStudentAutomaticAnalysis(
    resolvedStudentData,
    STUDENT_DASHBOARD_MOCK.performanceAreas,
  )

  const [formData, setFormData] = useState({
    username: user.username,
    age: user.age,
    program: user.program,
    semester: user.semester,
    studyHours: user.studyHours,
    englishLevel: user.englishLevel,
  })
  const [feedback, setFeedback] = useState(null)
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)

  const activeSectionLabel = studentSections[activeSectionIndex] || studentSections[0]
  const isSummarySection = activeSectionIndex === 0
  const isPredictionSection = activeSectionIndex === 1
  const isRecommendationSection = activeSectionIndex === 2

  function handleSubmit(event) {
    event.preventDefault()
    const result = onProfileUpdate(formData)
    setFeedback(result)
  }

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      searchPlaceholder=""
      activeNavIndex={activeSectionIndex}
      onNavSelect={setActiveSectionIndex}
    >
        <section className="card student-section-state">
          <div>
            <p className="banner-kicker">Seccion activa</p>
            <h2>{activeSectionLabel}</h2>
            <p className="student-interpretation">
              Visualizacion detallada y filtrada segun la seccion seleccionada en el menu lateral.
            </p>
          </div>
        </section>

        {isSummarySection ? (
          <>
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
                  <span className={`risk-pill ${normalizeRiskLevel(resolvedStudentData.risk)}`}>
                    {getRiskVisualMeta(resolvedStudentData.risk).label}
                  </span>
                </div>
                <div className="student-score-box">
                  <div className="student-score-value">{resolvedStudentData.predictedScore}</div>
                  <div className="student-score-meta">Puntaje predicho actual</div>
                </div>
                <div className="student-data-list">
                  <div className="student-data-row">
                    <span>Mi resultado real de referencia</span>
                    <strong>{resolvedStudentData.actualScore}</strong>
                  </div>
                  <div className="student-data-row">
                    <span>Tendencia</span>
                    <strong>{resolvedStudentData.trend}</strong>
                  </div>
                  <div className="student-data-row">
                    <span>Fortalezas</span>
                    <strong>{resolvedStudentData.strengths.join(', ')}</strong>
                  </div>
                </div>
                <div className="next-step-box student-note">
                  <p className="next-step-kicker">Recomendacion personal</p>
                  <p>{resolvedStudentData.recommendation}</p>
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

            <StudentRiskVisualCard riskLevel={resolvedStudentData.risk} />
          </>
        ) : null}

        {isPredictionSection ? (
          <>
            <MetricsGrid user={user} records={[studentRecord]} selectedProgram={user.program} />
            <StudentExplanationCard analysisText={analysisText} factors={STUDENT_DASHBOARD_MOCK.factors} />
            <section className="student-block-grid">
              <StudentPerformanceAreasCard areas={STUDENT_DASHBOARD_MOCK.performanceAreas} />
              <StudentComparisonCard
                studentScore={resolvedStudentData.predictedScore}
                comparison={STUDENT_DASHBOARD_MOCK.comparison}
              />
              <StudentProgressCard progress={STUDENT_DASHBOARD_MOCK.progress} />
              <StudentRiskVisualCard riskLevel={resolvedStudentData.risk} />
            </section>
          </>
        ) : null}

        {isRecommendationSection ? (
          <>
            <section className="student-block-grid">
              <StudentRecommendationsCard recommendations={STUDENT_DASHBOARD_MOCK.recommendations} />
              <article className="card student-block">
                <div className="section-header compact">
                  <h2>Interpretacion automatica</h2>
                </div>
                <p className="student-interpretation">{analysisText}</p>
                <div className="student-data-list">
                  <div className="student-data-row">
                    <span>Fortalezas detectadas</span>
                    <strong>{resolvedStudentData.strengths.join(', ')}</strong>
                  </div>
                  <div className="student-data-row">
                    <span>Riesgo actual</span>
                    <strong>{getRiskVisualMeta(resolvedStudentData.risk).label}</strong>
                  </div>
                  <div className="student-data-row">
                    <span>Siguiente enfoque</span>
                    <strong>Lectura critica y gestion del tiempo</strong>
                  </div>
                </div>
              </article>
            </section>

            <StudentQuickEvaluationCard />
          </>
        ) : null}
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
