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
  it('expone los cinco temas y los roles claro/oscuro (RF-31, RF-34)', () => {
    expect(THEMES).toEqual(['cupcake', 'sunset', 'retro', 'nord', 'abyss'])
    expect(DEFAULT_THEME).toBe('cupcake')
    expect(DARK_THEME).toBe('sunset')
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
    expect(readStoredTheme(fakeStorage({ 'memora.theme': 'nord' }))).toBe('nord')
    expect(readStoredTheme(fakeStorage({ 'memora.theme': 'inexistente' }))).toBeNull()
    expect(readStoredTheme(fakeStorage())).toBeNull()
  })

  it('resolveDocumentTheme devuelve null cuando no hay elección (RF-34, RF-35)', () => {
    expect(resolveDocumentTheme(null)).toBeNull()
    expect(resolveDocumentTheme('abyss')).toBe('abyss')
    expect(resolveDocumentTheme('invalido' as never)).toBeNull()
  })
})
