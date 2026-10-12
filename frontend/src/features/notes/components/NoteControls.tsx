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
    <div className="flex items-center gap-1">
      {isArchived ? (
        <>
          <IconButton label={notesCopy.actions.restore} onClick={onRestore}>
            <RestoreIcon />
          </IconButton>
          <IconButton label={notesCopy.actions.pin} onClick={onTogglePin}>
            <PinIcon />
          </IconButton>
        </>
      ) : (
        <IconButton
          label={isPinned ? notesCopy.actions.unpin : notesCopy.actions.pin}
          aria-pressed={isPinned}
          onClick={onTogglePin}
        >
          <PinIcon />
        </IconButton>
      )}

      {isArchived ? null : (
        <IconButton label={notesCopy.actions.archive} onClick={onArchive}>
          <ArchiveIcon />
        </IconButton>
      )}

      <IconButton label={notesCopy.actions.delete} onClick={onDelete}>
        <TrashIcon />
      </IconButton>

      {reorderEnabled ? (
        <>
          <IconButton label={notesCopy.actions.moveUp} disabled={isFirst} onClick={onMoveUp}>
            <UpIcon />
          </IconButton>
          <IconButton label={notesCopy.actions.moveDown} disabled={isLast} onClick={onMoveDown}>
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
            className="cursor-grab touch-none select-none px-1"
          >
            <DragHandleIcon />
          </span>
        </>
      ) : null}
    </div>
  )
}
