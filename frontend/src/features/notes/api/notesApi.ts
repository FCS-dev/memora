import { request } from '../../../shared/lib/http'
import type {
  ChangeGroupPayload,
  CreateNotePayload,
  Note,
  ReorderPayload,
  UpdateNotePayload,
} from '../model/types'

export function listNotes(): Promise<Note[]> {
  return request<Note[]>('/notes', { auth: true })
}

export function listArchivedNotes(): Promise<Note[]> {
  return request<Note[]>('/notes/archived', { auth: true })
}

export function getNote(uuidNote: string): Promise<Note> {
  return request<Note>(`/notes/${uuidNote}`, { auth: true })
}

export function createNote(payload: CreateNotePayload): Promise<Note> {
  return request<Note>('/notes', { method: 'POST', body: payload, auth: true })
}

export function updateNote(uuidNote: string, payload: UpdateNotePayload): Promise<Note> {
  return request<Note>(`/notes/${uuidNote}`, { method: 'PUT', body: payload, auth: true })
}

export function deleteNote(uuidNote: string): Promise<void> {
  return request<void>(`/notes/${uuidNote}`, { method: 'DELETE', auth: true })
}

export function reorderNote(uuidNote: string, payload: ReorderPayload): Promise<Note> {
  return request<Note>(`/notes/${uuidNote}/position`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  })
}

export function changeNoteGroup(uuidNote: string, payload: ChangeGroupPayload): Promise<Note> {
  return request<Note>(`/notes/${uuidNote}/group`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  })
}

export function updateChecklistItem(
  uuidNote: string,
  item: string,
  checked: boolean,
): Promise<Note> {
  return request<Note>(`/notes/${uuidNote}/checklist`, {
    method: 'PATCH',
    body: { item, checked },
    auth: true,
  })
}
