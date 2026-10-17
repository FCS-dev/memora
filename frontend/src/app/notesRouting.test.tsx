import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { AuthProvider } from '../features/auth/context/AuthProvider'
import { notesCopy } from '../features/notes/model/copy'
import { setAccessToken, setRefreshHandler } from '../shared/lib/http'

const user = { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER', avatarColor: '#4F5DFF' }

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

function stubAuthenticated() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'token-1' })
      if (url.endsWith('/users/me')) return json(200, user)
      if (url.endsWith('/notes/archived')) return json(200, [])
      if (url.endsWith('/notes')) return json(200, [])
      if (url.endsWith('/tags')) return json(200, [])
      return json(404, null)
    }),
  )
}

function renderApp(initialPath: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('rutas de notas', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra la lista de notas al usuario autenticado (RF-30)', async () => {
    stubAuthenticated()
    renderApp('/home')

    expect(
      (
        await screen.findAllByRole(
          'button',
          { name: notesCopy.actions.newNote },
          { timeout: 3000 },
        )
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Memora')).toBeInTheDocument()
  })

  it('navega al editor de creación (RF-12)', async () => {
    stubAuthenticated()
    renderApp('/home')

    const buttons = await screen.findAllByRole(
      'button',
      { name: notesCopy.actions.newNote },
      { timeout: 3000 },
    )
    await userEvent.click(buttons[0])

    expect(await screen.findByLabelText(notesCopy.labels.title)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: notesCopy.actions.newNote })).not.toBeInTheDocument()
  })
})
