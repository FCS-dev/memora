import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, login, logout, refresh, register } from './authApi'
import { setAccessToken } from '../../../shared/lib/http'

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

describe('authApi', () => {
  beforeEach(() => {
    setAccessToken(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('register hace POST a /api/auth/register con el payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(201, null))
    vi.stubGlobal('fetch', fetchMock)

    await register({ name: 'Ana', email: 'ana@example.com', password: '12345678' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/register')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: '12345678',
    })
  })

  it('login hace POST y devuelve el accessToken', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { accessToken: 'abc' })))

    await expect(login({ email: 'ana@example.com', password: '12345678' })).resolves.toBe('abc')
  })

  it('refresh hace POST y devuelve el accessToken', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { accessToken: 'new' })))

    await expect(refresh()).resolves.toBe('new')
  })

  it('logout hace POST a /api/auth/logout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, null))
    vi.stubGlobal('fetch', fetchMock)

    await logout()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/logout')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('getMe hace GET autenticado a /api/users/me', async () => {
    const user = { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER' }
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, user))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('token-1')

    await expect(getMe()).resolves.toEqual(user)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/users/me')
    expect(init.headers.Authorization).toBe('Bearer token-1')
  })
})
