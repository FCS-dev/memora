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
      className={`rounded-box border bg-base-200 p-4 transition hover:shadow-sm ${
        isDragOver ? 'border-primary ring-1 ring-primary' : 'border-base-300'
      } ${viewMode === 'list' ? 'py-3' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Abrir ${note.title}`}
        className="flex cursor-pointer flex-col gap-2"
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        }}
      >
        <h3 className="line-clamp-2 break-words text-[0.9375rem] font-semibold leading-tight">
          {note.title}
        </h3>

        {!note.checklistMode && note.content ? (
          <p className={`text-sm leading-relaxed whitespace-pre-line break-words text-base-content/80 ${clampClass}`}>
            {note.content}
          </p>
        ) : null}

        {note.rememberAt ? (
          <time
            className="inline-flex items-center gap-1 text-xs text-neutral"
            dateTime={note.rememberAt}
          >
            <ClockIcon />
            {formatDateTime(note.rememberAt)}
          </time>
        ) : null}

        {note.tags.length > 0 ? <TagList tags={note.tags} /> : null}
      </div>

      {note.checklistMode ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {visibleItems.map((item) => (
            <li key={item.text} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={item.checked}
                aria-label={`${notesCopy.labels.checklistItemCheck}: ${item.text}`}
                onChange={(event) => onToggleChecklistItem?.(item.text, event.target.checked)}
              />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm text-base-content/80"
                onClick={onOpen}
              >
                {item.text}
              </button>
            </li>
          ))}
          {isTruncated ? (
            <li className="text-xs text-neutral" aria-label={notesCopy.labels.moreItems}>
              ...
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <time className="text-[0.65rem] text-neutral" dateTime={note.updatedAt}>
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
