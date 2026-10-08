import { describe, expect, it } from 'vitest'
import { mapLoginError } from './errors'

describe('mapLoginError', () => {
  it('mapea 401 a error genérico', () => {
    expect(mapLoginError(401)).toBe('generic')
  })

  it('mapea 403 a cuenta inactiva', () => {
    expect(mapLoginError(403)).toBe('inactive')
  })

  it('mapea 5xx a error de servidor', () => {
    expect(mapLoginError(500)).toBe('server')
    expect(mapLoginError(503)).toBe('server')
  })

  it('devuelve null para estados no contemplados', () => {
    expect(mapLoginError(400)).toBeNull()
    expect(mapLoginError(404)).toBeNull()
  })
})
