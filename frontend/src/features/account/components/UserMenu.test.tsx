import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { ThemeProvider } from '../../theme/context/ThemeProvider'
import { NetworkError } from '../../../shared/lib/http'
import { accountCopy } from '../model/copy'
import { UserMenu } from './UserMenu'

vi.mock('../../auth/api/authApi', () => ({ getMe: vi.fn() }))

import { getMe } from '../../auth/api/authApi'

const mockGetMe = vi.mocked(getMe)

function authValue(role: 'USER' | 'ADMIN' = 'USER', signOut = vi.fn()): AuthContextValue {
  return {
    status: 'authenticated',
    user: { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role, avatarColor: '#4F5DFF' },
    signIn: vi.fn(),
    signOut,
    restore: vi.fn(),
    applyProfile: vi.fn(),
  }
}

function renderMenu(value: AuthContextValue = authValue()) {
  return render(
    <AuthContext.Provider value={value}>
      <ThemeProvider>
        <UserMenu />
      </ThemeProvider>
    </AuthContext.Provider>,
  )
}

describe('UserMenu', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    mockGetMe.mockReset()
  })

  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('muestra el nombre y abre el menú con las acciones (RF-1, RF-2, RF-3)', async () => {
    renderMenu()
    expect(screen.getByText('Ana')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))

    expect(screen.getByRole('menuitem', { name: accountCopy.menu.profile })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: accountCopy.menu.password })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: accountCopy.menu.theme })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: accountCopy.menu.logout })).toBeInTheDocument()
  })

  it('cierra el menú con Escape y con click fuera (RF-5)', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))
    fireEvent.mouseDown(document.body)
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('ofrece etiquetas solo al USER, no al ADMIN (RF-4)', async () => {
    const { unmount } = renderMenu(authValue('USER'))
    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))
    expect(screen.getByRole('menuitem', { name: accountCopy.menu.tags })).toBeInTheDocument()
    unmount()

    renderMenu(authValue('ADMIN'))
    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))
    expect(screen.queryByRole('menuitem', { name: accountCopy.menu.tags })).not.toBeInTheDocument()
  })

  it('marca el tema activo y lo aplica al elegirlo (RF-31, RF-32, RF-36)', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))
    await userEvent.click(screen.getByRole('menuitem', { name: accountCopy.menu.theme }))

    await userEvent.click(screen.getByRole('menuitemradio', { name: accountCopy.theme.options['memora-dark'] }))

    expect(document.documentElement.dataset.theme).toBe('memora-dark')
    expect(screen.getByRole('menuitemradio', { name: accountCopy.theme.options['memora-dark'] })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('devuelve el foco al disparador al cerrar un diálogo del menú', async () => {
    mockGetMe.mockResolvedValue({
      uuidUser: 'u1',
      email: 'ana@example.com',
      name: 'Ana',
      role: 'USER',
      avatarColor: '#4F5DFF',
    })
    renderMenu()

    const trigger = screen.getByRole('button', { name: accountCopy.menu.trigger })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('menuitem', { name: accountCopy.menu.profile }))

    const dialog = await screen.findByRole('dialog', { name: accountCopy.profile.title })
    await waitFor(() => expect(dialog).toHaveFocus())

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: accountCopy.profile.title })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('cierra la sesión desde el menú (RF-16)', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    renderMenu(authValue('USER', signOut))

    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))
    await userEvent.click(screen.getByRole('menuitem', { name: accountCopy.menu.logout }))

    expect(signOut).toHaveBeenCalledOnce()
  })

  it('conserva la sesión e informa si el cierre de sesión falla por red (RF-17)', async () => {
    const signOut = vi.fn().mockRejectedValue(new NetworkError())
    renderMenu(authValue('USER', signOut))

    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))
    await userEvent.click(screen.getByRole('menuitem', { name: accountCopy.menu.logout }))

    expect(await screen.findByRole('alert')).toHaveTextContent(accountCopy.errors.network)
  })

  it('no muestra nada sin sesión activa (RF-7)', () => {
    render(
      <AuthContext.Provider value={{ ...authValue(), user: null, status: 'anonymous' }}>
        <ThemeProvider>
          <UserMenu />
        </ThemeProvider>
      </AuthContext.Provider>,
    )
    expect(screen.queryByRole('button', { name: accountCopy.menu.trigger })).not.toBeInTheDocument()
  })
})
