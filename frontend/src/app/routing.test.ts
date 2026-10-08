import { describe, expect, it } from 'vitest'
import { canAccess, resolveHomePath, resolveInitialRoute } from './routing'

describe('resolveHomePath', () => {
  it('devuelve /home para USER y /admin para ADMIN', () => {
    expect(resolveHomePath('USER')).toBe('/home')
    expect(resolveHomePath('ADMIN')).toBe('/admin')
  })
})

describe('canAccess', () => {
  it('permite solo el rol requerido', () => {
    expect(canAccess('ADMIN', 'ADMIN')).toBe(true)
    expect(canAccess('USER', 'ADMIN')).toBe(false)
    expect(canAccess('USER', 'USER')).toBe(true)
  })
})

describe('resolveInitialRoute', () => {
  it('lleva a la home del rol cuando hay sesión autenticada', () => {
    expect(resolveInitialRoute('authenticated', 'USER')).toBe('/home')
    expect(resolveInitialRoute('authenticated', 'ADMIN')).toBe('/admin')
  })

  it('lleva al login cuando no hay sesión', () => {
    expect(resolveInitialRoute('anonymous', null)).toBe('/login')
    expect(resolveInitialRoute('loading', null)).toBe('/login')
    expect(resolveInitialRoute('restoreError', null)).toBe('/login')
  })
})
