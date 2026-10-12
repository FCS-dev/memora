import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken, setRefreshHandler } from '../../../shared/lib/http'
import {
  changeNoteGroup,
  createNote,
  deleteNote,
  listArchivedNotes,
  listNotes,
  reorderNote,
  updateChecklistItem,
  updateNote,
} from './notesApi'
import { createTag, listTags } from './tagsApi'
import { buildCreatePayload } from '../model/validation'
import type { NoteFormValues } from '../model/types'

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

type Call = [string, { method?: string; body?: string }]

function callsOf(fetchMock: ReturnType<typeof vi.fn>): Call[] {
  return fetchMock.mock.calls as unknown as Call[]
}

function callFor(fetchMock: ReturnType<typeof vi.fn>, suffix: string): Call | undefined {
  return callsOf(fetchMock).find((call) => call[0].endsWith(suffix))
}

function values(overrides: Partial<NoteFormValues> = {}): NoteFormValues {
  return {
    title: 'T',
    content: 'c',
    checklistMode: false,
    checklistItems: [],
    tagIds: [],
    rememberAt: '',
    isPinned: false,
    ...overrides,
  }
}

describe('notesApi y tagsApi', () => {
  beforeEach(() => {
    setAccessToken('token')
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('lista notas activas y archivadas por separado (RF-1, RF-3)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/notes/archived')) return json(200, [])
      if (url.endsWith('/notes')) return json(200, [])
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)

    await listNotes()
    await listArchivedNotes()

    expect(callFor(fetchMock, '/notes/archived')?.[0]).toBe('/api/notes/archived')
    expect(callFor(fetchMock, '/notes')?.[0]).toBe('/api/notes')
  })

  it('crea una nota con POST (RF-18)', async () => {
    const fetchMock = vi.fn(async () => json(201, { uuidNote: 'n1' }))
    vi.stubGlobal('fetch', fetchMock)

    await createNote(buildCreatePayload(values(), null))

    const call = callsOf(fetchMock)[0]
    expect(call[0]).toBe('/api/notes')
    expect(call[1].method).toBe('POST')
    expect(JSON.parse(call[1].body ?? '{}').title).toBe('T')
  })

  it('actualiza con PUT y reordena/cambia grupo con PATCH (RF-13, RF-23, RF-27)', async () => {
    const fetchMock = vi.fn(async () => json(200, { uuidNote: 'n1' }))
    vi.stubGlobal('fetch', fetchMock)

    await updateNote('n1', { ...buildCreatePayload(values(), null), isPinned: true })
    await reorderNote('n1', { beforeUuid: '', afterUuid: 'n2' })
    await changeNoteGroup('n1', { group: 'ARCHIVED' })

    expect(callsOf(fetchMock)[0][1].method).toBe('PUT')
    expect(callFor(fetchMock, '/notes/n1/position')?.[1].method).toBe('PATCH')
    expect(JSON.parse(callFor(fetchMock, '/notes/n1/group')?.[1].body ?? '{}')).toEqual({
      group: 'ARCHIVED',
    })
  })

  it('elimina con DELETE (RF-19)', async () => {
    const fetchMock = vi.fn(async () => json(204, null))
    vi.stubGlobal('fetch', fetchMock)

    await deleteNote('n1')

    expect(callsOf(fetchMock)[0][0]).toBe('/api/notes/n1')
    expect(callsOf(fetchMock)[0][1].method).toBe('DELETE')
  })

  it('marca un ítem de checklist con PATCH (RF-42)', async () => {
    const fetchMock = vi.fn(async () => json(200, { uuidNote: 'n1' }))
    vi.stubGlobal('fetch', fetchMock)

    await updateChecklistItem('n1', 'casa', true)

    const call = callsOf(fetchMock)[0]
    expect(call[0]).toBe('/api/notes/n1/checklist')
    expect(call[1].method).toBe('PATCH')
    expect(JSON.parse(call[1].body ?? '{}')).toEqual({ item: 'casa', checked: true })
  })

  it('lista y crea etiquetas (RF-16)', async () => {
    const fetchMock = vi.fn(async () => json(200, []))
    vi.stubGlobal('fetch', fetchMock)

    await listTags()
    await createTag('trabajo')

    expect(callsOf(fetchMock)[0][0]).toBe('/api/tags')
    const createCall = callsOf(fetchMock)[1]
    expect(createCall[1].method).toBe('POST')
    expect(JSON.parse(createCall[1].body ?? '{}')).toEqual({ tagName: 'trabajo' })
  })
})
