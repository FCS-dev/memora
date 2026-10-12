import { useState } from 'react'
import { IconButton } from '../../../shared/components/IconButton'
import { mapNotesError } from '../model/errors'
import { notesCopy } from '../model/copy'
import type { Tag } from '../model/types'
import { PlusIcon } from './icons'

export interface TagPickerProps {
  id: string
  tags: Tag[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onCreate: (name: string) => Promise<void>
}

export function TagPicker({ id, tags, selectedIds, onChange, onCreate }: TagPickerProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
    <fieldset className="flex flex-col gap-2 text-xs">
      <legend className="label">{notesCopy.labels.tags}</legend>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.id}>
              <label className="label cursor-pointer gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selectedIds.includes(tag.id)}
                  onChange={() => toggle(tag.id)}
                />
                <span>{tag.tagName}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-center gap-2">
        <label className="floating-label flex-1">
          <span>{notesCopy.labels.newTag}</span>
          <input
            id={id}
            type="text"
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
            placeholder=" "
            className="input w-full"
          />
        </label>
        <IconButton label={notesCopy.actions.addTag} disabled={busy} onClick={() => void submit()}>
          <PlusIcon />
        </IconButton>
      </div>

      {error ? (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
