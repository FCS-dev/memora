import { notesCopy } from './copy'
import type {
  ChecklistItemForm,
  CreateNotePayload,
  FormErrors,
  Note,
  NoteFormValues,
  UpdateNotePayload,
} from './types'

export const LIMITS = {
  titleMin: 1,
  titleMax: 200,
  contentMax: 2500,
  tagMin: 1,
  tagMax: 25,
} as const

export function deriveChecklistItems(raw: string): ChecklistItemForm[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text) => ({ text, checked: false }))
}

export function isNoteEmpty(values: NoteFormValues): boolean {
  const hasTitle = values.title.trim().length > 0
  const hasContent = !values.checklistMode && values.content.trim().length > 0
  const hasItems =
    values.checklistMode && values.checklistItems.some((item) => item.text.trim().length > 0)
  return !hasTitle && !hasContent && !hasItems
}

export function charCount(values: NoteFormValues): number {
  if (values.checklistMode) {
    return values.checklistItems.reduce((total, item) => total + item.text.trim().length, 0)
  }
  return values.content.length
}

export function validateNoteForm(values: NoteFormValues): FormErrors {
  const errors: FormErrors = {}

  const titleLength = values.title.trim().length
  if (titleLength < LIMITS.titleMin) {
    errors.title = notesCopy.errors.required
  } else if (titleLength > LIMITS.titleMax) {
    errors.title = notesCopy.errors.titleTooLong
  }

  if (values.checklistMode) {
    const items = values.checklistItems.filter((item) => item.text.trim().length > 0)
    if (items.length === 0) {
      errors.checklistItems = notesCopy.errors.checklistEmpty
    }
  } else if (values.content.length > LIMITS.contentMax) {
    errors.content = notesCopy.errors.contentTooLong
  }

  return errors
}

export function buildChecklistRecord(items: ChecklistItemForm[]): Record<string, boolean> {
  const record: Record<string, boolean> = {}
  for (const item of items) {
    const key = item.text.trim()
    if (key.length === 0) continue
    record[key] = item.checked
  }
  return record
}

function toRememberAt(value: string): string | null {
  return value === '' ? null : value
}

export function buildCreatePayload(
  values: NoteFormValues,
  checklistItems: Record<string, boolean> | null,
): CreateNotePayload {
  return {
    title: values.title.trim(),
    content: values.checklistMode ? '' : values.content,
    checklistMode: values.checklistMode,
    checklistItems: values.checklistMode ? checklistItems : null,
    rememberAt: toRememberAt(values.rememberAt),
    isPinned: values.isPinned,
    isArchived: false,
    tagIds: values.tagIds,
  }
}

export function buildUpdatePayload(
  values: NoteFormValues,
  checklistItems: Record<string, boolean> | null,
): UpdateNotePayload {
  return {
    title: values.title.trim(),
    content: values.checklistMode ? '' : values.content,
    checklistMode: values.checklistMode,
    checklistItems: values.checklistMode ? checklistItems : null,
    rememberAt: toRememberAt(values.rememberAt),
    isPinned: values.isPinned,
    tagIds: values.tagIds,
  }
}

export function emptyFormValues(): NoteFormValues {
  return {
    title: '',
    content: '',
    checklistMode: false,
    checklistItems: [],
    tagIds: [],
    rememberAt: '',
    isPinned: false,
  }
}

export function noteToFormValues(note: Note, tagIdsByName: Record<string, number>): NoteFormValues {
  return {
    title: note.title,
    content: note.checklistMode ? '' : note.content,
    checklistMode: note.checklistMode,
    checklistItems: note.checklistMode
      ? Object.entries(note.checklistItems ?? {}).map(([text, checked]) => ({ text, checked }))
      : [],
    tagIds: note.tags
      .map((name) => tagIdsByName[name])
      .filter((id): id is number => typeof id === 'number'),
    rememberAt: note.rememberAt ? note.rememberAt.slice(0, 16) : '',
    isPinned: note.isPinned,
  }
}

export function sameFormValues(a: NoteFormValues, b: NoteFormValues): boolean {
  const serializeItems = (items: ChecklistItemForm[]) =>
    items.map((item) => `${item.text}\u0000${item.checked}`).join('\u0001')
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.checklistMode === b.checklistMode &&
    a.rememberAt === b.rememberAt &&
    a.isPinned === b.isPinned &&
    serializeItems(a.checklistItems) === serializeItems(b.checklistItems) &&
    a.tagIds.join(',') === b.tagIds.join(',')
  )
}
