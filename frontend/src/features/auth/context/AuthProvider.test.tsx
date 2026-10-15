import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { setAccessToken, setRefreshHandler } from '../../../shared/lib/http'

const user = { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER' as const }

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

function makeFetch() {
  return vi.fn(async (url: string) => {
    if (url.endsWith('/auth/refresh')) {
      return json(200, { accessToken: 'token-1' })
    }
    if (url.endsWith('/users/me')) {
      return json(200, user)
    }
    return json(404, null)
  })
}

function Probe() {
  const { user: currentUser, applyProfile } = useAuth()
  return (
    <div>
      <span data-testid="name">{currentUser?.name ?? ''}</span>
      <button onClick={() => applyProfile({ ...user, name: 'Ana Pérez' })}>renombrar</button>
    </div>
  )
}

describe('AuthProvider.applyProfile', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandler(null)
  })

  it('refleja el nombre actualizado sin recargar (RF-9)', async () => {
    vi.stubGlobal('fetch', makeFetch())
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Ana'))

    await userEvent.click(screen.getByRole('button', { name: 'renombrar' }))

    expect(screen.getByTestId('name')).toHaveTextContent('Ana Pérez')
  })
})
