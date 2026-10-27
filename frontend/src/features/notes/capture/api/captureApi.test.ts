import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../../../../shared/lib/http'
import { interpretNote, updateAiConsent } from './captureApi'

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

describe('captureApi', () => {
  beforeEach(() => setAccessToken('token-1'))
  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('interpreta el texto con zona y autenticación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { draft: null, warnings: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await interpretNote('comprar pan', 'America/Argentina/Buenos_Aires')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/notes/interpret')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer token-1')
    expect(JSON.parse(init.body)).toEqual({
      text: 'comprar pan',
      zoneId: 'America/Argentina/Buenos_Aires',
    })
  })

  it('actualiza el consentimiento con la versión vigente', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { aiConsent: 'GRANTED' }))
    vi.stubGlobal('fetch', fetchMock)

    await updateAiConsent('GRANTED', '1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/users/me/ai-consent')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ action: 'GRANTED', noticeVersion: '1' })
  })
})
