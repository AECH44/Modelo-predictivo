import { useEffect, useState } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import './App.css'
import {
  apiChangeMyPassword,
  apiGetCohort,
  apiGetStudentPredictions,
  apiGetStudentProfile,
  apiLogin,
  apiLogout,
  apiMe,
  apiRecover,
  apiRegister,
  apiSaveStudentProfile,
  apiUpdateMe,
  apiUpdateProfile,
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
  const [formData, setFormData] = useState({ identifier: '', password: '' })
  const [feedback, setFeedback] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

      <div className="auth-links single-link login-links">
        <NavLink to="/register">Crear cuenta de estudiante</NavLink>
      </div>
    </AuthLayout>
  )
}

// Validaciones del formulario de registro (espejo de las del backend).
const REGISTER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Permite puntos solo como abreviacion (Dr., Prof.).
const REGISTER_NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?)*$/
const REGISTER_DOC_RE = /^\d{5,15}$/

function validateRegisterName(name) {
  const value = (name || '').trim()
  if (value.length < 3) return 'El nombre debe tener al menos 3 caracteres.'
  if (value.length > 80) return 'El nombre no puede superar los 80 caracteres.'
  if (!REGISTER_NAME_RE.test(value)) {
    return 'El nombre solo puede contener letras y espacios (sin numeros ni simbolos).'
  }
  return null
}

function validateRegisterEmail(email) {
  const value = (email || '').trim()
  if (!value) return 'El correo es obligatorio.'
  if (!REGISTER_EMAIL_RE.test(value)) return 'Correo electronico invalido.'
  return null
}

function validateRegisterDocumento(doc) {
  const value = (doc || '').toString().trim()
  if (!value) return 'El documento de identidad es obligatorio.'
  if (!REGISTER_DOC_RE.test(value)) {
    return 'El documento debe contener entre 5 y 15 digitos numericos.'
  }
  return null
}

function RegisterForm({ onRegister }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    documento: '',
    email: '',
    password: '',
    program: 'sistemas',
  })
  const [feedback, setFeedback] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  function validateField(field, value) {
    if (field === 'username') return validateRegisterName(value)
    if (field === 'email') return validateRegisterEmail(value)
    if (field === 'documento') return validateRegisterDocumento(value)
    return null
  }

  function handleChange(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    if (fieldErrors[field]) {
      // Re-valida en caliente para borrar el error en cuanto el usuario corrige.
      const next = validateField(field, value)
      setFieldErrors((current) => ({ ...current, [field]: next }))
    }
  }

  function handleBlur(field) {
    const err = validateField(field, formData[field])
    setFieldErrors((current) => ({ ...current, [field]: err }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const errors = {
      username: validateRegisterName(formData.username),
      documento: validateRegisterDocumento(formData.documento),
      email: validateRegisterEmail(formData.email),
      password:
        !formData.password.trim()
          ? 'La contrasena es obligatoria.'
          : formData.password.trim().length < 6
            ? 'La contrasena debe tener al menos 6 caracteres.'
            : null,
    }
    setFieldErrors(errors)
    const firstError = Object.values(errors).find(Boolean)
    if (firstError) {
      setFeedback({ ok: false, message: firstError })
      return
    }

    setSubmitting(true)
    try {
      const result = await onRegister(formData)
      setFeedback(result)

      if (result.ok) {
        navigate('/inicio', { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Registro"
    >
      <div className="auth-form-header">
        <h2>Nueva cuenta</h2>
        <p>Este formulario crea usuarios con vista exclusiva de estudiante.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="auth-label" htmlFor="register-username">
          Nombre completo
        </label>
        <input
          id="register-username"
          className="auth-input"
          type="text"
          placeholder="Tu nombre"
          value={formData.username}
          onChange={(event) => handleChange('username', event.target.value)}
          onBlur={() => handleBlur('username')}
          aria-invalid={fieldErrors.username ? 'true' : 'false'}
          required
        />
        {fieldErrors.username ? (
          <p className="auth-feedback error">{fieldErrors.username}</p>
        ) : null}

        <label className="auth-label" htmlFor="register-documento">
          Documento de identidad
        </label>
        <input
          id="register-documento"
          className="auth-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Solo numeros (5 a 15 digitos)"
          value={formData.documento}
          onChange={(event) =>
            handleChange('documento', event.target.value.replace(/\D/g, ''))
          }
          onBlur={() => handleBlur('documento')}
          aria-invalid={fieldErrors.documento ? 'true' : 'false'}
          required
        />
        {fieldErrors.documento ? (
          <p className="auth-feedback error">{fieldErrors.documento}</p>
        ) : null}

        <label className="auth-label" htmlFor="register-email">
          Correo
        </label>
        <input
          id="register-email"
          className="auth-input"
          type="email"
          placeholder="nombre@correo.com"
          value={formData.email}
          onChange={(event) => handleChange('email', event.target.value)}
          onBlur={() => handleBlur('email')}
          aria-invalid={fieldErrors.email ? 'true' : 'false'}
          required
        />
        {fieldErrors.email ? (
          <p className="auth-feedback error">{fieldErrors.email}</p>
        ) : null}

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
        {fieldErrors.password ? (
          <p className="auth-feedback error">{fieldErrors.password}</p>
        ) : null}

        {feedback ? (
          <p className={`auth-feedback ${feedback.ok ? 'success' : 'error'}`}>
            {feedback.message}
          </p>
        ) : null}

        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Registrarme e iniciar sesion'}
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

function AccountSettingsModal({ user, onClose, onUserUpdated }) {
  const [name, setName] = useState(user.username)
  const [documento, setDocumento] = useState(user.documento || '')
  const [identityFeedback, setIdentityFeedback] = useState(null)
  const [savingIdentity, setSavingIdentity] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwFeedback, setPwFeedback] = useState(null)
  const [savingPw, setSavingPw] = useState(false)

  async function handleSaveIdentity(event) {
    event.preventDefault()
    if (savingIdentity) return
    setIdentityFeedback(null)

    const trimmedName = name.trim()
    const trimmedDoc = documento.toString().trim()

    if (trimmedName.length < 3) {
      setIdentityFeedback({
        ok: false,
        message: 'El nombre debe tener al menos 3 caracteres.',
      })
      return
    }
    if (
      !/^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?)*$/.test(trimmedName)
    ) {
      setIdentityFeedback({
        ok: false,
        message: 'El nombre solo puede contener letras y espacios.',
      })
      return
    }
    if (!/^\d{5,15}$/.test(trimmedDoc)) {
      setIdentityFeedback({
        ok: false,
        message: 'El documento debe contener entre 5 y 15 digitos numericos.',
      })
      return
    }
    if (trimmedName === user.username && trimmedDoc === (user.documento || '')) {
      setIdentityFeedback({ ok: false, message: 'No hay cambios para guardar.' })
      return
    }

    const payload = {}
    if (trimmedName !== user.username) payload.username = trimmedName
    if (trimmedDoc !== (user.documento || '')) payload.documento = trimmedDoc

    setSavingIdentity(true)
    try {
      const result = await apiUpdateMe(payload)
      if (!result.ok) {
        setIdentityFeedback({
          ok: false,
          message: result.message || 'No se pudo actualizar.',
        })
        return
      }
      setIdentityFeedback({ ok: true, message: 'Cuenta actualizada.' })
      onUserUpdated?.(result.user)
    } finally {
      setSavingIdentity(false)
    }
  }

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
              <span>Correo</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>Documento actual</span>
              <strong>{user.documento || '—'}</strong>
            </div>
            <div>
              <span>Rol</span>
              <strong>{ROLE_CONFIG[user.role]?.label || user.role}</strong>
            </div>
          </div>
        </section>

        <section className="account-section">
          <h3>Editar nombre y documento de identidad</h3>
          <p className="student-interpretation" style={{ margin: 0 }}>
            Despues de cambiar el documento podras iniciar sesion con el nuevo
            valor (o tu correo).
          </p>
          <form className="profile-form" onSubmit={handleSaveIdentity}>
            <label className="auth-label" htmlFor="account-name">
              Nombre completo
            </label>
            <input
              id="account-name"
              className="auth-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label className="auth-label" htmlFor="account-doc">
              Documento de identidad
            </label>
            <input
              id="account-doc"
              className="auth-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={documento}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
              maxLength="15"
              required
            />

            {identityFeedback ? (
              <p className={`auth-feedback ${identityFeedback.ok ? 'success' : 'error'}`}>
                {identityFeedback.message}
              </p>
            ) : null}
            <div className="form-actions">
              <button className="auth-button" type="submit" disabled={savingIdentity}>
                {savingIdentity ? 'Guardando…' : 'Actualizar mis datos'}
              </button>
            </div>
          </form>
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
}) {
  const navigate = useNavigate()
  const roleSettings = ROLE_CONFIG[user.role] || ROLE_CONFIG.estudiante
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
              <span>🔍</span>
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
            ⚙ Mi cuenta
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

        <div className="user-card" onClick={() => setAccountOpen(true)} role="button" tabIndex={0}>
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
        <div className="content-area">{children}</div>
      </main>

      {accountOpen ? (
        <AccountSettingsModal
          user={user}
          onClose={() => setAccountOpen(false)}
          onUserUpdated={(u) => onUserUpdated?.(u)}
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
          <div className="kpi-icon">{metric.icon}</div>
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
            <div style={{ overflowX: 'auto' }}>
              <table className="cohort-table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Documento</th>
                    <th>Programa</th>
                    <th>Semestre</th>
                    <th>Puntaje</th>
                    <th>Clase</th>
                    <th>Confianza</th>
                    <th>Asistencia</th>
                    <th>Ingles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.id} className={s.completed ? '' : 'pending'}>
                      <td>
                        <strong>{s.username}</strong>
                        <br />
                        <small>{s.email}</small>
                      </td>
                      <td>{s.documento}</td>
                      <td>{getProgramLabel(s.program)}</td>
                      <td>{s.semestre ?? '—'}</td>
                      <td>{s.puntajeEstimado ?? '—'}</td>
                      <td>
                        {s.clase ? (
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
                        )}
                      </td>
                      <td>
                        {s.probabilidad
                          ? `${Math.round(s.probabilidad * 100)}%`
                          : '—'}
                      </td>
                      <td>{s.asistencia ? `${s.asistencia}%` : '—'}</td>
                      <td>{s.nivelIngles ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function RectorView({ user, onLogout, onUserUpdated }) {
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
      onUserUpdated={onUserUpdated}
      searchPlaceholder="Buscar programa o estudiante..."
      topbarControls={topbarControls}
    >
      <CohortPanel user={user} allowProgramFilter={true} />

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

function DeanView({ user, onLogout, onUserUpdated }) {
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
    <DashboardShell user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} topbarControls={topbarControls}>
      <CohortPanel user={user} />

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
      <CohortPanel user={user} />

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
      <DashboardShell user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} searchPlaceholder="">
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
      <DashboardShell user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} searchPlaceholder="">
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

function HomePage({ user, onLogout, onUserUpdated }) {
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

  async function handleRegister({ username, documento, email, password, program }) {
    if (
      !username?.trim() ||
      !documento?.toString().trim() ||
      !email?.trim() ||
      !password?.trim()
    ) {
      return { ok: false, message: 'Todos los campos son obligatorios.' }
    }
    if (password.trim().length < 6) {
      return { ok: false, message: 'La contrasena debe tener al menos 6 caracteres.' }
    }

    const result = await apiRegister({
      username: username.trim(),
      documento: documento.toString().trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      program,
    })

    if (!result.ok) {
      return { ok: false, message: result.message || 'No se pudo completar el registro.' }
    }

    setSession(normalizeUser(result.user))
    return { ok: true, message: 'Registro completado como estudiante. Sesion iniciada.' }
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
