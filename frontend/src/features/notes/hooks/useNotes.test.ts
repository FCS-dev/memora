import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotes } from './useNotes'
import { setAccessToken, setRefreshHandler } from '../../../shared/lib/http'
import type { Note } from '../model/types'

const A: Note = {
  uuidNote: 'A',
  title: 'A',
  content: '',
  checklistMode: false,
  checklistItems: null,
  rememberAt: null,
  isPinned: false,
  isArchived: false,
  tags: [],
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
}

const CHECKLIST: Note = {
  ...A,
  uuidNote: 'C',
  title: 'C',
  checklistMode: true,
  checklistItems: { uno: true, dos: false },
}

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

describe('useNotes', () => {
  beforeEach(() => {
    setAccessToken('token')
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('carga notas activas y archivadas (RF-9, RF-3)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/notes/archived') ? json(200, []) : json(200, [A]),
      ),
    )

    const { result } = renderHook(() => useNotes())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notes).toHaveLength(1)
  })

  it('fija de forma optimista (RF-27)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/notes/archived')) return json(200, [])
        if (url.endsWith('/notes/A/group')) return json(200, { ...A, isPinned: true })
        if (url.endsWith('/notes')) return json(200, [A])
        return json(404, null)
      }),
    )

    const { result } = renderHook(() => useNotes())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setPinned('A', true)
    })
    expect(result.current.notes[0].isPinned).toBe(true)
  })

  it('revierte si el servidor falla (RNF-7)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/notes/archived')) return json(200, [])
        if (url.endsWith('/notes/A/group')) return json(500, null)
        if (url.endsWith('/notes')) return json(200, [A])
        return json(404, null)
      }),
    )

    const { result } = renderHook(() => useNotes())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok = true
    await act(async () => {
      ok = await result.current.setPinned('A', true)
    })

    expect(ok).toBe(false)
    expect(result.current.notes[0].isPinned).toBe(false)
    expect(result.current.error).not.toBeNull()
  })

  it('marca un ítem de checklist de forma optimista (RF-42)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/notes/archived')) return json(200, [])
        if (url.endsWith('/notes/C/checklist'))
          return json(200, { ...CHECKLIST, checklistItems: { uno: true, dos: true } })
        if (url.endsWith('/notes')) return json(200, [CHECKLIST])
        return json(404, null)
      }),
    )

    const { result } = renderHook(() => useNotes())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setChecklistItemChecked('C', 'dos', true)
    })

    expect(result.current.notes[0].checklistItems?.dos).toBe(true)
  })

  it('revierte el marcado de checklist si el servidor falla (RNF-7)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/notes/archived')) return json(200, [])
        if (url.endsWith('/notes/C/checklist')) return json(500, null)
        if (url.endsWith('/notes')) return json(200, [CHECKLIST])
        return json(404, null)
      }),
    )

    const { result } = renderHook(() => useNotes())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok = true
    await act(async () => {
      ok = await result.current.setChecklistItemChecked('C', 'dos', true)
    })

    expect(ok).toBe(false)
    expect(result.current.notes[0].checklistItems?.dos).toBe(false)
    expect(result.current.error).not.toBeNull()
  })
})
