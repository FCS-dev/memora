import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_THEME,
  DARK_THEME,
  THEMES,
  isValidTheme,
  readStoredTheme,
  resolveDocumentTheme,
} from './themes'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: vi.fn((key: string) => data[key] ?? null),
    data,
  }
}

describe('themes', () => {
  it('expone los dos temas propios y los roles claro/oscuro (RF-31, RF-34)', () => {
    expect(THEMES).toEqual(['memora-light', 'memora-dark'])
    expect(DEFAULT_THEME).toBe('memora-light')
    expect(DARK_THEME).toBe('memora-dark')
  })

  it('isValidTheme acepta solo los temas conocidos (RF-31, RF-35)', () => {
    for (const theme of THEMES) {
      expect(isValidTheme(theme)).toBe(true)
    }
    expect(isValidTheme('light')).toBe(false)
    expect(isValidTheme(null)).toBe(false)
    expect(isValidTheme(42)).toBe(false)
  })

  it('readStoredTheme devuelve el tema guardado válido o null (RF-33, RF-35)', () => {
    expect(readStoredTheme(fakeStorage({ 'memora.theme': 'memora-dark' }))).toBe('memora-dark')
    expect(readStoredTheme(fakeStorage({ 'memora.theme': 'inexistente' }))).toBeNull()
    expect(readStoredTheme(fakeStorage())).toBeNull()
  })

  it('resolveDocumentTheme devuelve null cuando no hay elección (RF-34, RF-35)', () => {
    expect(resolveDocumentTheme(null)).toBeNull()
    expect(resolveDocumentTheme('memora-light')).toBe('memora-light')
    expect(resolveDocumentTheme('invalido' as never)).toBeNull()
  })
})
