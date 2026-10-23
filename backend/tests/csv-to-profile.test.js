import { describe, it, expect } from 'vitest'
import {
  parseCsvRow,
  validateRow,
  splitMetadata,
  selectBestRowsPerStudent,
  normalizarNombre,
  normalizarCorreo,
} from '../src/lib/csv-to-profile.js'

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
// ===========================================================================
// DEDUPLICACION DEL ROSTER
// ===========================================================================
//
// El export de la universidad trae a algunos estudiantes mas de una vez (una
// fila por corte de su carrera). Si se procesan todas, el mismo estudiante
// queda con la fila de primer semestre (sin notas) y sin prediccion.
//
// Regla: se conserva la fila que TIENE DATOS academicos y, a igualdad de
// datos, la de SEMESTRE mas alto.
describe('selectBestRowsPerStudent', () => {
  const fila = (doc, sem, prom, extra = {}) => ({
    IDENTIFICACION: doc,
    NOMBRES: `ESTUDIANTE ${doc}`,
    SEMESTRE_ACTUAL: String(sem),
    PROMEDIO_ACUMULADO: String(prom),
    ...extra,
  })

  it('conserva la fila con datos cuando la primera no los tiene', () => {
    // Caso real: ESPEJO RODRIGUEZ JOHN STIVEN
    const { rows, resueltos } = selectBestRowsPerStudent([
      fila('1005329441', 1, 0),
      fila('1005329441', 10, 4.1),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].fila.SEMESTRE_ACTUAL).toBe('10')
    expect(rows[0].fila.PROMEDIO_ACUMULADO).toBe('4.1')
    expect(resueltos).toHaveLength(1)
    expect(resueltos[0].documento).toBe('1005329441')
    expect(resueltos[0].semestreElegido).toBe(10)
  })

  it('a igualdad de datos elige el semestre mas alto', () => {
    const { rows } = selectBestRowsPerStudent([
      fila('1001014318', 2, 4.0),
      fila('1001014318', 10, 4.3),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].fila.SEMESTRE_ACTUAL).toBe('10')
  })

  it('prioriza los datos academicos sobre el semestre', () => {
    // La fila de semestre 10 no tiene datos: gana la de semestre 2.
    const { rows } = selectBestRowsPerStudent([
      fila('1118555894', 2, 4.7),
      fila('1118555894', 10, 0),
    ])
    expect(rows[0].fila.SEMESTRE_ACTUAL).toBe('2')
  })

  it('si ninguna fila tiene datos, gana el semestre mas alto', () => {
    const { rows } = selectBestRowsPerStudent([
      fila('1027804169', 1, 0),
      fila('1027804169', 3, 0),
    ])
    expect(rows[0].fila.SEMESTRE_ACTUAL).toBe('3')
  })

  it('deja intactos a los estudiantes que aparecen una sola vez', () => {
    const { rows, resueltos } = selectBestRowsPerStudent([
      fila('1000000001', 5, 3.5),
      fila('1000000002', 7, 4.0),
    ])
    expect(rows).toHaveLength(2)
    expect(resueltos).toHaveLength(0)
  })

  it('conserva el orden original del CSV', () => {
    const { rows } = selectBestRowsPerStudent([
      fila('1000000002', 7, 4.0),
      fila('1000000001', 5, 3.5),
    ])
    expect(rows.map((r) => r.fila.IDENTIFICACION)).toEqual([
      '1000000002', '1000000001',
    ])
  })

  it('no deduplica filas sin documento (no hay con que agrupar)', () => {
    const { rows } = selectBestRowsPerStudent([
      { IDENTIFICACION: '', NOMBRES: 'SIN DOC', SEMESTRE_ACTUAL: '1', PROMEDIO_ACUMULADO: '0' },
      { IDENTIFICACION: '', NOMBRES: 'SIN DOC 2', SEMESTRE_ACTUAL: '2', PROMEDIO_ACUMULADO: '0' },
    ])
    expect(rows).toHaveLength(2)
  })
})

// ===========================================================================
// NORMALIZACIONES: nombres con espacios repetidos y correos truncados
// ===========================================================================
describe('normalizarNombre', () => {
  it('colapsa espacios repetidos', () => {
    expect(normalizarNombre('OCAMPO  QUIROGA  JUAN  SEBASTIAN'))
      .toBe('OCAMPO QUIROGA JUAN SEBASTIAN')
  })

  it('no toca un nombre ya normalizado', () => {
    expect(normalizarNombre('PEREZ PEREZ JUAN')).toBe('PEREZ PEREZ JUAN')
  })
})

describe('normalizarCorreo', () => {
  it('completa un dominio truncado de un proveedor conocido', () => {
    expect(normalizarCorreo('victor@gmail').correo).toBe('victor@gmail.com')
    expect(normalizarCorreo('JUAN@GMAIL.').correo).toBe('JUAN@gmail.com')
    expect(normalizarCorreo('x@GMA').correo).toBe('x@gmail.com')
  })

  it('marca la reparacion', () => {
    expect(normalizarCorreo('victor@gmail').reparado).toBe(true)
  })

  it('NO inventa un dominio desconocido', () => {
    // "empresa" no es un proveedor conocido: no se inventa el TLD.
    expect(normalizarCorreo('alguien@empresa').reparado).toBe(false)
    expect(normalizarCorreo('alguien@empresa').correo).toBe('alguien@empresa')
  })

  it('deja intacto un correo valido', () => {
    expect(normalizarCorreo('juan.perez@gmail.com').correo).toBe('juan.perez@gmail.com')
    expect(normalizarCorreo('juan.perez@gmail.com').reparado).toBe(false)
  })
})

describe('validateRow: ahora acepta lo que venia en el roster real', () => {
  const base = {
    NOMBRES: 'ESTUDIANTE PRUEBA',
    IDENTIFICACION: '1099545610',
    CORREO: 'prueba@gmail.com',
    CARNET: '20181012345',
    SEMESTRE_ACTUAL: '8',
    PROMEDIO_ACUMULADO: '4.0',
  }

  it('acepta nombres con espacios repetidos', () => {
    const v = validateRow(parseCsvRow({ ...base, NOMBRES: 'OCAMPO  QUIROGA  JUAN  SEBASTIAN' }))
    expect(v.ok).toBe(true)
    expect(v.data._nombres).toBe('OCAMPO QUIROGA JUAN SEBASTIAN')
  })

  it('acepta documento alfanumerico (pasaporte)', () => {
    const v = validateRow(parseCsvRow({ ...base, IDENTIFICACION: 'PA1296057' }))
    expect(v.ok).toBe(true)
  })

  it('acepta y repara un correo con el dominio truncado', () => {
    const v = validateRow(parseCsvRow({ ...base, CORREO: 'prueba@gmail' }))
    expect(v.ok).toBe(true)
    expect(v.data._correo).toBe('prueba@gmail.com')
  })

  it('sigue rechazando un documento demasiado corto', () => {
    const v = validateRow(parseCsvRow({ ...base, IDENTIFICACION: '123' }))
    expect(v.ok).toBe(false)
  })

  it('sigue rechazando un correo sin arroba', () => {
    const v = validateRow(parseCsvRow({ ...base, CORREO: 'correo-sin-arroba' }))
    expect(v.ok).toBe(false)
  })
})
