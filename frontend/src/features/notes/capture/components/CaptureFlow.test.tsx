import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../../auth/context/authContext'
import type { AuthContextValue } from '../../../auth/context/authContext'
import type { AuthUser } from '../../../auth/model/types'
import { HttpError } from '../../../../shared/lib/http'
import type { Tag } from '../../model/types'
import { CaptureFlow } from './CaptureFlow'
import { captureCopy } from '../model/copy'
import { notesCopy } from '../../model/copy'

vi.mock('../api/captureApi', () => ({
  interpretNote: vi.fn(),
  updateAiConsent: vi.fn(),
}))

import { interpretNote, updateAiConsent } from '../api/captureApi'

const mockInterpret = vi.mocked(interpretNote)
const mockUpdateConsent = vi.mocked(updateAiConsent)

const tags: Tag[] = [{ id: 1, tagName: 'casa', global: false, noteCount: 1 }]

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    uuidUser: 'u1',
    email: 'ana@example.com',
    name: 'Ana',
    role: 'USER',
    avatarColor: '#4F5DFF',
    aiEnabled: true,
    aiConsent: 'GRANTED',
    aiConsentRequired: false,
    aiConsentNoticeVersion: '1',
    ...overrides,
  }
}

function auth(current: AuthUser, applyProfile = vi.fn()): AuthContextValue {
  return {
    status: 'authenticated',
    user: current,
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
    applyProfile,
  }
}

function renderFlow(current: AuthUser, tagsStatus: 'loading' | 'ready' | 'error' = 'ready') {
  return render(
    <AuthContext.Provider value={auth(current)}>
      <CaptureFlow
        open
        tags={tags}
        tagsStatus={tagsStatus}
        onClose={vi.fn()}
        onManual={vi.fn()}
        onCreateTag={vi.fn()}
        onSave={vi.fn()}
      />
    </AuthContext.Provider>,
  )
}

describe('CaptureFlow', () => {
  beforeEach(() => {
    mockInterpret.mockReset()
    mockUpdateConsent.mockReset()
  })

  it('revisa, interpreta y abre el editor con el borrador', async () => {
    mockInterpret.mockResolvedValue({
      draft: {
        title: 'Comprar pan',
        content: '',
        checklistMode: false,
        checklistItems: [],
        rememberAt: null,
        tagIds: [],
      },
      warnings: [],
    })
    renderFlow(user())

    await userEvent.type(screen.getByPlaceholderText(captureCopy.placeholder), 'comprar pan')
    await userEvent.click(screen.getByRole('button', { name: captureCopy.review }))

    expect(await screen.findByDisplayValue('Comprar pan')).toBeInTheDocument()
    expect(mockInterpret).toHaveBeenCalledWith('comprar pan', expect.any(String))
    expect(screen.getByText(captureCopy.originalText)).toBeInTheDocument()
  })

  it('pide consentimiento cuando está sin decidir y no lo envía al cerrar', async () => {
    const current = user({ aiConsent: 'NOT_SET', aiConsentRequired: true })
    renderFlow(current)

    await userEvent.type(screen.getByPlaceholderText(captureCopy.placeholder), 'texto')
    await userEvent.click(screen.getByRole('button', { name: captureCopy.review }))

    expect(await screen.findByRole('dialog', { name: captureCopy.consent.title })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: captureCopy.consent.close }))

    expect(mockUpdateConsent).not.toHaveBeenCalled()
    expect((await screen.findAllByDisplayValue('texto')).length).toBeGreaterThan(0)
  })

  it('abre el editor manual directo si la IA está deshabilitada', async () => {
    renderFlow(user({ aiEnabled: false }))

    expect(screen.queryByRole('dialog', { name: captureCopy.title })).not.toBeInTheDocument()
    expect(screen.getByLabelText(notesCopy.labels.title)).toBeInTheDocument()
  })

  it('abre el editor manual directo si las etiquetas fallan', async () => {
    renderFlow(user(), 'error')

    expect(await screen.findByText(captureCopy.warnings.TAGS_UNAVAILABLE)).toBeInTheDocument()
    expect(screen.getByLabelText(notesCopy.labels.title)).toBeInTheDocument()
  })

  it('abre el editor manual si hay varias intenciones', async () => {
    mockInterpret.mockResolvedValue({ draft: null, warnings: ['MULTIPLE_INTENTS'] })
    renderFlow(user())

    await userEvent.type(screen.getByPlaceholderText(captureCopy.placeholder), 'dos notas')
    await userEvent.click(screen.getByRole('button', { name: captureCopy.review }))

    expect(await screen.findByText(captureCopy.warnings.MULTIPLE_INTENTS)).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('dos notas').length).toBeGreaterThan(0)
  })

  it('conserva el texto al cancelar la interpretación y descarta la respuesta tardía', async () => {
    let resolve: (value: { draft: null; warnings: [] }) => void = () => {}
    mockInterpret.mockReturnValue(new Promise((done) => { resolve = done }))
    renderFlow(user())

    const textarea = screen.getByPlaceholderText(captureCopy.placeholder)
    await userEvent.type(textarea, 'texto')
    await userEvent.click(screen.getByRole('button', { name: captureCopy.review }))
    await userEvent.click(screen.getByRole('button', { name: captureCopy.cancel }))

    expect(screen.getByPlaceholderText(captureCopy.placeholder)).toHaveValue('texto')
    resolve({ draft: null, warnings: [] })
    await waitFor(() => expect(screen.getByPlaceholderText(captureCopy.placeholder)).toHaveValue('texto'))
    expect(screen.queryByLabelText(notesCopy.labels.title)).not.toBeInTheDocument()
  })

  it('no interpreta código y abre el editor manual sin respuesta de IA', async () => {
    mockInterpret.mockRejectedValue(new HttpError(422, { detail: 'Solo puedo convertir notas, recordatorios y tareas' }))
    renderFlow(user())

    await userEvent.type(screen.getByPlaceholderText(captureCopy.placeholder), 'haz el código hola mundo en python')
    await userEvent.click(screen.getByRole('button', { name: captureCopy.review }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Solo puedo convertir notas, recordatorios y tareas')
    expect(screen.getByText(captureCopy.warnings.OUT_OF_SCOPE)).toBeInTheDocument()
    expect(screen.getByLabelText(notesCopy.labels.title)).toBeInTheDocument()
    expect(screen.queryByText(/print\(/)).not.toBeInTheDocument()
  })

  it('abre el editor manual y muestra el aviso de cuota', async () => {
    mockInterpret.mockRejectedValue(new HttpError(429, { detail: 'cuota' }))
    renderFlow(user())

    await userEvent.type(screen.getByPlaceholderText(captureCopy.placeholder), 'texto')
    await userEvent.click(screen.getByRole('button', { name: captureCopy.review }))

    expect(await screen.findByRole('alert')).toHaveTextContent(captureCopy.quota)
    expect(screen.getByLabelText(notesCopy.labels.title)).toBeInTheDocument()
  })
})
