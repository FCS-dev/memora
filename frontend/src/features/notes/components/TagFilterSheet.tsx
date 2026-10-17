import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { notesCopy } from '../model/copy'
import type { TagOption } from '../model/filters'
import { useModalBehavior } from '../../../shared/hooks/useModalBehavior'

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
  const modalRef = useRef<HTMLDivElement>(null)

  useModalBehavior({ open, containerRef: modalRef, onClose })

  if (!open) {
    return null
  }

  return createPortal(
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={notesCopy.filters.sheetTitle}
      className="modal modal-open modal-bottom sm:modal-middle"
    >
      <div className="modal-box flex max-h-[80vh] flex-col gap-4">
        <h2 className="text-base font-semibold">{notesCopy.filters.sheetTitle}</h2>

        {options.length === 0 ? (
          <p className="text-sm text-neutral">{notesCopy.filters.noTags}</p>
        ) : (
          <fieldset className="flex flex-col gap-2 overflow-y-auto" aria-label={notesCopy.filters.sheetTitle}>
            {options.map((tag) => (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-base-300 bg-base-200 p-3 transition hover:bg-base-300"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  aria-label={tag.tagName}
                  checked={tagIds.includes(tag.id)}
                  onChange={() => onToggleTag(tag.id)}
                />
                <span className="flex-1 text-sm">{tag.tagName}</span>
                {tag.global ? (
                  <span className="badge badge-sm bg-base-300 text-base-content">
                    {notesCopy.labels.global}
                  </span>
                ) : null}
                <span className="badge badge-sm bg-base-300 text-neutral">
                  {tag.usage} {notesCopy.filters.usageSuffix}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClear}>
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
    </div>,
    document.body,
  )
}
