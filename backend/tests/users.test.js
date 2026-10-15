// Tests para users.js: sanitizeUserRow.
// Este helper se usa antes de mandar cualquier usuario al frontend, asi
// que es la barrera critica para que password_hash NUNCA salga en una
// respuesta HTTP.

import { describe, it, expect } from 'vitest'
import { sanitizeUserRow } from '../src/users.js'

const filaAdmin = {
  id: 1,
  documento: '1001417605',
  username: 'MESA ESCOBAR JHAN CARLOS',
  email: 'jhanc.mesae@unac.edu.co',
  password_hash: '$2a$10$abc.def.ghi.jkl',  // NUNCA debe salir
  role: 'administrador',
  program: 'all',
  is_active: true,
  is_synthetic: false,
  age: null,
  student_record_id: null,
  semester: '8',
  study_hours: '12',
  english_level: 'B1',
  created_at: '2026-10-02T16:46:49.950Z',
  updated_at: '2026-10-02T16:46:49.950Z',
}

describe('users: sanitizeUserRow', () => {
  it('incluye los campos publicos y excluye password_hash', () => {
    const out = sanitizeUserRow(filaAdmin)
    expect(out.id).toBe(1)
    expect(out.documento).toBe('1001417605')
    expect(out.email).toBe('jhanc.mesae@unac.edu.co')
    expect(out.role).toBe('administrador')
    expect(out.isActive).toBe(true)
    expect(out.isSynthetic).toBe(false)
    expect(out.createdAt).toBe('2026-10-02T16:46:49.950Z')
    // CRITICO: password_hash NUNCA debe filtrarse al frontend.
    expect(out).not.toHaveProperty('password_hash')
    expect(Object.keys(out)).not.toContain('password_hash')
  })

  it('isActive=true por defecto si is_active es null o undefined', () => {
    expect(sanitizeUserRow({ ...filaAdmin, is_active: null }).isActive).toBe(true)
    expect(sanitizeUserRow({ ...filaAdmin, is_active: undefined }).isActive).toBe(true)
  })

  it('isActive=false solo cuando is_active === false', () => {
    expect(sanitizeUserRow({ ...filaAdmin, is_active: false }).isActive).toBe(false)
  })

  it('isSynthetic=true solo cuando is_synthetic === true', () => {
    expect(sanitizeUserRow({ ...filaAdmin, is_synthetic: true }).isSynthetic).toBe(true)
    expect(sanitizeUserRow({ ...filaAdmin, is_synthetic: false }).isSynthetic).toBe(false)
    expect(sanitizeUserRow({ ...filaAdmin, is_synthetic: null }).isSynthetic).toBe(false)
  })

  it('retorna null cuando la fila es null/undefined', () => {
    expect(sanitizeUserRow(null)).toBeNull()
    expect(sanitizeUserRow(undefined)).toBeNull()
  })

  it('devuelve string vacio para campos opcionales null', () => {
    const out = sanitizeUserRow({ ...filaAdmin, age: null, student_record_id: null })
    expect(out.age).toBe('')
    expect(out.studentRecordId).toBe('')
  })
})