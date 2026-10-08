import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { setAccessToken, setRefreshHandler } from '../../../shared/lib/http'

const user = { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER' }

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

function makeFetch(overrides: { refreshStatus?: number; loginStatus?: number } = {}) {
  const refreshStatus = overrides.refreshStatus ?? 200
  const loginStatus = overrides.loginStatus ?? 200
  return vi.fn(async (url: string) => {
    if (url.endsWith('/auth/refresh')) {
      return refreshStatus === 200 ? json(200, { accessToken: 'token-1' }) : json(refreshStatus, null)
    }
    if (url.endsWith('/auth/login')) {
      return loginStatus === 200 ? json(200, { accessToken: 'token-1' }) : json(loginStatus, null)
    }
    if (url.endsWith('/users/me')) {
      return json(200, user)
    }
    if (url.endsWith('/auth/logout')) {
      return json(200, null)
    }
    return json(404, null)
  })
}

function Probe() {
  const { status, user: currentUser, signIn, signOut, restore } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{currentUser?.name ?? ''}</span>
      <button onClick={() => void signIn({ email: 'ana@example.com', password: '12345678' })}>
        ingresar
      </button>
      <button onClick={() => void signOut()}>salir</button>
      <button onClick={() => restore()}>reintentar</button>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restaura la sesión con cookie válida', async () => {
    vi.stubGlobal('fetch', makeFetch())
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    expect(screen.getByTestId('user')).toHaveTextContent('Ana')
  })

  it('queda anónimo si no hay cookie válida', async () => {
    vi.stubGlobal('fetch', makeFetch({ refreshStatus: 401 }))
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
  })

  it('queda en restoreError ante fallo de red y permite reintentar', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', failingFetch)
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('restoreError'))

    vi.stubGlobal('fetch', makeFetch())
    await userEvent.click(screen.getByRole('button', { name: 'reintentar' }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
  })

  it('signIn autentica y signOut vuelve a anónimo', async () => {
    vi.stubGlobal('fetch', makeFetch({ refreshStatus: 401 }))
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))

    await userEvent.click(screen.getByRole('button', { name: 'ingresar' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))

    await userEvent.click(screen.getByRole('button', { name: 'salir' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'))
  })
})
