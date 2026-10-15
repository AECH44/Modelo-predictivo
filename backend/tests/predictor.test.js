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