import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HomeHeader } from './HomeHeader'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { accountCopy } from '../../account/model/copy'

function authValue(): AuthContextValue {
  return {
    status: 'authenticated',
    user: { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER', avatarColor: '#4F5DFF' },
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
    applyProfile: vi.fn(),
  }
}

function renderHeader(extra: Partial<AuthContextValue> = {}) {
  const value = { ...authValue(), ...extra }
  return render(
    <AuthContext.Provider value={value}>
      <HomeHeader />
    </AuthContext.Provider>,
  )
}

describe('HomeHeader', () => {
  it('muestra la marca y el menú de usuario en lugar del botón suelto (RF-1, RF-6)', () => {
    renderHeader()

    expect(screen.getByText('Memora')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: accountCopy.menu.trigger })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })

  it('ofrece el cierre de sesión dentro del menú', async () => {
    renderHeader()

    await userEvent.click(screen.getByRole('button', { name: accountCopy.menu.trigger }))

    expect(screen.getByRole('menuitem', { name: accountCopy.menu.logout })).toBeInTheDocument()
  })
})
