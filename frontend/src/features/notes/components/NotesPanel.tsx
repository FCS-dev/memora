import { useEffect, useRef, useState } from 'react'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { Spinner } from '../../../shared/components/Spinner'
import { notesCopy } from '../model/copy'
import { resolveNeighborUuids, resolveReorderPayloadFromDrop } from '../model/position'
import type { Note, ReorderPayload, ViewMode } from '../model/types'
import { NoteCard } from './NoteCard'

export interface PanelSection {
  id: string
  title: string
  notes: Note[]
  reorderEnabled: boolean
}

export interface NotesPanelProps {
  title: string
  sections: PanelSection[]
  viewMode: ViewMode
  loading: boolean
  error: string | null
  emptyTitle?: string
  emptyMessage?: string
  onRetry: () => void
  onOpen: (note: Note) => void
  onTogglePin: (note: Note) => void
  onArchive: (note: Note) => void
  onRestore: (note: Note) => void
  onDelete: (note: Note) => void
  onReorder: (uuidNote: string, payload: ReorderPayload) => void
  onToggleChecklistItem?: (note: Note, item: string, checked: boolean) => void
}

interface DragState {
  uuid: string
  sectionId: string
}

export function NotesPanel({
  title,
  sections,
  viewMode,
  loading,
  error,
  emptyTitle,
  emptyMessage,
  onRetry,
  onOpen,
  onTogglePin,
  onArchive,
  onRestore,
  onDelete,
  onReorder,
  onToggleChecklistItem,
}: NotesPanelProps) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const overRef = useRef<number | null>(null)
  const sectionsRef = useRef(sections)

  useEffect(() => {
    dragRef.current = drag
  }, [drag])

  useEffect(() => {
    overRef.current = overIndex
  }, [overIndex])

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  useEffect(() => {
    if (!drag) {
      return
    }

    function findTargetIndex(clientX: number, clientY: number): number | null {
      const element = document.elementFromPoint(clientX, clientY)
      const card = (element as HTMLElement | null)?.closest('[data-note-uuid]') as HTMLElement | null
      if (!card || card.dataset.sectionId !== drag?.sectionId) {
        return null
      }
      const section = sectionsRef.current.find((item) => item.id === card.dataset.sectionId)
      if (!section) {
        return null
      }
      const index = section.notes.findIndex((note) => note.uuidNote === card.dataset.noteUuid)
      return index >= 0 ? index : null
    }

    function handleMove(event: PointerEvent) {
      const index = findTargetIndex(event.clientX, event.clientY)
      if (index !== null) {
        setOverIndex(index)
      }
    }

    function handleEnd(event: PointerEvent) {
      const current = dragRef.current
      const index = findTargetIndex(event.clientX, event.clientY) ?? overRef.current
      if (current && index !== null) {
        const section = sectionsRef.current.find((item) => item.id === current.sectionId)
        if (section) {
          const payload = resolveReorderPayloadFromDrop(section.notes, current.uuid, index)
          if (payload) {
            onReorder(current.uuid, payload)
          }
        }
      }
      setDrag(null)
      setOverIndex(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
    }
  }, [drag, onReorder])

  const total = sections.reduce((count, section) => count + section.notes.length, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <ErrorAlert message={error} />
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          {notesCopy.actions.retry}
        </button>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        {emptyTitle ? <p className="text-lg font-semibold">{emptyTitle}</p> : null}
        {emptyMessage ? <p className="max-w-xs text-sm text-neutral">{emptyMessage}</p> : null}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-6" aria-label={title}>
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-3">
          {section.title && section.notes.length > 0 ? (
            <h2 className="text-sm font-semibold text-neutral">{section.title}</h2>
          ) : null}
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.notes.map((note, index) => (
              <li key={note.uuidNote}>
                <NoteCard
                  note={note}
                  viewMode={viewMode}
                  sectionId={section.id}
                  isFirst={index === 0}
                  isLast={index === section.notes.length - 1}
                  reorderEnabled={section.reorderEnabled}
                  isDragOver={drag !== null && overIndex === index}
                  onOpen={() => onOpen(note)}
                  onTogglePin={() => onTogglePin(note)}
                  onArchive={() => onArchive(note)}
                  onRestore={() => onRestore(note)}
                  onDelete={() => onDelete(note)}
                  onMoveUp={() => {
                    const payload = resolveNeighborUuids(section.notes, note.uuidNote, 'up')
                    if (payload) onReorder(note.uuidNote, payload)
                  }}
                  onMoveDown={() => {
                    const payload = resolveNeighborUuids(section.notes, note.uuidNote, 'down')
                    if (payload) onReorder(note.uuidNote, payload)
                  }}
                  onToggleChecklistItem={(item, checked) =>
                    onToggleChecklistItem?.(note, item, checked)
                  }
                  onHandlePointerDown={() =>
                    setDrag({ uuid: note.uuidNote, sectionId: section.id })
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
