import { useState } from 'react'
import { IconButton } from '../../../shared/components/IconButton'
import { mapNotesError } from '../model/errors'
import { notesCopy } from '../model/copy'
import type { Tag } from '../model/types'
import { CrossIcon, PlusIcon } from './icons'

export interface TagPickerProps {
  id: string
  tags: Tag[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onCreate: (name: string) => Promise<void>
}

export function TagPicker({ id, tags, selectedIds, onChange, onCreate }: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
    try {
      await onCreate(trimmed)
      setName('')
    } catch (createError) {
      setError(mapNotesError(createError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
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
            <li key={tag.id} className="badge badge-sm">
              {tag.tagName}
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={notesCopy.labels.tags}
          className="modal modal-open"
        >
          <div className="modal-box flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{notesCopy.labels.tags}</h2>
              <IconButton
                label={notesCopy.actions.close}
                onClick={() => {
                  setError(null)
                  setOpen(false)
                }}
              >
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
              <p role="alert" className="text-error text-sm">
                {error}
              </p>
            ) : null}

            <fieldset
              className="flex max-h-64 flex-col gap-1 overflow-y-auto"
              aria-label={notesCopy.labels.tags}
            >
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <label key={tag.id} className="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={selectedIds.includes(tag.id)}
                      onChange={() => toggle(tag.id)}
                    />
                    <span>{tag.tagName}</span>
                  </label>
                ))
              ) : (
                <p className="text-base-content/70">{notesCopy.labels.noTags}</p>
              )}
            </fieldset>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            aria-label={notesCopy.actions.close}
            onClick={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
