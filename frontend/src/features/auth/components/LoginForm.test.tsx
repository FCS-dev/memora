import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthProvider'
import { LoginForm } from './LoginForm'
import { authCopy } from '../model/copy'
import { setAccessToken, setRefreshHandler } from '../../../shared/lib/http'

const user = { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER' }

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

function renderLoginForm() {
  return render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>,
  )
}

function findLoginCall(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/auth/login'))
}

describe('LoginForm', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra un mensaje genérico ante credenciales inválidas (401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/refresh')) return json(401, null)
        if (url.endsWith('/auth/login')) return json(401, { detail: 'Credenciales inválidas' })
        return json(404, null)
      }),
    )
    renderLoginForm()

    await userEvent.type(screen.getByLabelText(authCopy.labels.email), 'ana@example.com')
    await userEvent.type(screen.getByLabelText(authCopy.labels.password), '12345678')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }))

    expect(await screen.findByText(authCopy.errors.loginGeneric)).toBeInTheDocument()
  })

  it('muestra un mensaje específico cuando la cuenta no está activa (403)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/refresh')) return json(401, null)
        if (url.endsWith('/auth/login')) return json(403, { detail: 'Cuenta no activa' })
        return json(404, null)
      }),
    )
    renderLoginForm()

    await userEvent.type(screen.getByLabelText(authCopy.labels.email), 'ana@example.com')
    await userEvent.type(screen.getByLabelText(authCopy.labels.password), '12345678')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }))

    expect(await screen.findByText(authCopy.errors.accountInactive)).toBeInTheDocument()
  })

  it('normaliza el email quitando espacios antes de enviarlo (RF-16)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) return json(401, null)
      if (url.endsWith('/auth/login')) return json(200, { accessToken: 'token-1' })
      if (url.endsWith('/users/me')) return json(200, user)
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderLoginForm()

    await userEvent.type(screen.getByLabelText(authCopy.labels.email), '  ana@example.com ')
    await userEvent.type(screen.getByLabelText(authCopy.labels.password), '12345678')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }))

    await waitFor(() => expect(findLoginCall(fetchMock)).toBeTruthy())
    const loginCall = findLoginCall(fetchMock)!
    expect(JSON.parse(loginCall[1].body)).toEqual({
      email: 'ana@example.com',
      password: '12345678',
    })
  })

  it('deshabilita el envío mientras la solicitud está en curso (RF-15)', async () => {
    let resolveLogin!: (value: Response) => void
    const pending = new Promise<Response>((resolve) => {
      resolveLogin = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/refresh')) return json(401, null)
        if (url.endsWith('/auth/login')) return pending
        if (url.endsWith('/users/me')) return json(200, user)
        return json(404, null)
      }),
    )
    renderLoginForm()

    await userEvent.type(screen.getByLabelText(authCopy.labels.email), 'ana@example.com')
    await userEvent.type(screen.getByLabelText(authCopy.labels.password), '12345678')
    await userEvent.click(screen.getByRole('button', { name: /Iniciar sesión/ }))

    const button = screen.getByRole('button', { name: /Iniciar sesión/ })
    expect(button).toBeDisabled()

    resolveLogin(json(200, { accessToken: 'token-1' }))
    await waitFor(() => expect(button).toBeEnabled())
  })
})
