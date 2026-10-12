import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HttpError,
  NetworkError,
  request,
  setAccessToken,
  setRefreshHandler,
  setUnauthorizedHandler,
} from './http'

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

describe('http', () => {
  beforeEach(() => {
    setAccessToken(null)
    setRefreshHandler(null)
    setUnauthorizedHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('antepone /api, envía credenciales y adjunta Bearer cuando auth=true', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('token-1')

    await request('/users/me', { auth: true })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/users/me')
    expect(init.credentials).toBe('include')
    expect(init.headers.Authorization).toBe('Bearer token-1')
  })

  it('reintenta tras 401 refrescando una sola vez (single-flight)', async () => {
    let refreshCalls = 0
    setRefreshHandler(async () => {
      refreshCalls += 1
      return 'token-2'
    })
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>
      return Promise.resolve(
        headers.Authorization === 'Bearer token-2'
          ? fakeResponse(200, { ok: true })
          : fakeResponse(401, { detail: 'Credenciales inválidas' }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    setAccessToken('token-1')

    await Promise.all([request('/a', { auth: true }), request('/b', { auth: true })])

    expect(refreshCalls).toBe(1)
  })

  it('lanza HttpError con el estado cuando la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(403, { detail: 'no' })))
    setAccessToken('token-1')

    await expect(request('/x', { auth: true })).rejects.toMatchObject({ status: 403 })
  })

  it('lanza NetworkError cuando fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))

    await expect(request('/x')).rejects.toBeInstanceOf(NetworkError)
  })

  it('no refresca en 401 si auth=false', async () => {
    let refreshCalls = 0
    setRefreshHandler(async () => {
      refreshCalls += 1
      return 'token-2'
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(401, null)))

    await expect(request('/auth/login', { method: 'POST' })).rejects.toBeInstanceOf(HttpError)
    expect(refreshCalls).toBe(0)
  })

  it('avisa al manejador de sesión cuando el refresh falla en 401', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    setRefreshHandler(async () => {
      throw new HttpError(401, null)
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(401, { detail: 'expirado' })))
    setAccessToken('token-1')

    await expect(request('/notes', { auth: true })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('no marca 403 como sesión expirada ni refresca', async () => {
    let refreshCalls = 0
    setRefreshHandler(async () => {
      refreshCalls += 1
      return 'token-2'
    })
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(403, null)))
    setAccessToken('token-1')

    await expect(request('/notes', { auth: true })).rejects.toMatchObject({ status: 403 })
    expect(refreshCalls).toBe(0)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
