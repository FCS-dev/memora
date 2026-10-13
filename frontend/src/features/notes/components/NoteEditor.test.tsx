import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../shared/lib/http'
import { NoteEditor } from './NoteEditor'
import { notesCopy } from '../model/copy'
import type { Tag } from '../model/types'

const noop = vi.fn()

function renderEditor(overrides: Partial<ComponentProps<typeof NoteEditor>> = {}) {
  return render(
    <NoteEditor
      note={null}
      tags={[]}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onCreateTag={vi.fn()}
      onCancel={noop}
      {...overrides}
    />,
  )
}

describe('NoteEditor', () => {
  it('abre el editor de creación con el campo Título (RF-13)', () => {
    renderEditor()
    expect(screen.getByLabelText(notesCopy.labels.title)).toBeInTheDocument()
  })

  it('guarda una nota de texto y vuelve (RF-13, RF-18)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()
    renderEditor({ onSave, onCancel })

    await userEvent.type(screen.getByLabelText(notesCopy.labels.title), 'Mi nota')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.save }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mi nota' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('deriva los ítems del contenido al activar checklist (RF-15)', async () => {
    renderEditor()

    await userEvent.type(screen.getByLabelText(notesCopy.labels.content), 'uno\ndos')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))

    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`)).toHaveValue('uno')
    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`)).toHaveValue('dos')
  })

  it('permite marcar la casilla de cada ítem (RF-41)', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))
    await userEvent.type(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`), 'casa')

    const checkbox = screen.getByLabelText('Marcar ítem 1')
    expect(checkbox).not.toBeChecked()

    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('agrega un ítem con la etiqueta correcta (RF-41)', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.addItem }))

    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`)).toBeInTheDocument()
  })

  it('enfoca el input del nuevo ítem al agregarlo (RF-9)', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.addItem }))

    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`)).toHaveFocus()
  })

  it('reordena los ítems con Ctrl/Cmd + flechas (RF-8)', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))
    await userEvent.type(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`), 'uno')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.addItem }))
    await userEvent.type(screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`), 'dos')

    const second = screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`)
    second.focus()
    await userEvent.keyboard('{Control>}{ArrowUp}{/Control}')

    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`)).toHaveValue('dos')
    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`)).toHaveValue('uno')
  })

  it('reordena los ítems arrastrando desde el asa (RF-4, RF-7)', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))
    await userEvent.type(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`), 'uno')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.addItem }))
    await userEvent.type(screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`), 'dos')

    const handles = screen.getAllByLabelText(notesCopy.labels.dragHandle)
    const rows = document.querySelectorAll('[data-checklist-index]')
    const elementFromPoint = vi.fn().mockReturnValue(rows[0] as Element)
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPoint,
    })

    fireEvent.pointerDown(handles[1])
    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(window, { clientX: 0, clientY: 0 })

    Reflect.deleteProperty(document, 'elementFromPoint')

    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`)).toHaveValue('dos')
    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 2`)).toHaveValue('uno')
  })

  it('bloquea el guardado sin título cuando hay datos (RF-21)', async () => {
    const onSave = vi.fn()
    renderEditor({ onSave })

    await userEvent.type(screen.getByLabelText(notesCopy.labels.content), 'algo')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.save }))

    expect(await screen.findByText(notesCopy.errors.required)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('crea una etiqueta desde la nota (RF-16)', async () => {
    const tag: Tag = { id: 5, tagName: 'casa' }
    const onCreateTag = vi.fn().mockResolvedValue(tag)
    renderEditor({ onCreateTag })

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.tags }))
    await userEvent.type(screen.getByLabelText(notesCopy.labels.newTag), 'casa')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.addTag }))

    expect(onCreateTag).toHaveBeenCalledWith('casa')
  })

  it('informa el error de etiqueta duplicada (RF-33)', async () => {
    const onCreateTag = vi
      .fn()
      .mockRejectedValue(new HttpError(400, { detail: 'El tag ya existe' }))
    renderEditor({ onCreateTag })

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.tags }))
    await userEvent.type(screen.getByLabelText(notesCopy.labels.newTag), 'casa')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.addTag }))

    expect(await screen.findByText(notesCopy.errors.duplicateTag)).toBeInTheDocument()
  })

  it('permite quitar el recordatorio cargado (RF-51)', async () => {
    renderEditor()
    const reminder = screen.getByLabelText(notesCopy.labels.reminder)

    fireEvent.change(reminder, { target: { value: '2026-06-01T09:00' } })
    expect(reminder).toHaveValue('2026-06-01T09:00')

    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.clearReminder }))
    expect(screen.getByLabelText(notesCopy.labels.reminder)).toHaveValue('')
  })

  it('muestra el contador de caracteres del contenido (RF-36)', async () => {
    renderEditor()

    expect(screen.getByText('0/2500')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(notesCopy.labels.content), 'hola')
    expect(screen.getByText('4/2500')).toBeInTheDocument()
  })

  it('cuenta las longitudes de los ítems con checklist activo (RF-36)', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))
    await userEvent.type(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`), 'casa')

    expect(screen.getByText('4/2500')).toBeInTheDocument()
  })

  it('pide confirmación al salir con cambios (RF-14)', async () => {
    const onCancel = vi.fn()
    renderEditor({ onCancel })

    await userEvent.type(screen.getByLabelText(notesCopy.labels.title), 'algo')
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.cancel }))

    expect(screen.getByRole('dialog', { name: notesCopy.confirm.discardTitle })).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('usa floating label en título, recordatorio y nueva etiqueta (RF-45)', async () => {
    renderEditor()
    for (const label of [notesCopy.labels.title, notesCopy.labels.reminder]) {
      expect(screen.getByLabelText(label).closest('label')?.className).toContain('floating-label')
    }

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.tags }))
    expect(screen.getByLabelText(notesCopy.labels.newTag).closest('label')?.className).toContain(
      'floating-label',
    )
  })

  it('controla checklist y fijada con botones de ícono (RF-47)', async () => {
    renderEditor()
    const checklist = screen.getByRole('button', { name: notesCopy.labels.checklistMode })
    expect(checklist).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(checklist)
    expect(screen.getByRole('button', { name: notesCopy.labels.checklistMode })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const pin = screen.getByRole('button', { name: notesCopy.actions.pin })
    await userEvent.click(pin)
    expect(screen.getByRole('button', { name: notesCopy.actions.unpin })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('el ítem es un textarea de 0.75rem en una fila base de 1.5rem y máximo 3 líneas (RF-48, RF-49, RF-52)', async () => {
    renderEditor()
    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))

    const itemInput = screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`) as HTMLTextAreaElement
    expect(itemInput.tagName).toBe('TEXTAREA')
    expect(itemInput.className).toContain('border-t-0')
    expect(itemInput.className).toContain('text-xs')
    expect(itemInput.className).toContain('min-h-4')
    expect(itemInput.className).toContain('max-h-12')

    const row = document.querySelector('[data-checklist-index]') as HTMLElement
    expect(row.className).toContain('min-h-6')

    expect(screen.getByRole('button', { name: notesCopy.actions.delete })).toBeInTheDocument()
  })

  it('muestra textos de ayuda en los campos vacíos (RF-55)', async () => {
    renderEditor()

    expect(screen.getByLabelText(notesCopy.labels.title)).toHaveAttribute(
      'placeholder',
      notesCopy.placeholders.title,
    )
    expect(screen.getByLabelText(notesCopy.labels.content)).toHaveAttribute(
      'placeholder',
      notesCopy.placeholders.content,
    )

    await userEvent.click(screen.getByRole('button', { name: notesCopy.labels.checklistMode }))
    expect(screen.getByLabelText(`${notesCopy.labels.checklistItems} 1`)).toHaveAttribute(
      'placeholder',
      notesCopy.placeholders.checklistItem,
    )
  })
})
