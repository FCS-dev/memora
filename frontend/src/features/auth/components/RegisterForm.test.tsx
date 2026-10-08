import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthProvider'
import { useAuth } from '../context/useAuth'
import { RegisterForm } from './RegisterForm'
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

function StatusProbe() {
  const { status } = useAuth()
  return <span data-testid="status">{status}</span>
}

function renderRegisterForm() {
  return render(
    <AuthProvider>
      <RegisterForm />
      <StatusProbe />
    </AuthProvider>,
  )
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(authCopy.labels.name), 'Ana')
  await userEvent.type(screen.getByLabelText(authCopy.labels.email), 'ana@example.com')
  await userEvent.type(screen.getByLabelText(authCopy.labels.password), '12345678')
  await userEvent.type(screen.getByLabelText(authCopy.labels.confirmPassword), '12345678')
}

describe('RegisterForm', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra errores de campos obligatorios sin llamar a la red (RF-3)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) return json(401, null)
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRegisterForm()

    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }))

    expect(await screen.findAllByText(authCopy.errors.required)).toHaveLength(4)
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/auth/register'))).toBe(
      false,
    )
  })

  it('reporta contraseñas que no coinciden (RF-6)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(401, null)))
    renderRegisterForm()

    await userEvent.type(screen.getByLabelText(authCopy.labels.name), 'Ana')
    await userEvent.type(screen.getByLabelText(authCopy.labels.email), 'ana@example.com')
    await userEvent.type(screen.getByLabelText(authCopy.labels.password), '12345678')
    await userEvent.type(screen.getByLabelText(authCopy.labels.confirmPassword), 'otra1234')
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }))

    expect(await screen.findByText(authCopy.errors.passwordMismatch)).toBeInTheDocument()
  })

  it('muestra el error de correo ya registrado ante 400 (RF-8)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/auth/refresh')) return json(401, null)
        if (url.endsWith('/auth/register')) return json(400, { detail: 'ya está registrado' })
        return json(404, null)
      }),
    )
    renderRegisterForm()

    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }))

    expect(await screen.findByText(authCopy.errors.emailTaken)).toBeInTheDocument()
  })

  it('encadena registro y login automático ante datos válidos (RF-2)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) return json(401, null)
      if (url.endsWith('/auth/register')) return json(201, null)
      if (url.endsWith('/auth/login')) return json(200, { accessToken: 'token-1' })
      if (url.endsWith('/users/me')) return json(200, user)
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderRegisterForm()

    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'))
    const urls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(urls.indexOf('/api/auth/register')).toBeLessThan(urls.indexOf('/api/auth/login'))
  })
})
