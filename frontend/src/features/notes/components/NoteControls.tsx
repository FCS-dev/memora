import { IconButton } from '../../../shared/components/IconButton'
import { notesCopy } from '../model/copy'
import { ArchiveIcon, DownIcon, DragHandleIcon, PinIcon, RestoreIcon, TrashIcon, UpIcon } from './icons'

export interface NoteControlsProps {
  isPinned: boolean
  isArchived: boolean
  reorderEnabled: boolean
  isFirst: boolean
  isLast: boolean
  onTogglePin: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onHandlePointerDown?: () => void
}

export function NoteControls({
  isPinned,
  isArchived,
  reorderEnabled,
  isFirst,
  isLast,
  onTogglePin,
  onArchive,
  onRestore,
  onDelete,
  onMoveUp,
  onMoveDown,
  onHandlePointerDown,
}: NoteControlsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {isArchived ? (
        <>
          <IconButton
            label={notesCopy.actions.restore}
            className="h-8 w-8 text-neutral hover:text-base-content"
            onClick={onRestore}
          >
            <RestoreIcon />
          </IconButton>
          <IconButton
            label={notesCopy.actions.pin}
            className="h-8 w-8 text-neutral hover:text-base-content"
            onClick={onTogglePin}
          >
            <PinIcon />
          </IconButton>
        </>
      ) : (
        <IconButton
          label={isPinned ? notesCopy.actions.unpin : notesCopy.actions.pin}
          aria-pressed={isPinned}
          className={`h-8 w-8 ${isPinned ? 'text-primary' : 'text-neutral hover:text-base-content'}`}
          onClick={onTogglePin}
        >
          <PinIcon />
        </IconButton>
      )}

      {isArchived ? null : (
        <IconButton
          label={notesCopy.actions.archive}
          className="h-8 w-8 text-neutral hover:text-base-content"
          onClick={onArchive}
        >
          <ArchiveIcon />
        </IconButton>
      )}

      <IconButton
        label={notesCopy.actions.delete}
        className="h-8 w-8 text-neutral hover:text-error"
        onClick={onDelete}
      >
        <TrashIcon />
      </IconButton>

      {reorderEnabled ? (
        <div className="ml-1 flex items-center gap-0.5 border-l border-base-300 pl-1">
          <IconButton
            label={notesCopy.actions.moveUp}
            disabled={isFirst}
            className="h-8 w-8 text-neutral hover:text-base-content disabled:opacity-30"
            onClick={onMoveUp}
          >
            <UpIcon />
          </IconButton>
          <IconButton
            label={notesCopy.actions.moveDown}
            disabled={isLast}
            className="h-8 w-8 text-neutral hover:text-base-content disabled:opacity-30"
            onClick={onMoveDown}
          >
            <DownIcon />
          </IconButton>
          <span
            role="button"
            tabIndex={-1}
            aria-label={notesCopy.labels.dragHandle}
            title={notesCopy.labels.dragHandle}
            onPointerDown={(event) => {
              event.preventDefault()
              onHandlePointerDown?.()
            }}
            className="flex h-8 w-8 cursor-grab touch-none select-none items-center justify-center text-neutral hover:text-base-content"
          >
            <DragHandleIcon />
          </span>
        </div>
      ) : null}
    </div>
  )
}
