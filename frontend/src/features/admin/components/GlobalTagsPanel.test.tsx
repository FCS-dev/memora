import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../shared/lib/http'
import { GlobalTagsPanel } from './GlobalTagsPanel'
import { adminTagsCopy } from '../model/copy'
import * as api from '../api/adminTagsApi'

vi.mock('../api/adminTagsApi', () => ({
  listGlobalTags: vi.fn(),
  createGlobalTag: vi.fn(),
  renameGlobalTag: vi.fn(),
  deleteGlobalTag: vi.fn(),
}))

const listGlobalTags = vi.mocked(api.listGlobalTags)
const createGlobalTag = vi.mocked(api.createGlobalTag)
const renameGlobalTag = vi.mocked(api.renameGlobalTag)
const deleteGlobalTag = vi.mocked(api.deleteGlobalTag)

describe('GlobalTagsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista las etiquetas globales con su conteo de notas (RF-2)', async () => {
    listGlobalTags.mockResolvedValue([{ id: 1, tagName: 'casa', noteCount: 3 }])

    render(<GlobalTagsPanel />)

    expect(await screen.findByText('casa')).toBeInTheDocument()
    expect(screen.getByText('3 Notas')).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay etiquetas (RF-2)', async () => {
    listGlobalTags.mockResolvedValue([])

    render(<GlobalTagsPanel />)

    expect(await screen.findByText(adminTagsCopy.empty.title)).toBeInTheDocument()
  })

  it('crea una etiqueta global (RF-1)', async () => {
    listGlobalTags.mockResolvedValue([])
    createGlobalTag.mockResolvedValue({ id: 2, tagName: 'nueva', noteCount: 0 })

    render(<GlobalTagsPanel />)

    await userEvent.type(screen.getByLabelText(adminTagsCopy.labels.newTag), 'nueva')
    await userEvent.click(screen.getByRole('button', { name: adminTagsCopy.actions.create }))

    expect(createGlobalTag).toHaveBeenCalledWith('nueva')
    expect(await screen.findByText('nueva')).toBeInTheDocument()
  })

  it('muestra el error de duplicado al crear (RF-5, RF-21)', async () => {
    listGlobalTags.mockResolvedValue([])
    createGlobalTag.mockRejectedValue(new HttpError(409, { detail: 'duplicado' }))

    render(<GlobalTagsPanel />)

    await userEvent.type(screen.getByLabelText(adminTagsCopy.labels.newTag), 'casa')
    await userEvent.click(screen.getByRole('button', { name: adminTagsCopy.actions.create }))

    expect(await screen.findByText(adminTagsCopy.errors.duplicate)).toBeInTheDocument()
  })

  it('renombra una etiqueta global (RF-3)', async () => {
    listGlobalTags.mockResolvedValue([{ id: 1, tagName: 'casa', noteCount: 0 }])
    renameGlobalTag.mockResolvedValue({ id: 1, tagName: 'hogar', noteCount: 0 })

    render(<GlobalTagsPanel />)

    await userEvent.click(await screen.findByRole('button', { name: adminTagsCopy.actions.rename }))
    const input = screen.getByLabelText(adminTagsCopy.labels.rename)
    await userEvent.clear(input)
    await userEvent.type(input, 'hogar')
    await userEvent.click(screen.getByRole('button', { name: adminTagsCopy.actions.save }))

    expect(renameGlobalTag).toHaveBeenCalledWith(1, 'hogar')
    expect(await screen.findByText('hogar')).toBeInTheDocument()
  })

  it('elimina una etiqueta global con confirmación (RF-4)', async () => {
    listGlobalTags.mockResolvedValue([{ id: 1, tagName: 'casa', noteCount: 0 }])
    deleteGlobalTag.mockResolvedValue(undefined)

    render(<GlobalTagsPanel />)

    await userEvent.click(await screen.findByRole('button', { name: adminTagsCopy.actions.delete }))
    const dialog = screen.getByRole('dialog', { name: adminTagsCopy.confirm.deleteTitle })
    await userEvent.click(
      within(dialog).getByRole('button', { name: adminTagsCopy.actions.delete }),
    )

    expect(deleteGlobalTag).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText('casa')).not.toBeInTheDocument())
  })

  it('muestra el error de carga (RF-2)', async () => {
    listGlobalTags.mockRejectedValue(new Error('boom'))

    render(<GlobalTagsPanel />)

    expect(await screen.findByText(adminTagsCopy.errors.generic)).toBeInTheDocument()
  })
})
