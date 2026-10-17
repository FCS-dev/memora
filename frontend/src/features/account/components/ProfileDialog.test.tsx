import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { NetworkError } from '../../../shared/lib/http'
import { accountCopy } from '../model/copy'
import { DEFAULT_AVATAR_COLOR } from '../model/avatarColors'
import { ProfileDialog } from './ProfileDialog'

vi.mock('../../auth/api/authApi', () => ({ getMe: vi.fn() }))
vi.mock('../api/accountApi', () => ({ updateProfile: vi.fn() }))

import { getMe } from '../../auth/api/authApi'
import { updateProfile } from '../api/accountApi'

const mockGetMe = vi.mocked(getMe)
const mockUpdateProfile = vi.mocked(updateProfile)

const profile = {
  uuidUser: 'u1',
  email: 'ana@example.com',
  name: 'Ana',
  role: 'USER' as const,
  avatarColor: '#4F5DFF',
}

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
    mockUpdateProfile.mockReset()
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

  it('renderiza el modal fuera del contenedor para no quedar recortado por el header', async () => {
    mockGetMe.mockResolvedValue(profile)

    const { container } = renderDialog()

    const dialog = await screen.findByRole('dialog', { name: accountCopy.profile.title })
    expect(container).not.toContainElement(dialog)
    expect(dialog.parentElement).toBe(document.body)
  })

  it('cierra con Escape como cancelar', async () => {
    mockGetMe.mockResolvedValue(profile)
    const onClose = vi.fn()

    renderDialog(makeAuth(), onClose)
    await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('rechaza un nombre inválido sin guardar (RF-10)', async () => {
    mockGetMe.mockResolvedValue(profile)
    renderDialog()
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, 'ab')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    expect(await screen.findByText(accountCopy.errors.nameTooShort)).toBeInTheDocument()
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('guarda un nombre válido, lo refleja y cierra (RF-9)', async () => {
    const applyProfile = vi.fn()
    const onClose = vi.fn()
    mockGetMe.mockResolvedValue(profile)
    mockUpdateProfile.mockResolvedValue({ ...profile, name: 'Ana Pérez' })

    renderDialog(makeAuth(applyProfile), onClose)
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, '  Ana Pérez  ')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      avatarColor: profile.avatarColor,
    }))
    expect(applyProfile).toHaveBeenCalledWith({ ...profile, name: 'Ana Pérez' })
    expect(onClose).toHaveBeenCalled()
  })

  it('guarda el color de avatar elegido (RF-9)', async () => {
    const applyProfile = vi.fn()
    mockGetMe.mockResolvedValue(profile)
    mockUpdateProfile.mockResolvedValue({ ...profile, avatarColor: '#059669' })

    renderDialog(makeAuth(applyProfile))
    await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.click(screen.getByRole('radio', { name: '#059669' }))
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
      name: profile.name,
      avatarColor: '#059669',
    }))
  })

  it('usa el color por defecto cuando el perfil no tiene avatarColor', async () => {
    mockGetMe.mockResolvedValue({ ...profile, avatarColor: null })
    mockUpdateProfile.mockResolvedValue({ ...profile, avatarColor: DEFAULT_AVATAR_COLOR })

    renderDialog()
    await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
      name: profile.name,
      avatarColor: DEFAULT_AVATAR_COLOR,
    }))
  })

  it('cancela sin guardar los cambios (RF-11)', async () => {
    const onClose = vi.fn()
    mockGetMe.mockResolvedValue(profile)
    renderDialog(makeAuth(), onClose)
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, 'Otro nombre')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.cancel }))

    expect(mockUpdateProfile).not.toHaveBeenCalled()
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
    mockUpdateProfile.mockRejectedValue(new NetworkError())
    renderDialog()
    const name = await screen.findByLabelText(accountCopy.profile.name)

    await userEvent.clear(name)
    await userEvent.type(name, 'Ana Pérez')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.profile.save }))

    expect(await screen.findByRole('alert')).toHaveTextContent(accountCopy.errors.network)
    expect(name).toHaveValue('Ana Pérez')
  })
})
