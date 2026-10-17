import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { changePassword, updateProfile } from './accountApi'
import { setAccessToken } from '../../../shared/lib/http'

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

describe('accountApi', () => {
  beforeEach(() => {
    setAccessToken('token-1')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('updateProfile hace PUT autenticado a /api/users/me con nombre y color (RF-9)', async () => {
    const user = {
      uuidUser: 'u1',
      email: 'ana@example.com',
      name: 'Ana',
      role: 'USER',
      avatarColor: '#4F5DFF',
    }
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, user))
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateProfile({ name: 'Ana', avatarColor: '#4F5DFF' })).resolves.toEqual(user)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/users/me')
    expect(init.method).toBe('PUT')
    expect(init.headers.Authorization).toBe('Bearer token-1')
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana', avatarColor: '#4F5DFF' })
  })

  it('changePassword hace PUT autenticado a /api/users/me/password (RF-12)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, null))
    vi.stubGlobal('fetch', fetchMock)

    await changePassword('actual8', 'nueva123')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/users/me/password')
    expect(init.method).toBe('PUT')
    expect(init.headers.Authorization).toBe('Bearer token-1')
    expect(JSON.parse(init.body)).toEqual({ currentPassword: 'actual8', newPassword: 'nueva123' })
  })
})
