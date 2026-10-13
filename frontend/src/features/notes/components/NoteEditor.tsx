import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { IconButton } from '../../../shared/components/IconButton'
import { TextField } from '../../../shared/components/TextField'
import { useNoteEditor } from '../hooks/useNoteEditor'
import { notesCopy } from '../model/copy'
import type { CreateNotePayload, Note, Tag, UpdateNotePayload } from '../model/types'
import { charCount, LIMITS } from '../model/validation'
import { CrossIcon, DragHandleIcon, ListIcon, PinIcon } from './icons'
import { ReminderInput } from './ReminderInput'
import { TagPicker } from './TagPicker'

export interface NoteEditorProps {
  note: Note | null
  tags: Tag[]
  onSave: (payload: CreateNotePayload | UpdateNotePayload) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
  onCancel: () => void
}

const ITEM_MAX_LINES = 3
const ITEM_LINE_HEIGHT = 16

function resizeItemTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return
  element.style.height = 'auto'
  const maxHeight = ITEM_MAX_LINES * ITEM_LINE_HEIGHT
  element.style.height = `${Math.min(Math.max(element.scrollHeight, ITEM_LINE_HEIGHT), maxHeight)}px`
}

export function NoteEditor({ note, tags, onSave, onCreateTag, onCancel }: NoteEditorProps) {
  const tagIdsByName = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.tagName, tag.id])),
    [tags],
  )
  const editor = useNoteEditor(note, tagIdsByName, onSave)
  const { values, errors } = editor
  const { moveChecklistItem } = editor
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)
  const overRef = useRef<number | null>(null)
  const itemInputRefs = useRef<(HTMLTextAreaElement | null)[]>([])
  const focusLastRef = useRef(false)

  const usedChars = charCount(values)
  const overLimit = usedChars > LIMITS.contentMax

  useEffect(() => {
    dragRef.current = dragIndex
  }, [dragIndex])

  useEffect(() => {
    overRef.current = overIndex
  }, [overIndex])

  useEffect(() => {
    if (!focusLastRef.current) return
    focusLastRef.current = false
    const lastIndex = values.checklistItems.length - 1
    itemInputRefs.current[lastIndex]?.focus()
  }, [values.checklistItems.length])

  useEffect(() => {
    values.checklistItems.forEach((_, index) => resizeItemTextarea(itemInputRefs.current[index]))
  }, [values.checklistItems])

  useEffect(() => {
    if (dragIndex === null) return

    function findTargetIndex(clientX: number, clientY: number): number | null {
      const element = document.elementFromPoint(clientX, clientY)
      const row = (element as HTMLElement | null)?.closest('[data-checklist-index]') as HTMLElement | null
      if (!row) return null
      const index = Number(row.dataset.checklistIndex)
      return Number.isNaN(index) ? null : index
    }

    function handleMove(event: PointerEvent) {
      const index = findTargetIndex(event.clientX, event.clientY)
      if (index !== null) {
        setOverIndex(index)
      }
    }

    function handleEnd(event: PointerEvent) {
      const from = dragRef.current
      const to = findTargetIndex(event.clientX, event.clientY) ?? overRef.current
      if (from !== null && to !== null) {
        moveChecklistItem(from, to)
      }
      setDragIndex(null)
      setOverIndex(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
    }
  }, [dragIndex, moveChecklistItem])

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
        placeholder={notesCopy.placeholders.title}
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
            <div
              key={item.clientId}
              data-checklist-index={index}
              className={`flex min-h-6 items-center gap-1 text-xs ${
                dragIndex !== null && overIndex === index ? 'bg-base-200' : ''
              } ${dragIndex === index ? 'opacity-50' : ''}`}
              onKeyDown={(event) => {
                if (
                  (event.ctrlKey || event.metaKey) &&
                  (event.key === 'ArrowUp' || event.key === 'ArrowDown')
                ) {
                  event.preventDefault()
                  const toIndex = event.key === 'ArrowUp' ? index - 1 : index + 1
                  if (toIndex >= 0 && toIndex < values.checklistItems.length) {
                    moveChecklistItem(index, toIndex)
                  }
                }
              }}
            >
              <span
                role="button"
                tabIndex={-1}
                aria-label={notesCopy.labels.dragHandle}
                className="flex cursor-grab touch-none select-none items-center px-0.5 [&_svg]:size-3.5"
                onPointerDown={(event) => {
                  event.preventDefault()
                  setDragIndex(index)
                }}
              >
                <DragHandleIcon />
              </span>
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={item.checked}
                aria-label={`${notesCopy.labels.checklistItemCheck} ${index + 1}`}
                onChange={() => editor.toggleChecklistItemChecked(index)}
              />
              <textarea
                ref={(element) => {
                  itemInputRefs.current[index] = element
                  resizeItemTextarea(element)
                }}
                rows={1}
                className="min-h-4 max-h-12 w-full resize-none overflow-y-auto rounded-none border-x-0 border-t-0 border-b border-base-300 bg-transparent px-1 py-0 text-xs leading-4 focus:border-primary focus:outline-none"
                aria-label={`${notesCopy.labels.checklistItems} ${index + 1}`}
                placeholder={notesCopy.placeholders.checklistItem}
                value={item.text}
                onChange={(event) => {
                  editor.setChecklistItem(index, event.target.value)
                  resizeItemTextarea(event.target)
                }}
              />
              <IconButton
                label={notesCopy.actions.delete}
                className="h-4 min-h-0 w-4 p-0 [&_svg]:size-3.5"
                onClick={() => editor.removeChecklistItem(index)}
              >
                <CrossIcon />
              </IconButton>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              focusLastRef.current = true
              editor.addChecklistItem()
            }}
          >
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
            placeholder={notesCopy.placeholders.content}
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
