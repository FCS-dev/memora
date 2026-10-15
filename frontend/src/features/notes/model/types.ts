export type NoteGroup = 'PINNED' | 'NOT_PINNED' | 'ARCHIVED'

export type ViewMode = 'card' | 'list'

export type Panel = 'main' | 'archived'

export interface Note {
  uuidNote: string
  title: string
  content: string
  checklistMode: boolean
  checklistItems: ChecklistItemForm[] | null
  rememberAt: string | null
  isPinned: boolean
  isArchived: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: number
  tagName: string
  global: boolean
  noteCount: number
}

export interface RenameTagPayload {
  tagName: string
}

export interface NotesFilter {
  reminderOnly: boolean
  tagIds: number[]
}

export interface CreateTagResult {
  tag: Tag
  reused: boolean
}

export interface ChecklistItemForm {
  clientId?: string
  text: string
  checked: boolean
}

export interface NoteFormValues {
  title: string
  content: string
  checklistMode: boolean
  checklistItems: ChecklistItemForm[]
  tagIds: number[]
  rememberAt: string
  isPinned: boolean
}

export type NoteField = 'title' | 'content' | 'checklistItems'

export type FormErrors = Partial<Record<NoteField, string>>

export interface CreateNotePayload {
  title: string
  content: string | null
  checklistMode: boolean
  checklistItems: ChecklistItemForm[] | null
  rememberAt: string | null
  isPinned: boolean
  isArchived: boolean
  tagIds: number[]
}

export interface UpdateNotePayload {
  title: string
  content: string | null
  checklistMode: boolean
  checklistItems: ChecklistItemForm[] | null
  rememberAt: string | null
  isPinned: boolean | null
  tagIds: number[]
}

export interface ReorderPayload {
  beforeUuid: string
  afterUuid: string
}

export interface ChangeGroupPayload {
  group: NoteGroup
}
