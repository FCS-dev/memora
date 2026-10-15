import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError, NetworkError, setRefreshHandler } from '../../../shared/lib/http'
import { mapNotesError } from './errors'
import { notesCopy } from './copy'

describe('mapNotesError', () => {
  beforeEach(() => setRefreshHandler(null))
  afterEach(() => vi.unstubAllGlobals())

  it('traduce 404 a no encontrado (RF-33)', () => {
    expect(mapNotesError(new HttpError(404, null))).toBe(notesCopy.errors.notFound)
  })

  it('detecta etiqueta duplicada en 409 (RF-33)', () => {
    expect(mapNotesError(new HttpError(409, { detail: 'El tag ya existe' }))).toBe(
      notesCopy.errors.duplicateTag,
    )
  })

  it('traduce error de red a mensaje genérico', () => {
    expect(mapNotesError(new NetworkError())).toBe(notesCopy.errors.generic)
  })

  it('traduce 500 a mensaje genérico', () => {
    expect(mapNotesError(new HttpError(500, null))).toBe(notesCopy.errors.generic)
  })

  it('propaga el motivo del servidor en 403 (RF-40)', () => {
    expect(mapNotesError(new HttpError(403, { detail: 'No tienes permisos' }))).toBe(
      'No tienes permisos',
    )
  })

  it('usa el mensaje de sesión expirada si 403 no trae detalle (RF-40)', () => {
    expect(mapNotesError(new HttpError(403, null))).toBe(notesCopy.errors.sessionExpired)
  })

  it('usa el mensaje de sesión expirada en 401 sin detalle (RF-40)', () => {
    expect(mapNotesError(new HttpError(401, null))).toBe(notesCopy.errors.sessionExpired)
  })

  it('propaga el motivo del servidor en 400 distinto de tag duplicado (RF-40)', () => {
    expect(mapNotesError(new HttpError(400, { detail: 'El checklist es inválido' }))).toBe(
      'El checklist es inválido',
    )
  })
})
