import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotesPanel } from './NotesPanel'
import type { Note } from '../model/types'

function note(uuidNote: string, title: string): Note {
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
  }
}

const noop = () => {}

describe('NotesPanel reorden táctil (Pointer Events)', () => {
  it('reordena al soltar sobre otra tarjeta (RF-23)', () => {
    const onReorder = vi.fn()
    const { container } = render(
      <NotesPanel
        title="Otras"
        viewMode="card"
        loading={false}
        error={null}
        onRetry={noop}
        onOpen={noop}
        onTogglePin={noop}
        onArchive={noop}
        onRestore={noop}
        onDelete={noop}
        onReorder={onReorder}
        sections={[
          {
            id: 'others',
            title: 'Otras',
            reorderEnabled: true,
            notes: [note('A', 'A'), note('B', 'B'), note('C', 'C')],
          },
        ]}
      />,
    )

    const cardC = container.querySelector('[data-note-uuid="C"]') as HTMLElement
    const docWithPoint = document as unknown as {
      elementFromPoint: (x: number, y: number) => Element | null
    }
    docWithPoint.elementFromPoint = () => cardC

    const handleA = screen
      .getByText('A')
      .closest('article')!
      .querySelector('[aria-label="Arrastrar para reordenar"]') as HTMLElement

    fireEvent.pointerDown(handleA)
    fireEvent.pointerMove(window, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(window, { clientX: 10, clientY: 10 })

    expect(onReorder).toHaveBeenCalledWith('A', { beforeUuid: 'C', afterUuid: '' })
  })

  it('no reordena en Archivadas (RF-25)', () => {
    const onReorder = vi.fn()
    render(
      <NotesPanel
        title="Archivadas"
        viewMode="card"
        loading={false}
        error={null}
        onRetry={noop}
        onOpen={noop}
        onTogglePin={noop}
        onArchive={noop}
        onRestore={noop}
        onDelete={noop}
        onReorder={onReorder}
        sections={[
          { id: 'archived', title: '', reorderEnabled: false, notes: [note('A', 'A'), note('B', 'B')] },
        ]}
      />,
    )

    expect(screen.queryByLabelText('Arrastrar para reordenar')).not.toBeInTheDocument()
  })
})
