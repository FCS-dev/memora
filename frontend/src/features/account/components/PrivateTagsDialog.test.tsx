import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/context/authContext'
import type { AuthContextValue } from '../../auth/context/authContext'
import { HttpError, NetworkError } from '../../../shared/lib/http'
import { subscribeTagsChanged } from '../../../shared/lib/events'
import { accountCopy } from '../model/copy'
import type { Tag } from '../../notes/model/types'
import type { TagsChangedDetail } from '../../notes/model/filters'
import { PrivateTagsDialog } from './PrivateTagsDialog'

vi.mock('../../notes/api/tagsApi', () => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
  renameTag: vi.fn(),
  deleteTag: vi.fn(),
}))

import { createTag, deleteTag, listTags, renameTag } from '../../notes/api/tagsApi'

const mockList = vi.mocked(listTags)
const mockCreate = vi.mocked(createTag)
const mockRename = vi.mocked(renameTag)
const mockDelete = vi.mocked(deleteTag)

function tag(id: number, tagName: string, global: boolean, noteCount: number): Tag {
  return { id, tagName, global, noteCount }
}

const privateTags = [tag(3, 'casa', false, 2), tag(1, 'auto', false, 0)]
const globalTags = [tag(9, 'trabajo', true, 1)]

function makeAuth(): AuthContextValue {
  return {
    status: 'authenticated',
    user: { uuidUser: 'u1', email: 'ana@example.com', name: 'Ana', role: 'USER', avatarColor: '#4F5DFF' },
    signIn: vi.fn(),
    signOut: vi.fn(),
    restore: vi.fn(),
    applyProfile: vi.fn(),
  }
}

function renderDialog(onClose = vi.fn()) {
  return render(
    <AuthContext.Provider value={makeAuth()}>
      <PrivateTagsDialog open onClose={onClose} />
    </AuthContext.Provider>,
  )
}

describe('PrivateTagsDialog', () => {
  let changed: TagsChangedDetail[]
  let unsubscribe: () => void

  beforeEach(() => {
    mockList.mockReset()
    mockCreate.mockReset()
    mockRename.mockReset()
    mockDelete.mockReset()
    mockList.mockResolvedValue([...globalTags, ...privateTags])
    changed = []
    unsubscribe = subscribeTagsChanged((detail) => changed.push(detail))
  })

  afterEach(() => {
    unsubscribe()
  })

  it('lista privadas con contador y globales en solo lectura (RF-19, RF-37)', async () => {
    renderDialog()

    const auto = await screen.findByText('auto')
    expect(auto).toBeInTheDocument()
    expect(screen.getByText('casa')).toBeInTheDocument()
    // Contadores
    expect(screen.getByLabelText('casa: 2 usos')).toBeInTheDocument()
    expect(screen.getByLabelText('trabajo: 1 usos')).toBeInTheDocument()
    // Globales en solo lectura
    expect(screen.queryByRole('button', { name: 'Renombrar trabajo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar trabajo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renombrar casa' })).toBeInTheDocument()
  })

  it('muestra el estado vacío de privadas conservando las globales (RF-19)', async () => {
    mockList.mockResolvedValue(globalTags)
    renderDialog()

    expect(await screen.findByText(accountCopy.tags.empty)).toBeInTheDocument()
    expect(screen.getByText('trabajo')).toBeInTheDocument()
  })

  it('crea una etiqueta privada y refresca el listado (RF-20)', async () => {
    mockCreate.mockResolvedValue({ tag: tag(5, 'nueva', false, 0), reused: false })
    renderDialog()
    await screen.findByText('casa')

    await userEvent.type(screen.getByLabelText(accountCopy.tags.newTagLabel), 'nueva')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.tags.create }))

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('nueva'))
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
  })

  it('rechaza crear una privada duplicada (RF-21)', async () => {
    mockCreate.mockRejectedValue(new HttpError(409, null))
    renderDialog()
    await screen.findByText('casa')

    await userEvent.type(screen.getByLabelText(accountCopy.tags.newTagLabel), 'casa')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.tags.create }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esa etiqueta ya existe')
  })

  it('avisa cuando se reutiliza una global (RF-22)', async () => {
    mockCreate.mockResolvedValue({ tag: tag(9, 'trabajo', true, 1), reused: true })
    renderDialog()
    await screen.findByText('casa')

    await userEvent.type(screen.getByLabelText(accountCopy.tags.newTagLabel), 'trabajo')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.tags.create }))

    expect(await screen.findByRole('status')).toHaveTextContent(accountCopy.tags.reusedNotice)
  })

  it('renombra una privada y refresca (RF-23)', async () => {
    mockRename.mockResolvedValue(tag(3, 'hogar', false, 2))
    renderDialog()
    await screen.findByText('casa')

    await userEvent.click(screen.getByRole('button', { name: 'Renombrar casa' }))
    const input = screen.getByLabelText('Renombrar etiqueta casa')
    await userEvent.clear(input)
    await userEvent.type(input, 'hogar')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar casa' }))

    await waitFor(() => expect(mockRename).toHaveBeenCalledWith(3, 'hogar'))
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
    expect(changed.at(-1)).toEqual({})
  })

  it('rechaza renombrar a una privada existente (RF-24)', async () => {
    mockRename.mockRejectedValue(new HttpError(409, null))
    renderDialog()
    await screen.findByText('casa')

    await userEvent.click(screen.getByRole('button', { name: 'Renombrar casa' }))
    const input = screen.getByLabelText('Renombrar etiqueta casa')
    await userEvent.clear(input)
    await userEvent.type(input, 'auto')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar casa' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esa etiqueta ya existe')
  })

  it('fusiona en la global al renombrar a su nombre (RF-25)', async () => {
    mockRename.mockResolvedValue(tag(9, 'trabajo', true, 2))
    renderDialog()
    await screen.findByText('casa')

    await userEvent.click(screen.getByRole('button', { name: 'Renombrar casa' }))
    const input = screen.getByLabelText('Renombrar etiqueta casa')
    await userEvent.clear(input)
    await userEvent.type(input, 'trabajo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar casa' }))

    await waitFor(() => expect(mockRename).toHaveBeenCalledWith(3, 'trabajo'))
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
    expect(changed.at(-1)).toEqual({ merged: [{ fromId: 3, toId: 9 }], deleted: [3] })
  })

  it('elimina una privada tras confirmar (RF-26)', async () => {
    mockDelete.mockResolvedValue(undefined)
    renderDialog()
    await screen.findByText('casa')

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar casa' }))
    const dialog = screen.getByRole('dialog', { name: accountCopy.tags.confirmDeleteTitle })
    await userEvent.click(within(dialog).getByRole('button', { name: accountCopy.tags.delete }))

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(3))
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
    expect(changed.at(-1)).toEqual({ deleted: [3] })
  })

  it('cierra con Escape como cancelar', async () => {
    const onClose = vi.fn()
    renderDialog(onClose)
    await screen.findByText('casa')

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('con la confirmación abierta, Escape cierra solo la confirmación y restaura el foco', async () => {
    const onClose = vi.fn()
    renderDialog(onClose)
    await screen.findByText('casa')

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar casa' }))
    expect(screen.getByRole('dialog', { name: accountCopy.tags.confirmDeleteTitle })).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(
      screen.queryByRole('dialog', { name: accountCopy.tags.confirmDeleteTitle }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: accountCopy.tags.title })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Eliminar casa' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('muestra error con reintento si la carga falla (RF-38)', async () => {
    mockList.mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce([...globalTags, ...privateTags])
    renderDialog()

    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.tags.retry }))

    expect(await screen.findByText('casa')).toBeInTheDocument()
  })

  it('informa un fallo de red al crear y conserva el estado (RF-39)', async () => {
    mockCreate.mockRejectedValue(new NetworkError())
    renderDialog()
    await screen.findByText('casa')

    const input = screen.getByLabelText(accountCopy.tags.newTagLabel)
    await userEvent.type(input, 'nueva')
    await userEvent.click(screen.getByRole('button', { name: accountCopy.tags.create }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error')
    expect(input).toHaveValue('nueva')
    expect(screen.getByText('casa')).toBeInTheDocument()
  })

  it('pagina la lista de privadas (RF-19)', async () => {
    const many = Array.from({ length: 6 }, (_, index) => tag(index + 1, `tag${index + 1}`, false, 0))
    mockList.mockResolvedValue(many)
    renderDialog()

    await screen.findByText('tag1')
    expect(screen.getByText('tag5')).toBeInTheDocument()
    expect(screen.queryByText('tag6')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: accountCopy.tags.next }))

    expect(await screen.findByText('tag6')).toBeInTheDocument()
  })
})
