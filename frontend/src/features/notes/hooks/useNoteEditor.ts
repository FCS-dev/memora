import { useCallback, useMemo, useRef, useState } from 'react'
import { mapNotesError } from '../model/errors'
import {
  buildChecklistPayload,
  buildCreatePayload,
  buildUpdatePayload,
  deriveChecklistItems,
  draftToFormValues,
  emptyFormValues,
  fallbackFormValues,
  isNoteEmpty,
  newChecklistItem,
  noteToFormValues,
  sameFormValues,
  validateNoteForm,
} from '../model/validation'
import type { NoteDraft } from '../capture/model/types'
import type {
  CreateNotePayload,
  FormErrors,
  Note,
  NoteFormValues,
  UpdateNotePayload,
} from '../model/types'

export type SaveResult =
  | { status: 'saved' }
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'error'; message: string }

export interface UseNoteEditorResult {
  values: NoteFormValues
  errors: FormErrors
  saving: boolean
  dirty: boolean
  update: (patch: Partial<NoteFormValues>) => void
  setChecklistItem: (index: number, text: string) => void
  toggleChecklistItemChecked: (index: number) => void
  addChecklistItem: () => void
  removeChecklistItem: (index: number) => void
  moveChecklistItem: (fromIndex: number, toIndex: number) => void
  toggleChecklistMode: () => void
  save: () => Promise<SaveResult>
}

export interface UseNoteEditorOptions {
  initialDraft?: NoteDraft
  initialText?: string
  idempotencyKey?: string
}

function createIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useNoteEditor(
  note: Note | null,
  tagIdsByName: Record<string, number>,
  onSave: (payload: CreateNotePayload | UpdateNotePayload) => Promise<void>,
  options: UseNoteEditorOptions = {},
): UseNoteEditorResult {
  const initial = useMemo(() => {
    if (note) {
      return noteToFormValues(note, tagIdsByName)
    }
    if (options.initialDraft) {
      return draftToFormValues(options.initialDraft)
    }
    if (options.initialText?.trim()) {
      return fallbackFormValues(options.initialText)
    }
    return emptyFormValues()
  }, [note, tagIdsByName, options.initialDraft, options.initialText])
  const idempotencyKeyRef = useRef(options.idempotencyKey ?? createIdempotencyKey())
  const [values, setValues] = useState<NoteFormValues>(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  const dirty = !sameFormValues(values, initial)

  const update = useCallback((patch: Partial<NoteFormValues>) => {
    setValues((current) => ({ ...current, ...patch }))
  }, [])

  const setChecklistItem = useCallback((index: number, text: string) => {
    setValues((current) => ({
      ...current,
      checklistItems: current.checklistItems.map((item, i) => (i === index ? { ...item, text } : item)),
    }))
  }, [])

  const toggleChecklistItemChecked = useCallback((index: number) => {
    setValues((current) => ({
      ...current,
      checklistItems: current.checklistItems.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    }))
  }, [])

  const addChecklistItem = useCallback(() => {
    setValues((current) => ({
      ...current,
      checklistItems: [...current.checklistItems, newChecklistItem()],
    }))
  }, [])

  const removeChecklistItem = useCallback((index: number) => {
    setValues((current) => ({
      ...current,
      checklistItems: current.checklistItems.filter((_, i) => i !== index),
    }))
  }, [])

  const moveChecklistItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    setValues((current) => {
      const items = [...current.checklistItems]
      const [removed] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, removed)
      return { ...current, checklistItems: items }
    })
  }, [])

  const toggleChecklistMode = useCallback(() => {
    setValues((current) => {
      if (current.checklistMode) {
        const text = current.checklistItems
          .filter((item) => item.text.trim().length > 0)
          .map((item) => item.text)
          .join('\n')
        return { ...current, checklistMode: false, content: text }
      }
      const items =
        current.content.trim().length > 0 ? deriveChecklistItems(current.content) : []
      return {
        ...current,
        checklistMode: true,
        checklistItems: items.length > 0 ? items : [newChecklistItem()],
      }
    })
  }, [])

  const save = useCallback(async (): Promise<SaveResult> => {
    if (isNoteEmpty(values)) {
      return { status: 'empty' }
    }
    const validation = validateNoteForm(values)
    setErrors(validation)
    if (Object.keys(validation).length > 0) {
      return { status: 'invalid' }
    }
    setSaving(true)
    try {
      const checklistItems = values.checklistMode
        ? buildChecklistPayload(values.checklistItems)
        : null
      const payload = note
        ? buildUpdatePayload(values, checklistItems)
        : buildCreatePayload(values, checklistItems, idempotencyKeyRef.current)
      await onSave(payload)
      return { status: 'saved' }
    } catch (saveError) {
      return { status: 'error', message: mapNotesError(saveError) }
    } finally {
      setSaving(false)
    }
  }, [values, note, onSave])

  return {
    values,
    errors,
    saving,
    dirty,
    update,
    setChecklistItem,
    toggleChecklistItemChecked,
    addChecklistItem,
    removeChecklistItem,
    moveChecklistItem,
    toggleChecklistMode,
    save,
  }
}
