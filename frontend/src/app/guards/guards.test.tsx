import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import { PublicOnly } from './PublicOnly'
import { AuthContext } from '../../features/auth/context/authContext'
import type { AuthContextValue } from '../../features/auth/context/authContext'

function makeAuthValue(
  status: AuthContextValue['status'],
  role: 'USER' | 'ADMIN' | null,
): AuthContextValue {
  return {
    status,
    user: role ? { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role } : null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
    applyProfile: vi.fn(),
  }
}

function renderProtected(value: AuthContextValue) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthContext.Provider value={value}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireRole role="ADMIN">
                  <div>panel admin</div>
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="/home" element={<div>home usuario</div>} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <div>formulario login</div>
              </PublicOnly>
            }
          />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('guards', () => {
  it('sin sesión redirige a /login (RF-28)', () => {
    renderProtected(makeAuthValue('anonymous', null))

    expect(screen.getByText('formulario login')).toBeInTheDocument()
  })

  it('con rol incorrecto redirige a la home propia (RF-26)', () => {
    renderProtected(makeAuthValue('authenticated', 'USER'))

    expect(screen.getByText('home usuario')).toBeInTheDocument()
  })

  it('permite el acceso con el rol correcto (RF-24, RF-25)', () => {
    renderProtected(makeAuthValue('authenticated', 'ADMIN'))

    expect(screen.getByText('panel admin')).toBeInTheDocument()
  })

  it('PublicOnly redirige a la home del rol si ya hay sesión (RF-27)', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthContext.Provider value={makeAuthValue('authenticated', 'USER')}>
          <Routes>
            <Route path="/home" element={<div>home usuario</div>} />
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <div>formulario login</div>
                </PublicOnly>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByText('home usuario')).toBeInTheDocument()
  })
})
