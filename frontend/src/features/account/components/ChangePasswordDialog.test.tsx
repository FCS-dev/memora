import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { HttpError, NetworkError } from '../../../shared/lib/http'
import { accountCopy } from '../model/copy'
import { ChangePasswordDialog } from './ChangePasswordDialog'

vi.mock('../api/accountApi', () => ({ changePassword: vi.fn() }))

import { changePassword } from '../api/accountApi'

const mockChangePassword = vi.mocked(changePassword)

function makeAuth(signOut = vi.fn()): AuthContextValue {
  return {
    status: 'authenticated',
    user: { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER' },
    signIn: vi.fn(),
    signOut,
    restore: vi.fn(),
    applyProfile: vi.fn(),
  }
}

function renderDialog(auth: AuthContextValue = makeAuth(), onClose = vi.fn()) {
  return render(
    <AuthContext.Provider value={auth}>
      <ChangePasswordDialog open onClose={onClose} />
    </AuthContext.Provider>,
  )
}

async function fill(current: string, next: string, confirm: string) {
  await userEvent.type(screen.getByLabelText(accountCopy.password.current), current)
  await userEvent.type(screen.getByLabelText(accountCopy.password.next), next)
  await userEvent.type(screen.getByLabelText(accountCopy.password.confirm), confirm)
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    mockChangePassword.mockReset()
  })

  it('valida longitud y coincidencia antes de enviar (RF-14)', async () => {
    renderDialog()

    await fill('actual8', '123', '124')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.password.submit }))

    expect(await screen.findByText(accountCopy.errors.passwordLength)).toBeInTheDocument()
    expect(screen.getByText(accountCopy.errors.passwordMismatch)).toBeInTheDocument()
    expect(mockChangePassword).not.toHaveBeenCalled()
  })

  it('avisa si la contraseña actual es incorrecta sin cerrar sesión (RF-13)', async () => {
    mockChangePassword.mockRejectedValue(new HttpError(401, null))
    const signOut = vi.fn()
    renderDialog(makeAuth(signOut))

    await fill('actual8', 'nueva123', 'nueva123')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.password.submit }))

    expect(await screen.findByText(accountCopy.errors.currentPassword)).toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('al cambiar con éxito cierra todas las sesiones (RF-12, RF-15)', async () => {
    mockChangePassword.mockResolvedValue(undefined)
    const signOut = vi.fn().mockResolvedValue(undefined)
    renderDialog(makeAuth(signOut))

    await fill('actual8', 'nueva123', 'nueva123')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.password.submit }))

    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith('actual8', 'nueva123'))
    await waitFor(() => expect(signOut).toHaveBeenCalled())
  })

  it('informa un fallo de red y conserva lo ingresado (RF-18)', async () => {
    mockChangePassword.mockRejectedValue(new NetworkError())
    renderDialog()

    await fill('actual8', 'nueva123', 'nueva123')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.password.submit }))

    expect(await screen.findByText(accountCopy.errors.network)).toBeInTheDocument()
    expect(screen.getByLabelText(accountCopy.password.current)).toHaveValue('actual8')
    expect(screen.getByLabelText(accountCopy.password.next)).toHaveValue('nueva123')
  })
})
