import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { NetworkError } from '../../../shared/lib/http'
import { accountCopy } from '../model/copy'
import { ProfileDialog } from './ProfileDialog'

vi.mock('../../auth/api/authApi', () => ({ getMe: vi.fn() }))
vi.mock('../api/accountApi', () => ({ updateName: vi.fn() }))

import { getMe } from '../../auth/api/authApi'
import { updateName } from '../api/accountApi'

const mockGetMe = vi.mocked(getMe)
const mockUpdateName = vi.mocked(updateName)

const profile = { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER' as const }

function makeAuth(applyProfile = vi.fn()): AuthContextValue {
  return {
    status: 'authenticated',
    user: profile,
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
    applyProfile,
  }
}

function renderDialog(auth: AuthContextValue = makeAuth(), onClose = vi.fn()) {
  return render(
    <AuthContext.Provider value={auth}>
      <ProfileDialog open onClose={onClose} />
    </AuthContext.Provider>,
  )
}

describe('ProfileDialog', () => {
  beforeEach(() => {
    mockGetMe.mockReset()
    mockUpdateName.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('carga y muestra el nombre editable y el correo de solo lectura (RF-8, RF-37)', async () => {
    mockGetMe.mockResolvedValue(profile)

    renderDialog()

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
    const email = screen.getByLabelText(accountCopy.profile.email)
    expect(email).toHaveValue('ana@example.com')
    expect(email).toBeDisabled()
  })

  it('rechaza un nombre inválido sin guardar (RF-10)', async () => {
    mockGetMe.mockResolvedValue(profile)
    renderDialog()
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, 'ab')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    expect(await screen.findByText(accountCopy.errors.nameTooShort)).toBeInTheDocument()
    expect(mockUpdateName).not.toHaveBeenCalled()
  })

  it('guarda un nombre válido, lo refleja y cierra (RF-9)', async () => {
    const applyProfile = vi.fn()
    const onClose = vi.fn()
    mockGetMe.mockResolvedValue(profile)
    mockUpdateName.mockResolvedValue({ ...profile, name: 'Ana Pérez' })

    renderDialog(makeAuth(applyProfile), onClose)
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, '  Ana Pérez  ')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    await waitFor(() => expect(mockUpdateName).toHaveBeenCalledWith('Ana Pérez'))
    expect(applyProfile).toHaveBeenCalledWith({ ...profile, name: 'Ana Pérez' })
    expect(onClose).toHaveBeenCalled()
  })

  it('cancela sin guardar los cambios (RF-11)', async () => {
    const onClose = vi.fn()
    mockGetMe.mockResolvedValue(profile)
    renderDialog(makeAuth(), onClose)
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, 'Otro nombre')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.cancel }))

    expect(mockUpdateName).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra error con reintento si la carga falla (RF-38)', async () => {
    mockGetMe.mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce(profile)

    renderDialog()

    expect(await screen.findByRole('alert')).toHaveTextContent(accountCopy.errors.network)
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.retry }))

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument()
  })

  it('informa y conserva lo ingresado si guardar falla por red (RF-18)', async () => {
    mockGetMe.mockResolvedValue(profile)
    mockUpdateName.mockRejectedValue(new NetworkError())
    renderDialog()
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, 'Ana Pérez')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    expect(await screen.findByRole('alert')).toHaveTextContent(accountCopy.errors.network)
    expect(name).toHaveValue('Ana Pérez')
  })
})
