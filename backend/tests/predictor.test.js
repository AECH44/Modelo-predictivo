// Tests para predictor.js.
// Cubre dos cosas:
//   1. heuristicPredict: scoring deterministico, clases Bajo/Medio/Alto.
//   2. computePrediction: cae a heuristica cuando FastAPI no responde.
//
// predictor.js hace una llamada fetch global con AbortController.
// Para testear la rama de fallback, stub global fetch para que rechace.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { heuristicPredict, computePrediction } from '../src/predictor.js'

const perfilBajo = {
  promedio_acumulado: 2.5,
  promedio_basicas: 2.5,
  promedio_ingenieria: 2.5,
  num_reprobadas: 8,
  pct_creditos: 30,
  semestre: 3,
  estrato: 2,
  horas_estudio_semana: 4,
  simulacros_realizados: 0,
  asistencia_pct: 60,
  nivel_ingles: 'A1',
  acceso_internet: false,
  acceso_pc: false,
  trabaja: true,
}

const perfilAlto = {
  promedio_acumulado: 4.7,
  promedio_basicas: 4.5,
  promedio_ingenieria: 4.8,
  num_reprobadas: 0,
  pct_creditos: 95,
  semestre: 8,
  estrato: 4,
  horas_estudio_semana: 20,
  simulacros_realizados: 6,
  asistencia_pct: 98,
  nivel_ingles: 'C1',
  acceso_internet: true,
  acceso_pc: true,
  trabaja: false,
}

const perfilMedio = {
  // Promedios en 3.2 (limite inferior del rango Medio), con varias senales
  // bajando el score para que la heuristica lo clasifique como 'medio'
  // (entre 180 y 239 inclusive). Ver scoring en src/predictor.js.
  promedio_acumulado: 3.2,
  promedio_basicas: 3.2,
  promedio_ingenieria: 3.2,
  num_reprobadas: 4,
  pct_creditos: 50,
  semestre: 5,
  estrato: 2,
  horas_estudio_semana: 6,
  simulacros_realizados: 1,
  asistencia_pct: 75,
  nivel_ingles: 'A2',
  acceso_internet: false,
  acceso_pc: false,
  trabaja: true,
}

describe('predictor: heuristicPredict', () => {
  it('perfilBajo -> clase "bajo"', () => {
    const r = heuristicPredict(perfilBajo)
    expect(r.clase).toBe('bajo')
    expect(r.model_version).toBe('heuristic-v1')
    expect(r.puntaje_estimado).toBeLessThan(180)
    expect(r.probabilidad).toBeGreaterThanOrEqual(0.55)
    expect(r.probabilidad).toBeLessThanOrEqual(0.97)
  })

  it('perfilAlto -> clase "alto"', () => {
    const r = heuristicPredict(perfilAlto)
    expect(r.clase).toBe('alto')
    expect(r.puntaje_estimado).toBeGreaterThanOrEqual(240)
  })

  it('perfilMedio -> clase "medio"', () => {
    const r = heuristicPredict(perfilMedio)
    expect(r.clase).toBe('medio')
    expect(r.puntaje_estimado).toBeGreaterThanOrEqual(180)
    expect(r.puntaje_estimado).toBeLessThan(240)
  })

  it('incluye snapshot del perfil en la respuesta', () => {
    const r = heuristicPredict(perfilAlto)
    expect(r.snapshot).toEqual(perfilAlto)
  })

  it('factores, areas y recomendaciones vienen con la forma esperada', () => {
    const r = heuristicPredict(perfilMedio)
    expect(Array.isArray(r.factores)).toBe(true)
    expect(r.factores.length).toBeGreaterThan(0)
    for (const f of r.factores) {
      expect(f).toHaveProperty('label')
      expect(f).toHaveProperty('impact')
      expect(f).toHaveProperty('value')
    }
    expect(Array.isArray(r.areas)).toBe(true)
    expect(r.areas.length).toBe(4)
    expect(r.recomendaciones).toHaveProperty('improve')
    expect(r.recomendaciones).toHaveProperty('actions')
  })

  it('maneja campos faltantes con defaults sensatos (no crashea)', () => {
    const r = heuristicPredict({})
    expect(['bajo', 'medio', 'alto']).toContain(r.clase)
    expect(typeof r.puntaje_estimado).toBe('number')
    expect(r.puntaje_estimado).toBeGreaterThanOrEqual(0)
    expect(r.puntaje_estimado).toBeLessThanOrEqual(300)
  })
})

describe('predictor: computePrediction (fallback cuando FastAPI no responde)', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    // FastAPI no responde: fetch rechaza inmediatamente.
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('ECONNREFUSED')))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    // Resetear el cache de health del modulo predictor para que cada test
    // arranque forzando re-check.
    // El modulo expone un closure; para resetear hay que recargarlo.
    vi.resetModules()
  })

  it('cae a heuristicPredict cuando fetch rechaza', async () => {
    // Importar despues de vi.resetModules para tener instancia limpia.
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilAlto)
    expect(r.model_version).toBe('heuristic-v1')
    expect(r.clase).toBe('alto')
  })
})
// ---------------------------------------------------------------------------
// Estudiante sin historial academico (primer semestre).
//
// Todas sus features academicas vienen en 0. El modelo nunca vio ese regimen
// en el entrenamiento (esas filas se excluyeron por promedio_acumulado = 0),
// asi que predecir una clase seria inventarse el dato: la decision la tomarian
// genero, edad y estrato. En ese caso NO se emite prediccion.
// ---------------------------------------------------------------------------
describe('predictor: estudiante sin datos academicos', () => {
  // Perfil tal como queda tras el import del CSV para un estudiante de
  // primer semestre: promedios, creditos y avance en cero.
  const perfilSinDatos = {
    promedio_acumulado: 0,
    promedio_basicas: 0,
    promedio_ingenieria: 0,
    promedio_programacion: 0,
    promedio_matematica_estadistica: 0,
    num_reprobadas: 0,
    pct_creditos: 0,
    semestre: 1,
    estrato: 3,
    creditos_aprobados: 0,
    asignaturas_aprobadas: 0,
    horas_estudio_semana: 8,
    simulacros_realizados: 0,
    asistencia_pct: 85,
    nivel_ingles: null,
    genero: 'M',
    edad: 19,
  }

  afterEach(() => {
    // Este bloque usa el `fetch` real (no hay stub): el health check falla y
    // queda cacheado como `false` en la instancia del modulo durante 30 s.
    // Sin resetear el modulo, el describe siguiente importa esa misma
    // instancia y el health check cacheado le hace caer al heuristico.
    vi.resetModules()
  })

  it('tieneDatosSuficientes es false sin promedio acumulado', async () => {
    const { tieneDatosSuficientes } = await import('../src/predictor.js')
    expect(tieneDatosSuficientes(perfilSinDatos)).toBe(false)
    expect(tieneDatosSuficientes({})).toBe(false)
    expect(tieneDatosSuficientes(null)).toBe(false)
  })

  it('tieneDatosSuficientes es true con historial academico', async () => {
    const { tieneDatosSuficientes } = await import('../src/predictor.js')
    expect(tieneDatosSuficientes(perfilAlto)).toBe(true)
    expect(tieneDatosSuficientes(perfilBajo)).toBe(true)
  })

  it('computePrediction devuelve null (no inventa clase)', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    expect(await freshCompute(perfilSinDatos)).toBeNull()
  })

  it('computePrediction sigue devolviendo prediccion con datos', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilAlto)
    expect(r).not.toBeNull()
    expect(['bajo', 'medio', 'alto']).toContain(r.clase)
  })
})

// ---------------------------------------------------------------------------
// Contrato del modelo v2 (`saberpro-v2`).
//
// El servicio devuelve el PUNTAJE estimado real (salida del regresor) con su
// intervalo y el puntaje por area. El wrapper debe traducirlo tal cual: el
// puntaje ya NO se inventa a partir de la probabilidad.
// ---------------------------------------------------------------------------
describe('predictor: contrato del modelo v2', () => {
  let originalFetch
  let respuestaV2

  beforeEach(() => {
    // Instancia limpia del modulo: sin esto se hereda el cache de health de
    // otro describe (30 s de TTL) y el stub de `fetch` nunca se consulta.
    vi.resetModules()
    originalFetch = globalThis.fetch
    respuestaV2 = {
      resultado: 'Medio',
      probabilidad: 0.62,
      confidence_pct: 62.0,
      recomendacion: 'Tu puntaje estimado en el Saber Pro es 277.',
      timestamp: '2026-10-22T19:00:00',
      model_version: 'saberpro-v2',
      probabilities: { Alto: 0.2, Medio: 0.62, Bajo: 0.18 },
      puntaje_estimado: 277.3,
      puntaje_minimo: 246.4,
      puntaje_maximo: 308.1,
      areas: [
        { id: 'matematicas', label: 'Matematicas / Razonamiento cuantitativo', score: 58.3 },
        { id: 'lectura_critica', label: 'Lectura critica', score: 55.3 },
        { id: 'ingles', label: 'Ingles', score: 48.9 },
      ],
      feature_contributions: [],
    }
    // FastAPI "responde": el health check dice que el modelo esta cargado y
    // /api/predict devuelve la respuesta v2.
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ model_loaded: true, model_version: 'saberpro-v2' }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(respuestaV2) })
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.resetModules()
  })

  it('usa el puntaje REAL del modelo, no un remapeo de la probabilidad', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilMedio)
    expect(r.puntaje_estimado).toBe(277)
    // El remapeo antiguo habria dado 217 (180 + 0.62*60).
    expect(r.puntaje_estimado).not.toBe(217)
  })

  it('propaga el intervalo de prediccion', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilMedio)
    expect(r.puntaje_minimo).toBe(246)
    expect(r.puntaje_maximo).toBe(308)
    expect(r.puntaje_minimo).toBeLessThan(r.puntaje_estimado)
    expect(r.puntaje_maximo).toBeGreaterThan(r.puntaje_estimado)
  })

  it('propaga las areas predichas por el modelo', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilMedio)
    expect(r.areas).toHaveLength(3)
    expect(r.areas.map((a) => a.id)).toEqual(['matematicas', 'lectura_critica', 'ingles'])
    expect(r.areas[0].score).toBe(58)
  })

  it('normaliza la clase a lowercase (CHECK constraint de la BD)', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilMedio)
    expect(r.clase).toBe('medio')
  })

  it('el model_version truncado cabe en VARCHAR(20)', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilMedio)
    expect(r.model_version).toBe('ml-saberpro-v2')
    expect(r.model_version.length).toBeLessThanOrEqual(19)
  })

  it('envia el promedio acumulado al servicio (feature del modelo v2)', async () => {
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    await freshCompute(perfilMedio)
    const llamada = globalThis.fetch.mock.calls.find((c) =>
      String(c[0]).includes('/api/predict'))
    const cuerpo = JSON.parse(llamada[1].body)
    expect(cuerpo.promedio_acumulado).toBe(3.2)
  })

  it('si el servicio NO manda puntaje (modelo v1), cae al remapeo sin intervalo', async () => {
    respuestaV2.puntaje_estimado = undefined
    respuestaV2.puntaje_minimo = undefined
    respuestaV2.puntaje_maximo = undefined
    respuestaV2.areas = undefined
    const { computePrediction: freshCompute } = await import('../src/predictor.js')
    const r = await freshCompute(perfilMedio)
    expect(typeof r.puntaje_estimado).toBe('number')
    expect(r.puntaje_minimo).toBeNull()
    expect(r.puntaje_maximo).toBeNull()
    // Sin areas del modelo se usan las 4 estimadas por la heuristica.
    expect(r.areas).toHaveLength(4)
  })
})
