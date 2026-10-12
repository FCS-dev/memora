import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from '../../../shared/components/IconButton'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { NoteCard } from './NoteCard'
import { TagList } from './TagList'
import { hasOverflow } from '../model/tags'
import { ViewModeToggle } from './ViewModeToggle'
import { notesCopy } from '../model/copy'
import type { Note } from '../model/types'

function note(overrides: Partial<Note> = {}): Note {
  return {
    uuidNote: 'A',
    title: 'Nota',
    content: 'contenido de la nota',
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

const noop = () => {}

function renderCard(overrides: Partial<ComponentProps<typeof NoteCard>> = {}) {
  return render(
    <NoteCard
      note={note()}
      viewMode="list"
      sectionId="others"
      isFirst={false}
      isLast={false}
      reorderEnabled
      onOpen={noop}
      onTogglePin={noop}
      onArchive={noop}
      onRestore={noop}
      onDelete={noop}
      onMoveUp={noop}
      onMoveDown={noop}
      {...overrides}
    />,
  )
}

describe('IconButton', () => {
  it('expone una etiqueta accesible y dispara el click', async () => {
    const onClick = vi.fn()
    render(
      <IconButton label="Acción" onClick={onClick}>
        x
      </IconButton>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Acción' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('ConfirmDialog', () => {
  it('muestra el mensaje y responde a confirmar/cancelar', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Título"
        message="Mensaje"
        confirmLabel="Sí"
        cancelLabel="No"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByRole('dialog', { name: 'Título' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí' }))
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('ViewModeToggle', () => {
  it('refleja el modo y notifica el cambio (RF-4)', async () => {
    const onChange = vi.fn()
    render(<ViewModeToggle mode="card" onChange={onChange} />)

    expect(screen.getByRole('button', { name: notesCopy.actions.viewCard })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.viewList }))
    expect(onChange).toHaveBeenCalledWith('list')
  })
})

describe('NoteCard', () => {
  it('abre la nota al pulsar el cuerpo (RF-12)', async () => {
    const onOpen = vi.fn()
    renderCard({ onOpen })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Nota' }))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('recorta el contenido a 2 líneas en lista y 12 en card (RF-5, RF-6)', () => {
    const { rerender } = renderCard()
    expect(screen.getByText('contenido de la nota').className).toContain('line-clamp-2')

    rerender(
      <NoteCard
        note={note()}
        viewMode="card"
        sectionId="others"
        isFirst={false}
        isLast={false}
        reorderEnabled
        onOpen={noop}
        onTogglePin={noop}
        onArchive={noop}
        onRestore={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />,
    )
    expect(screen.getByText('contenido de la nota').className).toContain('line-clamp-12')
  })

  it('respeta los saltos de línea del contenido (RF-35)', () => {
    renderCard({ note: note({ content: 'linea uno\nlinea dos' }) })
    const content = screen.getByText('linea uno linea dos', { exact: false })
    expect(content.className).toContain('whitespace-pre-line')
  })

  it('usa fondo base-200 y tamaño 0.75rem (text-xs)', () => {
    renderCard()
    const article = screen.getByText('Nota').closest('article')!
    expect(article.className).toContain('bg-base-200')
    expect(article.className).toContain('text-xs')
  })

  it('muestra la última actualización y el contenido con line-height 1.25rem (RF-3, RF-43)', () => {
    renderCard({ note: note({ updatedAt: '2026-05-04T15:30:00' }) })
    const article = screen.getByText('Nota').closest('article')!
    const legend = article.querySelector('time[datetime="2026-05-04T15:30:00"]')
    expect(legend?.textContent).toContain(notesCopy.labels.updatedAt)
    expect(legend?.className).toContain('text-[0.65rem]')
    expect(screen.getByText('contenido de la nota').className).toContain('leading-5')
  })

  it('muestra el recordatorio con un ícono de reloj (RF-3)', () => {
    renderCard({ note: note({ rememberAt: '2026-06-01T09:00:00' }) })
    const article = screen.getByText('Nota').closest('article')!
    const reminder = article.querySelector('time[datetime="2026-06-01T09:00:00"]')
    expect(reminder?.querySelector('svg')).not.toBeNull()
  })

  it('usa line-height 1.25rem en el checklist (RF-43)', () => {
    renderCard({
      note: note({
        checklistMode: true,
        content: '',
        checklistItems: { uno: true, dos: false },
      }),
    })
    const article = screen.getByText('Nota').closest('article')!
    expect(article.querySelector('ul')?.className).toContain('leading-5')
  })

  it('muestra el checklist ítem por ítem limitado a la vista (RF-8)', () => {
    renderCard({
      note: note({
        checklistMode: true,
        content: '',
        checklistItems: { uno: true, dos: false, tres: false },
      }),
    })
    expect(screen.getByText('uno')).toBeInTheDocument()
    expect(screen.queryByText('dos')).not.toBeInTheDocument()
    expect(screen.queryByText('tres')).not.toBeInTheDocument()
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('no muestra el indicador "..." cuando el checklist entra completo (RF-38)', () => {
    renderCard({
      note: note({
        checklistMode: true,
        content: '',
        checklistItems: { uno: true, dos: false },
      }),
    })
    expect(screen.getByText('dos')).toBeInTheDocument()
    expect(screen.queryByText('...')).not.toBeInTheDocument()
  })

  it('permite marcar un ítem sin abrir la nota (RF-42)', async () => {
    const onToggleChecklistItem = vi.fn()
    const onOpen = vi.fn()
    renderCard({
      onOpen,
      onToggleChecklistItem,
      note: note({
        checklistMode: true,
        content: '',
        checklistItems: { uno: true, dos: false },
      }),
    })

    const checkbox = screen.getByRole('checkbox', {
      name: `${notesCopy.labels.checklistItemCheck}: dos`,
    })
    expect(checkbox).toBeEnabled()

    await userEvent.click(checkbox)

    expect(onToggleChecklistItem).toHaveBeenCalledWith('dos', true)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('en Archivadas muestra restaurar y no habilita arrastre (RF-25)', () => {
    renderCard({ note: note({ isArchived: true }), reorderEnabled: false })
    expect(screen.getByRole('button', { name: notesCopy.actions.restore })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: notesCopy.actions.archive })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(notesCopy.labels.dragHandle)).not.toBeInTheDocument()
  })

  it('dispara los controles de fijar y eliminar (RF-19, RF-27)', async () => {
    const onTogglePin = vi.fn()
    const onDelete = vi.fn()
    renderCard({ onTogglePin, onDelete })

    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.pin }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.delete }))

    expect(onTogglePin).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('mueve con los botones de teclado/accesibles (RF-26)', async () => {
    const onMoveUp = vi.fn()
    renderCard({ isFirst: false, onMoveUp })

    await userEvent.click(screen.getByRole('button', { name: notesCopy.actions.moveUp }))
    expect(onMoveUp).toHaveBeenCalledOnce()
  })
})

describe('TagList', () => {
  it('detecta el desborde según el ancho (RF-3)', () => {
    expect(hasOverflow(500, 300)).toBe(true)
    expect(hasOverflow(300, 300)).toBe(false)
    expect(hasOverflow(0, 0)).toBe(false)
  })

  it('renderiza las etiquetas en una fila sin wrap (RF-3)', () => {
    render(<TagList tags={['casa', 'trabajo', 'personal']} />)
    const list = screen.getByRole('list')
    expect(list.className).toContain('flex-nowrap')
    expect(list.className).toContain('overflow-hidden')
    expect(screen.getByText('trabajo')).toBeInTheDocument()
  })
})
