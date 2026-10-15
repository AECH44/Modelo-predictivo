import { describe, it, expect } from 'vitest'
import { parseCsvRow, validateRow, splitMetadata } from '../src/lib/csv-to-profile.js'

describe('parseCsvRow', () => {
  it('mapea campos basicos del CSV al perfil', () => {
    const raw = {
      NOMBRES: 'PEREZ PEREZ JUAN',
      IDENTIFICACION: '1099545610',
      CORREO: 'juan.perez@gmail.com',
      CARNET: '20181012345',
      SEMESTRE_ACTUAL: '8',
      PORCENTAJE_AVANCE: '75.5',
      PROMEDIO_ACUMULADO: '4.0',
      PROMEDIO_MATERIAS_BASICAS: '3.8',
      PROMEDIO_PROGRAMACION: '4.2',
      PROMEDIO_MATEMATICA_ESTADISTICA: '4.0',
      ASIGNATURAS_REPROBADAS: '2',
      CREDITOS_APROBADOS: '120',
      ASIGNATURAS_APROBADAS: '40',
      ESTRATO: 'ESTRATO 3',
      CONDICION_LABORAL: 'No',
      GENERO: 'M',
      EDAD: '25',
      CIUDAD_RESIDENCIA_ACTUAL: 'Bogota',
      PROMEDIO_INGLES: '5',
    }
    const p = parseCsvRow(raw)
    expect(p.promedio_basicas).toBe(3.8)
    expect(p.promedio_programacion).toBe(4.2)
    expect(p.promedio_matematica_estadistica).toBe(4)
    expect(p.promedio_ingenieria).toBe(4.1) // promedio(4.2, 4.0)
    expect(p.num_reprobadas).toBe(2)
    expect(p.pct_creditos).toBe(75.5)
    expect(p.semestre).toBe(8)
    expect(p.estrato).toBe(3)
    expect(p.creditos_aprobados).toBe(120)
    expect(p.asignaturas_aprobadas).toBe(40)
    expect(p.edad).toBe(25)
    expect(p.genero).toBe('M')
    expect(p.trabaja).toBe(false)
    expect(p.nivel_ingles).toBe('C1')
    expect(p.ciudad).toBe('Bogota')
  })

  it('acepta CONDICION_LABORAL con la clave vieja (con paréntesis)', () => {
    const raw = { 'CONDICION_LABORAL (¿Trabaja?)': 'Sí' }
    const p = parseCsvRow(raw)
    expect(p.trabaja).toBe(true)
  })

  it('acepta acentos en CONDICION_LABORAL', () => {
    const raw = { CONDICION_LABORAL: 'Sí' }
    expect(parseCsvRow(raw).trabaja).toBe(true)
  })

  it('convierte INGLES escala 1-7 a nivel MCER', () => {
    const cases = [
      [1, 'A1'], [2, 'A2'], [3, 'B1'], [4, 'B2'], [5, 'C1'], [6, 'C2'], [7, 'C2'],
    ]
    for (const [escala, nivel] of cases) {
      expect(parseCsvRow({ PROMEDIO_INGLES: String(escala) }).nivel_ingles).toBe(nivel)
    }
    expect(parseCsvRow({ PROMEDIO_INGLES: '0' }).nivel_ingles).toBeNull()
    expect(parseCsvRow({ PROMEDIO_INGLES: '' }).nivel_ingles).toBeNull()
  })

  it('parsea ESTRATO N a entero', () => {
    expect(parseCsvRow({ ESTRATO: 'ESTRATO 4' }).estrato).toBe(4)
    expect(parseCsvRow({ ESTRATO: '3' }).estrato).toBe(3)
    expect(parseCsvRow({ ESTRATO: '' }).estrato).toBeNull()
    expect(parseCsvRow({ ESTRATO: 'ESTRATO 99' }).estrato).toBeNull() // fuera de rango
  })

  it('acepta genero M/F/O y devuelve null en el resto', () => {
    expect(parseCsvRow({ GENERO: 'M' }).genero).toBe('M')
    expect(parseCsvRow({ GENERO: 'F' }).genero).toBe('F')
    expect(parseCsvRow({ GENERO: 'O' }).genero).toBe('O')
    expect(parseCsvRow({ GENERO: 'X' }).genero).toBeNull()
    expect(parseCsvRow({ GENERO: '' }).genero).toBeNull()
  })

  it('devuelve null para campos numericos fuera de rango', () => {
    expect(parseCsvRow({ SEMESTRE_ACTUAL: '15' }).semestre).toBeNull()
    expect(parseCsvRow({ EDAD: '10' }).edad).toBeNull()
    expect(parseCsvRow({ PORCENTAJE_AVANCE: '150' }).pct_creditos).toBeNull()
    expect(parseCsvRow({ PROMEDIO_ACUMULADO: '6' }).promedio_acumulado).toBeNull()
  })

  it('aplica defaults institucionales (acceso_internet=true, etc.)', () => {
    const p = parseCsvRow({})
    expect(p.acceso_internet).toBe(true)
    expect(p.acceso_pc).toBe(true)
    expect(p.horas_estudio_semana).toBe(8)
    expect(p.asistencia_pct).toBe(85)
    expect(p.simulacros_realizados).toBe(0)
  })

  it('trunca ciudad a 60 chars', () => {
    const larga = 'A'.repeat(80)
    expect(parseCsvRow({ CIUDAD_RESIDENCIA_ACTUAL: larga }).ciudad).toHaveLength(60)
  })

  it('deriva promedio_ingenieria del promedio de programacion y matematica', () => {
    expect(parseCsvRow({
      PROMEDIO_PROGRAMACION: '4.0',
      PROMEDIO_MATEMATICA_ESTADISTICA: '5.0',
    }).promedio_ingenieria).toBe(4.5)
    // Solo uno presente: promedio del único valor.
    expect(parseCsvRow({ PROMEDIO_PROGRAMACION: '4.0' }).promedio_ingenieria).toBe(4.0)
    // Ambos null: null.
    expect(parseCsvRow({}).promedio_ingenieria).toBeNull()
  })

  it('devuelve null para entrada no-objeto', () => {
    expect(parseCsvRow(null)).toBeNull()
    expect(parseCsvRow(undefined)).toBeNull()
    expect(parseCsvRow('cadena')).toBeNull()
  })
})

describe('validateRow', () => {
  const valid = parseCsvRow({
    NOMBRES: 'PEREZ PEREZ JUAN',
    IDENTIFICACION: '1099545610',
    CORREO: 'juan@gmail.com',
  })

  it('acepta una fila valida y normaliza el correo', () => {
    const r = validateRow(valid)
    expect(r.ok).toBe(true)
    expect(r.data._correo).toBe('juan@gmail.com')
    expect(r.data._identificacion).toBe('1099545610')
  })

  it('rechaza fila nula', () => {
    expect(validateRow(null).ok).toBe(false)
  })

  it('rechaza identificacion vacia o no numerica', () => {
    const sinDoc = parseCsvRow({ NOMBRES: 'X Y', CORREO: 'a@b.com' })
    expect(validateRow(sinDoc).reason).toBe('identificacion_vacia')

    const docCorto = parseCsvRow({ NOMBRES: 'X Y', CORREO: 'a@b.com', IDENTIFICACION: '123' })
    expect(validateRow(docCorto).reason).toBe('identificacion_invalida')

    const docLetras = parseCsvRow({ NOMBRES: 'X Y', CORREO: 'a@b.com', IDENTIFICACION: 'abc' })
    expect(validateRow(docLetras).reason).toBe('identificacion_invalida')
  })

  it('rechaza correo vacio o mal formado', () => {
    const sinCorreo = parseCsvRow({ NOMBRES: 'X Y', IDENTIFICACION: '12345678' })
    expect(validateRow(sinCorreo).reason).toBe('correo_vacio')

    const malCorreo = parseCsvRow({ NOMBRES: 'X Y', IDENTIFICACION: '12345678', CORREO: 'sinArroba' })
    expect(validateRow(malCorreo).reason).toBe('correo_invalido')
  })

  it('rechaza nombres invalidos o muy cortos', () => {
    const sinNombre = parseCsvRow({ IDENTIFICACION: '12345678', CORREO: 'a@b.com' })
    expect(validateRow(sinNombre).reason).toBe('nombres_invalidos')

    const corto = parseCsvRow({ NOMBRES: 'AB', IDENTIFICACION: '12345678', CORREO: 'a@b.com' })
    expect(validateRow(corto).reason).toBe('nombres_invalidos')

    const conNumeros = parseCsvRow({
      NOMBRES: 'PEREZ 123',
      IDENTIFICACION: '12345678',
      CORREO: 'a@b.com',
    })
    expect(validateRow(conNumeros).reason).toBe('nombres_invalidos')
  })

  it('lowercase el correo durante la normalización', () => {
    const r = validateRow(parseCsvRow({
      NOMBRES: 'PEREZ PEREZ JUAN',
      IDENTIFICACION: '1099545610',
      CORREO: 'Juan.Perez@GMAIL.COM',
    }))
    expect(r.ok).toBe(true)
    expect(r.data._correo).toBe('juan.perez@gmail.com')
  })
})

describe('splitMetadata', () => {
  it('separa metadata de los campos del perfil', () => {
    const parsed = parseCsvRow({
      NOMBRES: 'PEREZ PEREZ JUAN',
      IDENTIFICACION: '1099545610',
      CORREO: 'a@b.com',
      PROMEDIO_MATERIAS_BASICAS: '4.0',
    })
    const { identificacion, correo, nombres, carnet, profileFields } = splitMetadata(parsed)
    expect(identificacion).toBe('1099545610')
    expect(correo).toBe('a@b.com')
    expect(nombres).toBe('PEREZ PEREZ JUAN')
    expect(carnet).toBeNull()
    expect(profileFields.promedio_basicas).toBe(4.0)
    // No debe haber leak de metadata en profileFields.
    expect(profileFields._identificacion).toBeUndefined()
    expect(profileFields._correo).toBeUndefined()
  })
})