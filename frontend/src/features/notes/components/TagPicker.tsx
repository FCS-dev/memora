import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '../../../shared/components/IconButton'
import { useModalBehavior } from '../../../shared/hooks/useModalBehavior'
import { mapNotesError } from '../model/errors'
import { notesCopy } from '../model/copy'
import type { CreateTagResult, Tag } from '../model/types'
import { CrossIcon, PlusIcon } from './icons'

export interface TagPickerProps {
  id: string
  tags: Tag[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onCreate: (name: string) => Promise<CreateTagResult>
}

export function TagPicker({ id, tags, selectedIds, onChange, onCreate }: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  function close() {
    setError(null)
    setNotice(null)
    setOpen(false)
  }

  useModalBehavior({ open, containerRef: modalRef, onClose: close })

  const selectedTags = tags.filter((tag) => selectedIds.includes(tag.id))

  function toggle(tagId: number) {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((value) => value !== tagId))
    } else {
      onChange([...selectedIds, tagId])
    }
  }

  async function submit() {
    const trimmed = name.trim()
    if (trimmed === '') {
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await onCreate(trimmed)
      setName('')
      setNotice(result.reused ? notesCopy.notices.reusedTag : null)
      if (!selectedIds.includes(result.tag.id)) {
        onChange([...selectedIds, result.tag.id])
      }
    } catch (createError) {
      setError(mapNotesError(createError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="btn btn-outline btn-sm self-start"
        onClick={() => setOpen(true)}
      >
        {notesCopy.labels.tags}
      </button>

      {selectedTags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <li key={tag.id} className="badge badge-md bg-base-300 text-base-content">
              {tag.tagName}
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        createPortal(
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={notesCopy.labels.tags}
            className="modal modal-open"
          >
            <div className="modal-box flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">{notesCopy.labels.tags}</h2>
                <IconButton label={notesCopy.actions.close} onClick={close}>
                  <CrossIcon />
                </IconButton>
              </div>

              <div className="flex items-center gap-2">
                <label className="floating-label flex-1">
                  <span>{notesCopy.labels.newTag}</span>
                  <input
                    id={id}
                    type="text"
                    value={name}
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={notesCopy.placeholders.newTag}
                    className="input w-full"
                  />
                </label>
                {name.trim() !== '' ? (
                  <IconButton
                    label={notesCopy.actions.addTag}
                    disabled={busy}
                    onClick={() => void submit()}
                  >
                    <PlusIcon />
                  </IconButton>
                ) : null}
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              ) : null}

              {notice ? (
                <p role="status" className="text-sm text-info">
                  {notice}
                </p>
              ) : null}

              <fieldset
                className="flex max-h-64 flex-col gap-2 overflow-y-auto"
                aria-label={notesCopy.labels.tags}
              >
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-base-300 bg-base-200 p-2 transition hover:bg-base-300"
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.includes(tag.id)}
                        onChange={() => toggle(tag.id)}
                      />
                      <span className="flex flex-1 items-center gap-2 text-sm">
                        {tag.tagName}
                        {tag.global ? (
                          <span className="badge badge-sm bg-base-300 text-base-content">
                            {notesCopy.labels.global}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-neutral">{notesCopy.labels.noTags}</p>
                )}
              </fieldset>
            </div>
            <button
              type="button"
              tabIndex={-1}
              className="modal-backdrop"
              aria-label={notesCopy.actions.close}
              onClick={close}
            />
          </div>,
          document.body,
        )
      ) : null}
    </div>
  )
}
