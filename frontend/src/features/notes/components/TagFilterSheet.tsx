import { useEffect } from 'react'
import { notesCopy } from '../model/copy'
import type { TagOption } from '../model/filters'

export interface TagFilterSheetProps {
  open: boolean
  options: TagOption[]
  tagIds: number[]
  onToggleTag: (id: number) => void
  onClear: () => void
  onClose: () => void
}

export function TagFilterSheet({
  open,
  options,
  tagIds,
  onToggleTag,
  onClear,
  onClose,
}: TagFilterSheetProps) {
  useEffect(() => {
    if (!open) {
      return
    }
    const previous = document.activeElement as HTMLElement | null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={notesCopy.filters.sheetTitle}
      className="modal modal-open modal-bottom sm:modal-middle"
    >
      <div className="modal-box flex max-h-[80vh] flex-col gap-3">
        <h2 className="text-lg font-semibold">{notesCopy.filters.sheetTitle}</h2>

        {options.length === 0 ? (
          <p className="text-base-content/70">{notesCopy.filters.noTags}</p>
        ) : (
          <fieldset className="flex flex-col gap-1 overflow-y-auto" aria-label={notesCopy.filters.sheetTitle}>
            {options.map((tag) => (
              <label key={tag.id} className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  aria-label={tag.tagName}
                  checked={tagIds.includes(tag.id)}
                  onChange={() => onToggleTag(tag.id)}
                />
                <span className="flex-1">{tag.tagName}</span>
                {tag.global ? (
                  <span className="badge badge-sm">{notesCopy.labels.global}</span>
                ) : null}
                <span className="badge badge-sm badge-ghost">
                  {tag.usage} {notesCopy.filters.usageSuffix}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="modal-action">
          <button type="button" className="btn" onClick={onClear}>
            {notesCopy.filters.clear}
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {notesCopy.filters.close}
          </button>
        </div>
      </div>
      <button
        type="button"
        role="presentation"
        aria-hidden="true"
        tabIndex={-1}
        className="modal-backdrop"
        onClick={onClose}
      />
    </div>
  )
}
