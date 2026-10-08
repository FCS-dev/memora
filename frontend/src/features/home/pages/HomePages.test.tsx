import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { AdminHomePage } from './AdminHomePage'
import { UserHomePage } from './UserHomePage'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { authCopy } from '../../auth/model/copy'

function makeAuthValue(role: 'USER' | 'ADMIN'): AuthContextValue {
  return {
    status: 'authenticated',
    user: { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role },
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
  }
}

function renderWithAuth(ui: ReactElement, value: AuthContextValue) {
  return render(<AuthContext.Provider value={value}>{ui}</AuthContext.Provider>)
}

describe('páginas de inicio', () => {
  it('la home de usuario muestra su encabezado y su nombre (RF-24)', () => {
    renderWithAuth(<UserHomePage />, makeAuthValue('USER'))

    expect(screen.getByRole('heading', { name: authCopy.titles.userHome })).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('la home de administración muestra su encabezado (RF-25)', () => {
    renderWithAuth(<AdminHomePage />, makeAuthValue('ADMIN'))

    expect(screen.getByRole('heading', { name: authCopy.titles.adminHome })).toBeInTheDocument()
  })

  it('cierra la sesión al pulsar el botón (RF-21, RF-22)', async () => {
    const value = makeAuthValue('USER')
    renderWithAuth(<UserHomePage />, value)

    await userEvent.click(screen.getByRole('button', { name: authCopy.actions.logout }))

    expect(value.signOut).toHaveBeenCalledOnce()
  })
})
