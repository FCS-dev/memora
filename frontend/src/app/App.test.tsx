import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { AuthProvider } from '../features/auth/context/AuthProvider'
import { authCopy } from '../features/auth/model/copy'
import { setAccessToken, setRefreshHandler } from '../shared/lib/http'

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

describe('App', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra el login a un visitante sin sesión', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(401, null)))

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(
      await screen.findByRole('heading', { name: authCopy.titles.login }),
    ).toBeInTheDocument()
  })
})
