import type { Note, ViewMode } from '../model/types'
import { notesCopy } from '../model/copy'
import { ClockIcon } from './icons'
import { NoteControls } from './NoteControls'
import { TagList } from './TagList'

export interface NoteCardProps {
  note: Note
  viewMode: ViewMode
  sectionId: string
  isFirst: boolean
  isLast: boolean
  reorderEnabled: boolean
  isDragOver?: boolean
  onOpen: () => void
  onTogglePin: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleChecklistItem?: (item: string, checked: boolean) => void
  onHandlePointerDown?: () => void
}

const MAX_ITEMS: Record<ViewMode, number> = { card: 12, list: 2 }

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function NoteCard({
  note,
  viewMode,
  sectionId,
  isFirst,
  isLast,
  reorderEnabled,
  isDragOver = false,
  onOpen,
  onTogglePin,
  onArchive,
  onRestore,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleChecklistItem,
  onHandlePointerDown,
}: NoteCardProps) {
  const clampClass = viewMode === 'card' ? 'line-clamp-12' : 'line-clamp-2'
  const items = note.checklistMode ? (note.checklistItems ?? []) : []
  const maxItems = MAX_ITEMS[viewMode]
  const isTruncated = items.length > maxItems
  const visibleItems = items.slice(0, isTruncated ? maxItems - 1 : maxItems)

  return (
    <article
      data-note-uuid={note.uuidNote}
      data-section-id={sectionId}
      className={`card bg-base-200 border border-base-300 p-3 text-xs md:max-w-[500px] ${viewMode === 'list' ? 'py-2' : ''} ${isDragOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Abrir ${note.title}`}
        className="flex cursor-pointer flex-col gap-1"
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        }}
      >
        <h3 className="font-semibold">{note.title}</h3>

        {!note.checklistMode && note.content ? (
          <p className={`${clampClass} leading-5 whitespace-pre-line break-words`}>{note.content}</p>
        ) : null}

        {note.rememberAt ? (
          <time className="flex items-center gap-1 text-base-content/70" dateTime={note.rememberAt}>
            <ClockIcon />
            {formatDateTime(note.rememberAt)}
          </time>
        ) : null}

        {note.tags.length > 0 ? <TagList tags={note.tags} /> : null}
      </div>

      {note.checklistMode ? (
        <ul className="mt-1 flex flex-col gap-0.5 leading-5">
          {visibleItems.map((item) => (
            <li key={item.text} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={item.checked}
                aria-label={`${notesCopy.labels.checklistItemCheck}: ${item.text}`}
                onChange={(event) => onToggleChecklistItem?.(item.text, event.target.checked)}
              />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={onOpen}
              >
                {item.text}
              </button>
            </li>
          ))}
          {isTruncated ? (
            <li className="text-base-content/70" aria-label={notesCopy.labels.moreItems}>
              ...
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <time className="text-[0.65rem] text-base-content/70" dateTime={note.updatedAt}>
          {notesCopy.labels.updatedAt}: {formatDateTime(note.updatedAt)}
        </time>
        <NoteControls
          isPinned={note.isPinned}
          isArchived={note.isArchived}
          reorderEnabled={reorderEnabled}
          isFirst={isFirst}
          isLast={isLast}
          onTogglePin={onTogglePin}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onHandlePointerDown={onHandlePointerDown}
        />
      </div>
    </article>
  )
}
