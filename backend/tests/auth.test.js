// Tests para auth.js: hash, verify, sign y verifyToken.
// Usa el JWT_SECRET del entorno (default 'change-me' si no esta definido).

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/auth.js'

describe('auth: hashPassword + verifyPassword', () => {
  it('hashea y verifica una contrasena correctamente', async () => {
    const hash = await hashPassword('mi-clave-secreta-123')
    expect(hash).toMatch(/^\$2[aby]\$/)
    expect(await verifyPassword('mi-clave-secreta-123', hash)).toBe(true)
  })

  it('rechaza contrasena incorrecta', async () => {
    const hash = await hashPassword('correcta')
    expect(await verifyPassword('incorrecta', hash)).toBe(false)
  })

  it('retorna false si el hash es null/undefined', async () => {
    expect(await verifyPassword('cualquiera', null)).toBe(false)
    expect(await verifyPassword('cualquiera', undefined)).toBe(false)
  })
})

describe('auth: signToken + verifyToken', () => {
  it('firma un token y lo verifica correctamente', () => {
    const token = signToken({ sub: 42, role: 'administrador', email: 'x@y.com' })
    expect(typeof token).toBe('string')
    const payload = verifyToken(token)
    expect(payload).toMatchObject({ sub: 42, role: 'administrador', email: 'x@y.com' })
  })

  it('retorna null ante un token invalido', () => {
    expect(verifyToken('esto.no.es.un.jwt')).toBeNull()
  })

  it('retorna null ante un token vacio', () => {
    expect(verifyToken('')).toBeNull()
    expect(verifyToken(null)).toBeNull()
    expect(verifyToken(undefined)).toBeNull()
  })
})