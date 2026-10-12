import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { setAccessToken, setRefreshHandler } from '../../../shared/lib/http'
import { NotesPanel } from '../components/NotesPanel'
import { NotesPage } from './NotesPage'
import { notesCopy } from '../model/copy'
import type { Note } from '../model/types'

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

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  } as Response
}

const noop = () => {}

function authValue(): AuthContextValue {
  return {
    status: 'authenticated',
    user: { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER' },
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
  }
}

function renderWithAuth(ui: ReactElement) {
  return render(<AuthContext.Provider value={authValue()}>{ui}</AuthContext.Provider>)
}

describe('NotesPanel', () => {
  const base = {
    title: 'Panel',
    viewMode: 'list' as const,
    onRetry: noop,
    onOpen: noop,
    onTogglePin: noop,
    onArchive: noop,
    onRestore: noop,
    onDelete: noop,
    onReorder: noop,
  }

  it('muestra el estado de carga (RF-9)', () => {
    render(
      <NotesPanel
        {...base}
        loading
        error={null}
        sections={[{ id: 's', title: 'S', notes: [], reorderEnabled: true }]}
      />,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('muestra el error y permite reintentar (RF-11)', async () => {
    const onRetry = vi.fn()
    render(
      <NotesPanel
        {...base}
        onRetry={onRetry}
        loading={false}
        error="falló"
        sections={[{ id: 's', title: 'S', notes: [], reorderEnabled: true }]}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('falló')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.retry }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('no muestra nada en una sección vacía (RF-10)', () => {
    const { container } = render(
      <NotesPanel
        {...base}
        loading={false}
        error={null}
        sections={[{ id: 's', title: 'S', notes: [], reorderEnabled: true }]}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('NotesPage (listado)', () => {
  beforeEach(() => {
    setAccessToken('token')
    setRefreshHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('carga las notas y confirma la eliminación (RF-1, RF-19, RF-20)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/tags')) return json(200, [])
      if (url.endsWith('/notes/archived')) return json(200, [])
      if (url.endsWith('/notes/N1')) return json(204, null)
      if (url.endsWith('/notes')) return json(200, [note('N1', 'Mi nota')])
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithAuth(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<NotesPage mode="list" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Mi nota')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.delete }))
    expect(screen.getByRole('dialog', { name: notesCopy.confirm.deleteTitle })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.confirm }))

    await waitFor(() =>
      expect(
        (fetchMock.mock.calls as unknown as Array<[string, { method?: string }]>).some(
          (call) => call[0].endsWith('/notes/N1') && call[1].method === 'DELETE',
        ),
      ).toBe(true),
    )
  })

  it('marca un ítem de checklist con PATCH sin abrir la nota (RF-42)', async () => {
    const checklist = note('C1', 'Lista', {
      checklistMode: true,
      checklistItems: { casa: false, pasto: false },
    })
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/tags')) return json(200, [])
      if (url.endsWith('/notes/archived')) return json(200, [])
      if (url.endsWith('/notes/C1/checklist'))
        return json(200, { ...checklist, checklistItems: { casa: true, pasto: false } })
      if (url.endsWith('/notes')) return json(200, [checklist])
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithAuth(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<NotesPage mode="list" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Lista')).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('checkbox', { name: `${notesCopy.labels.checklistItemCheck}: casa` }),
    )

    await waitFor(() =>
      expect(
        (fetchMock.mock.calls as unknown as Array<[string, { method?: string }]>).some(
          (call) => call[0].endsWith('/notes/C1/checklist') && call[1].method === 'PATCH',
        ),
      ).toBe(true),
    )
  })

  it('precarga la nota al abrir la ruta de edición (RF-12)', async () => {
    const checklist = note('C1', 'Lista', {
      checklistMode: true,
      checklistItems: { casa: true },
    })
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/tags')) return json(200, [])
      if (url.endsWith('/notes/archived')) return json(200, [])
      if (url.endsWith('/notes')) return json(200, [checklist])
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithAuth(
      <MemoryRouter initialEntries={['/home/C1']}>
        <Routes>
          <Route path="/home/:uuid" element={<NotesPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByLabelText(notesCopy.labels.title)).toHaveValue('Lista'),
    )
    expect(screen.getByLabelText('Marcar ítem 1')).toBeChecked()
  })

  it('alterna entre Notas y Archivadas (RF-1, RF-2)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/tags')) return json(200, [])
      if (url.endsWith('/notes/archived')) return json(200, [note('A', 'Mi archivada', { isArchived: true })])
      if (url.endsWith('/notes')) return json(200, [note('N', 'Mi nota')])
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderWithAuth(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<NotesPage mode="list" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Mi nota')).toBeInTheDocument()
    expect(screen.queryByText('Mi archivada')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.panels.archived }))

    expect(await screen.findByText('Mi archivada')).toBeInTheDocument()
    expect(screen.queryByText('Mi nota')).not.toBeInTheDocument()
  })

  it('usa ancho 100% por debajo de 2560px y 90% desde 2560px (RF-44)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/tags')) return json(200, [])
      if (url.endsWith('/notes/archived')) return json(200, [])
      if (url.endsWith('/notes')) return json(200, [note('N', 'Mi nota')])
      return json(404, null)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { container } = renderWithAuth(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<NotesPage mode="list" />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('Mi nota')
    const main = container.querySelector('main')!
    expect(main.className).toContain('w-full')
    expect(main.className).toContain('min-[2560px]:w-[90%]')
    expect(main.className).not.toContain('lg:w-[90%]')
  })
})
