import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTag, deleteTag, listTags, renameTag } from './tagsApi'
import { setAccessToken } from '../../../shared/lib/http'

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

describe('tagsApi', () => {
  beforeEach(() => {
    setAccessToken('token-1')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('listTags hace GET autenticado y devuelve noteCount (RF-19)', async () => {
    const tags = [{ id: 1, tagName: 'casa', global: false, noteCount: 2 }]
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, tags))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listTags()).resolves.toEqual(tags)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/tags')
    expect(init.headers.Authorization).toBe('Bearer token-1')
  })

  it('createTag devuelve la etiqueta con noteCount en cero (RF-20)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse(201, { id: 3, tagName: 'nueva', global: false, reused: false })),
    )

    await expect(createTag('nueva')).resolves.toEqual({
      tag: { id: 3, tagName: 'nueva', global: false, noteCount: 0 },
      reused: false,
    })
  })

  it('renameTag hace PATCH con el nuevo nombre (RF-23)', async () => {
    const renamed = { id: 5, tagName: 'hogar', global: false, noteCount: 1 }
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, renamed))
    vi.stubGlobal('fetch', fetchMock)

    await expect(renameTag(5, 'hogar')).resolves.toEqual(renamed)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/tags/5')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ tagName: 'hogar' })
  })

  it('deleteTag hace DELETE a /api/tags/{id} (RF-26)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(204, null))
    vi.stubGlobal('fetch', fetchMock)

    await deleteTag(7)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/tags/7')
    expect(init.method).toBe('DELETE')
  })
})
