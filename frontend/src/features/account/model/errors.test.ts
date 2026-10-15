import { describe, expect, it } from 'vitest'
import { HttpError, NetworkError } from '../../../shared/lib/http'
import { accountCopy } from './copy'
import { passwordErrorMessage, profileErrorMessage } from './errors'

describe('accountErrorMessage', () => {
  it('informa la falla de red sin cerrar sesión (RF-18)', () => {
    expect(profileErrorMessage(new NetworkError())).toBe(accountCopy.errors.network)
    expect(passwordErrorMessage(new NetworkError())).toBe(accountCopy.errors.network)
  })

  it('perfil: 400 se mapea a nombre inválido (RF-10)', () => {
    expect(profileErrorMessage(new HttpError(400, null))).toBe(accountCopy.errors.invalidName)
  })

  it('contraseña: 401 se mapea a contraseña actual incorrecta (RF-13)', () => {
    expect(passwordErrorMessage(new HttpError(401, null))).toBe(accountCopy.errors.currentPassword)
  })

  it('contraseña: 400 se mapea a nueva contraseña inválida (RF-14)', () => {
    expect(passwordErrorMessage(new HttpError(400, null))).toBe(accountCopy.errors.invalidPassword)
  })

  it('un error desconocido se mapea al mensaje genérico', () => {
    expect(profileErrorMessage(new Error('boom'))).toBe(accountCopy.errors.server)
    expect(passwordErrorMessage(new Error('boom'))).toBe(accountCopy.errors.server)
  })
})
