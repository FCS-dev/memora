import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { IconButton } from '../../../shared/components/IconButton'
import { TextField } from '../../../shared/components/TextField'
import { useNoteEditor } from '../hooks/useNoteEditor'
import { notesCopy } from '../model/copy'
import type { CreateNotePayload, Note, Tag, UpdateNotePayload } from '../model/types'
import { charCount, LIMITS } from '../model/validation'
import { CrossIcon, ListIcon, PinIcon } from './icons'
import { ReminderInput } from './ReminderInput'
import { TagPicker } from './TagPicker'

export interface NoteEditorProps {
  note: Note | null
  tags: Tag[]
  onSave: (payload: CreateNotePayload | UpdateNotePayload) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
  onCancel: () => void
}

export function NoteEditor({ note, tags, onSave, onCreateTag, onCancel }: NoteEditorProps) {
  const tagIdsByName = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.tagName, tag.id])),
    [tags],
  )
  const editor = useNoteEditor(note, tagIdsByName, onSave)
  const { values, errors } = editor
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const usedChars = charCount(values)
  const overLimit = usedChars > LIMITS.contentMax

  async function handleSave() {
    setSaveError(null)
    const result = await editor.save()
    if (result.status === 'saved' || result.status === 'empty') {
      onCancel()
      return
    }
    if (result.status === 'error') {
      setSaveError(result.message)
    }
  }

  async function handleCreateTag(name: string) {
    const tag = await onCreateTag(name)
    editor.update({ tagIds: [...values.tagIds, tag.id] })
  }

  function handleCancel() {
    if (editor.dirty) {
      setConfirmDiscard(true)
    } else {
      onCancel()
    }
  }

  return (
    <form
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      {saveError ? <ErrorAlert message={saveError} /> : null}

      <TextField
        id="note-title"
        label={notesCopy.labels.title}
        value={values.title}
        onChange={(value) => editor.update({ title: value })}
        error={errors.title}
        floating
      />

      <div className="flex items-center gap-1">
        <IconButton
          label={notesCopy.labels.checklistMode}
          aria-pressed={values.checklistMode}
          onClick={() => editor.toggleChecklistMode()}
        >
          <ListIcon />
        </IconButton>
        <IconButton
          label={values.isPinned ? notesCopy.actions.unpin : notesCopy.actions.pin}
          aria-pressed={values.isPinned}
          onClick={() => editor.update({ isPinned: !values.isPinned })}
        >
          <PinIcon />
        </IconButton>
        <div className="ml-auto">
          <ReminderInput
            id="note-reminder"
            label={notesCopy.labels.reminder}
            value={values.rememberAt}
            onChange={(value) => editor.update({ rememberAt: value })}
          />
        </div>
      </div>

      {values.checklistMode ? (
        <fieldset className="flex flex-col" aria-label={notesCopy.labels.checklistItems}>
          {values.checklistItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={item.checked}
                aria-label={`${notesCopy.labels.checklistItemCheck} ${index + 1}`}
                onChange={() => editor.toggleChecklistItemChecked(index)}
              />
              <input
                type="text"
                className="input h-4 w-full rounded-none border-x-0 border-t-0 px-1"
                aria-label={`${notesCopy.labels.checklistItems} ${index + 1}`}
                value={item.text}
                onChange={(event) => editor.setChecklistItem(index, event.target.value)}
              />
              <IconButton
                label={notesCopy.actions.delete}
                onClick={() => editor.removeChecklistItem(index)}
              >
                <CrossIcon />
              </IconButton>
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => editor.addChecklistItem()}>
            {notesCopy.actions.addItem}
          </button>
          <p
            aria-live="polite"
            className={`text-right text-xs ${overLimit ? 'text-error' : 'text-base-content/70'}`}
          >
            {usedChars}/{LIMITS.contentMax}
          </p>
          {errors.checklistItems ? (
            <p role="alert" className="text-error text-sm">
              {errors.checklistItems}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-1">
          <textarea
            id="note-content"
            aria-label={notesCopy.labels.content}
            className="textarea textarea-bordered w-full"
            value={values.content}
            onChange={(event) => editor.update({ content: event.target.value })}
          />
          <p
            aria-live="polite"
            className={`text-right text-xs ${overLimit ? 'text-error' : 'text-base-content/70'}`}
          >
            {usedChars}/{LIMITS.contentMax}
          </p>
          {errors.content ? (
            <p role="alert" className="text-error text-sm">
              {errors.content}
            </p>
          ) : null}
        </div>
      )}

      <TagPicker
        id="note-new-tag"
        tags={tags}
        selectedIds={values.tagIds}
        onChange={(ids) => editor.update({ tagIds: ids })}
        onCreate={handleCreateTag}
      />

      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={handleCancel}>
          {notesCopy.actions.cancel}
        </button>
        <button type="submit" className="btn btn-primary" disabled={editor.saving}>
          {notesCopy.actions.save}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title={notesCopy.confirm.discardTitle}
        message={notesCopy.confirm.discardMessage}
        confirmLabel={notesCopy.actions.confirm}
        cancelLabel={notesCopy.actions.cancel}
        onConfirm={onCancel}
        onCancel={() => setConfirmDiscard(false)}
      />
    </form>
  )
}
