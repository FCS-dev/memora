import { describe, expect, it, vi } from 'vitest'
import { readViewMode, writeViewMode } from './viewPreference'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: vi.fn((key: string) => data[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data[key] = value
    }),
    data,
  }
}

describe('viewPreference', () => {
  it('usa "card" por defecto cuando no hay preferencia (RF-7)', () => {
    expect(readViewMode(fakeStorage())).toBe('card')
  })

  it('recuerda la vista elegida (global) (RF-7, RF-32)', () => {
    const storage = fakeStorage()
    writeViewMode(storage, 'list')
    expect(readViewMode(storage)).toBe('list')
  })

  it('ignora valores inválidos almacenados', () => {
    const storage = fakeStorage({ 'memora.notes.viewMode': 'raro' })
    expect(readViewMode(storage)).toBe('card')
  })
})
