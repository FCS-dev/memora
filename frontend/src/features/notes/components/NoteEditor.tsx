import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { IconButton } from '../../../shared/components/IconButton'
import { TextField } from '../../../shared/components/TextField'
import { useNoteEditor } from '../hooks/useNoteEditor'
import type { AiWarningCode, NoteDraft } from '../capture/model/types'
import { captureCopy } from '../capture/model/copy'
import { notesCopy } from '../model/copy'
import type { CreateNotePayload, CreateTagResult, Note, Tag, UpdateNotePayload } from '../model/types'
import { charCount, LIMITS } from '../model/validation'
import { CrossIcon, DragHandleIcon, ListIcon, PinIcon } from './icons'
import { ReminderInput } from './ReminderInput'
import { TagPicker } from './TagPicker'

export interface NoteEditorProps {
  note: Note | null
  tags: Tag[]
  initialDraft?: NoteDraft
  initialText?: string
  warnings?: AiWarningCode[]
  originalText?: string
  onSave: (payload: CreateNotePayload | UpdateNotePayload) => Promise<void>
  onCreateTag: (name: string) => Promise<CreateTagResult>
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

function toolbarButtonClass(active: boolean): string {
  return `inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${
    active
      ? 'border-primary/20 bg-primary/10 text-primary'
      : 'border-base-300 bg-base-200 text-neutral hover:text-base-content'
  }`
}

export function NoteEditor({
  note,
  tags,
  initialDraft,
  initialText,
  warnings,
  originalText,
  onSave,
  onCreateTag,
  onCancel,
}: NoteEditorProps) {
  const tagIdsByName = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.tagName, tag.id])),
    [tags],
  )
  const editor = useNoteEditor(note, tagIdsByName, onSave, { initialDraft, initialText })
  const { values, errors } = editor
  const { moveChecklistItem } = editor
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
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
    const validIds = new Set(tags.map((tag) => tag.id))
    const remaining = values.tagIds.filter((id) => validIds.has(id))
    if (remaining.length !== values.tagIds.length) {
      editor.update({ tagIds: remaining })
    }
  }, [tags, values.tagIds, editor])

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
      setSaved(true)
      onCancel()
      return
    }
    if (result.status === 'error') {
      setSaveError(result.message)
    }
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
      <p aria-live="polite" className="sr-only">
        {editor.saving ? 'Guardando' : saved ? 'Nota guardada' : ''}
      </p>
      {warnings && warnings.length > 0 ? (
        <div className="rounded-box border border-warning/30 bg-warning/10 p-3 text-sm">
          <p className="font-medium">{captureCopy.draftWarning}</p>
          <ul className="list-disc pl-5">
            {warnings.map((code) => (
              <li key={code}>{captureCopy.warnings[code]}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {originalText ? (
        <details className="rounded-box border border-base-300 p-3 text-sm">
          <summary className="cursor-pointer font-medium">{captureCopy.originalText}</summary>
          <p className="mt-2 whitespace-pre-wrap">{originalText}</p>
        </details>
      ) : null}

      <TextField
        id="note-title"
        label={notesCopy.labels.title}
        value={values.title}
        onChange={(value) => editor.update({ title: value })}
        error={errors.title}
        placeholder={notesCopy.placeholders.title}
        floating
        inputClassName="text-base font-semibold"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={notesCopy.labels.checklistMode}
            aria-pressed={values.checklistMode}
            className={toolbarButtonClass(values.checklistMode)}
            onClick={() => editor.toggleChecklistMode()}
          >
            <ListIcon />
          </button>
          <button
            type="button"
            aria-label={values.isPinned ? notesCopy.actions.unpin : notesCopy.actions.pin}
            aria-pressed={values.isPinned}
            className={toolbarButtonClass(values.isPinned)}
            onClick={() => editor.update({ isPinned: !values.isPinned })}
          >
            <PinIcon />
          </button>
        </div>
        <ReminderInput
          id="note-reminder"
          label={notesCopy.labels.reminder}
          value={values.rememberAt}
          onChange={(value) => editor.update({ rememberAt: value })}
        />
      </div>

      {values.checklistMode ? (
        <fieldset className="flex flex-col gap-2" aria-label={notesCopy.labels.checklistItems}>
          {values.checklistItems.map((item, index) => (
            <div
              key={item.clientId}
              data-checklist-index={index}
              className={`flex min-h-11 items-start gap-1 rounded-lg border px-1 py-1 transition ${
                dragIndex !== null && overIndex === index ? 'border-primary/30 bg-primary/5' : 'border-transparent'
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
                className="flex h-9 w-9 shrink-0 cursor-grab touch-none select-none items-center justify-center text-neutral hover:text-base-content"
                onPointerDown={(event) => {
                  event.preventDefault()
                  setDragIndex(index)
                }}
              >
                <DragHandleIcon />
              </span>
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-2"
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
                className="min-h-6 w-full flex-1 resize-none overflow-y-auto rounded-none border-x-0 border-t-0 border-b border-base-300 bg-transparent px-1 py-2 text-sm leading-5 focus:border-primary focus:outline-none"
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
                className="mt-0.5 h-8 w-8 text-neutral hover:text-error"
                onClick={() => editor.removeChecklistItem(index)}
              >
                <CrossIcon />
              </IconButton>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline btn-sm self-start"
            onClick={() => {
              focusLastRef.current = true
              editor.addChecklistItem()
            }}
          >
            {notesCopy.actions.addItem}
          </button>
          <p
            aria-live="polite"
            className={`text-right text-xs ${overLimit ? 'text-error' : 'text-neutral'}`}
          >
            {usedChars}/{LIMITS.contentMax}
          </p>
          {errors.checklistItems ? (
            <p role="alert" className="text-sm text-error">
              {errors.checklistItems}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-1">
          <textarea
            id="note-content"
            aria-label={notesCopy.labels.content}
            className="textarea min-h-[160px] w-full resize-y rounded-box border-base-300 bg-base-200 p-3 text-sm leading-relaxed"
            placeholder={notesCopy.placeholders.content}
            value={values.content}
            onChange={(event) => editor.update({ content: event.target.value })}
          />
          <p
            aria-live="polite"
            className={`text-right text-xs ${overLimit ? 'text-error' : 'text-neutral'}`}
          >
            {usedChars}/{LIMITS.contentMax}
          </p>
          {errors.content ? (
            <p role="alert" className="text-sm text-error">
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
        onCreate={onCreateTag}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={handleCancel}>
          {notesCopy.actions.cancel}
        </button>
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={editor.saving}>
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
