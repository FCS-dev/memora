import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { NotesFilterProvider } from '../context/NotesFilterProvider'
import { emitTagsChanged } from '../../../shared/lib/events'
import { setAccessToken, setRefreshHandler } from '../../../shared/lib/http'
import { notesCopy } from '../model/copy'
import { NotesPage } from './NotesPage'
import type { Note, Tag } from '../model/types'

function note(uuidNote: string, title: string, overrides: Partial<Note> = {}): Note {
  return {
    uuidNote,
    title,
    content: 'contenido',
    checklistMode: false,
    checklistItems: null,
    rememberAt: null,
    isPinned: false,
    isArchived: false,
    tags: [],
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function tag(id: number, tagName: string, noteCount = 1): Tag {
  return { id, tagName, global: false, noteCount }
}

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

function authValue(): AuthContextValue {
  return {
    status: 'authenticated',
    user: { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER', avatarColor: '#4F5DFF' },
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
    applyProfile: vi.fn(),
  }
}

function listFetch(notes: Note[], tags: Tag[]) {
  return vi.fn(async (url: string, init?: { method?: string }) => {
    if (url.endsWith('/tags')) return json(200, tags)
    if (url.endsWith('/notes/archived')) return json(200, [])
    if (init?.method === 'DELETE' && url.includes('/notes/')) return json(204, null)
    if (url.endsWith('/notes')) return json(200, notes)
    return json(404, null)
  })
}

function renderList() {
  return render(
    <AuthContext.Provider value={authValue()}>
      <NotesFilterProvider>
        <MemoryRouter initialEntries={['/home']}>
          <Routes>
            <Route path="/home" element={<NotesPage mode="list" />} />
          </Routes>
        </MemoryRouter>
      </NotesFilterProvider>
    </AuthContext.Provider>,
  )
}

describe('NotesPage · filtros', () => {
  beforeEach(() => {
    setAccessToken('token')
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('filtra por recordatorio (RF-2, RF-8)', async () => {
    const notes = [
      note('A', 'Recordada', { rememberAt: '2999-01-01T00:00' }),
      note('B', 'Sin recordatorio'),
    ]
    vi.stubGlobal('fetch', listFetch(notes, []))
    renderList()
    await screen.findByText('Sin recordatorio')

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.reminder }))

    expect(screen.getByText('Recordada')).toBeInTheDocument()
    expect(screen.queryByText('Sin recordatorio')).not.toBeInTheDocument()
  })

  it('filtra por etiqueta desde la hoja (RF-3, RF-4)', async () => {
    const notes = [note('A', 'De casa', { tags: ['casa'] }), note('B', 'De trabajo', { tags: ['trabajo'] })]
    const tags = [tag(1, 'casa'), tag(2, 'trabajo')]
    vi.stubGlobal('fetch', listFetch(notes, tags))
    renderList()
    await screen.findByText('De casa')

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.viewAll }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'casa' }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.close }))

    expect(screen.getByText('De casa')).toBeInTheDocument()
    expect(screen.queryByText('De trabajo')).not.toBeInTheDocument()
  })

  it('oculta el reordenamiento con filtro activo (RF-12)', async () => {
    const notes = [note('A', 'Nota', { rememberAt: '2999-01-01T00:00' })]
    vi.stubGlobal('fetch', listFetch(notes, []))
    renderList()
    await screen.findByText('Nota')
    expect(screen.getAllByLabelText(notesCopy.labels.dragHandle).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.reminder }))

    expect(screen.queryAllByLabelText(notesCopy.labels.dragHandle)).toHaveLength(0)
  })

  it('muestra el vacío del filtro con prioridad sobre el del panel (RF-10)', async () => {
    const notes = [note('A', 'Sin recordatorio')]
    vi.stubGlobal('fetch', listFetch(notes, []))
    renderList()
    await screen.findByText('Sin recordatorio')

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.reminder }))

    expect(screen.getByText(notesCopy.empty.filterReminderTitle)).toBeInTheDocument()
    expect(screen.queryByText(notesCopy.empty.notesTitle)).not.toBeInTheDocument()
  })

  it('persiste el filtro al cambiar de panel (RF-14)', async () => {
    const notes = [note('A', 'Recordada', { rememberAt: '2999-01-01T00:00' })]
    vi.stubGlobal('fetch', listFetch(notes, []))
    renderList()
    await screen.findByText('Recordada')

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.reminder }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.panels.archived }))

    expect(screen.getByRole('button', { name: notesCopy.filters.reminder })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('conserva el filtro al abrir y volver de una nota (RF-14)', async () => {
    const notes = [note('A', 'Recordada', { rememberAt: '2999-01-01T00:00' })]
    vi.stubGlobal('fetch', listFetch(notes, []))
    render(
      <AuthContext.Provider value={authValue()}>
        <NotesFilterProvider>
          <MemoryRouter initialEntries={['/home']}>
            <Routes>
              <Route path="/home" element={<NotesPage mode="list" />} />
              <Route path="/home/:uuid" element={<NotesPage mode="edit" />} />
            </Routes>
          </MemoryRouter>
        </NotesFilterProvider>
      </AuthContext.Provider>,
    )
    await screen.findByText('Recordada')

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.reminder }))
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Recordada' }))
    await waitFor(() =>
      expect(screen.getByLabelText(notesCopy.labels.title)).toHaveValue('Recordada'),
    )

    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.cancel }))

    expect(await screen.findByRole('button', { name: notesCopy.filters.reminder })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('poda la selección cuando se elimina una etiqueta (RF-13)', async () => {
    const notes = [note('A', 'De casa', { tags: ['casa'] })]
    const tags = [tag(1, 'casa')]
    vi.stubGlobal('fetch', listFetch(notes, tags))
    renderList()
    await screen.findByText('De casa')

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.viewAll }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'casa' }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.close }))

    act(() => emitTagsChanged({ deleted: [1] }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'casa' })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('De casa')).toBeInTheDocument()
  })

  it('muestra error de etiquetas con reintento (RF-3)', async () => {
    const notes = [note('A', 'Nota', { tags: ['casa'] })]
    const tags = [tag(1, 'casa')]
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/tags')) {
          calls += 1
          return calls === 1 ? json(500, null) : json(200, tags)
        }
        if (url.endsWith('/notes/archived')) return json(200, [])
        if (url.endsWith('/notes')) return json(200, notes)
        return json(404, null)
      }),
    )
    renderList()
    await screen.findByText('Nota')

    expect(await screen.findByRole('alert')).toHaveTextContent(notesCopy.filters.tagsError)
    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.retryTags }))

    expect(await screen.findByRole('button', { name: 'casa' })).toBeInTheDocument()
  })
})
