import { createContext } from 'react'
import type { TagOption } from '../model/filters'

export interface NotesFilterContextValue {
  reminderOnly: boolean
  tagIds: number[]
  toggleReminder: () => void
  toggleTag: (id: number) => void
  pruneTags: (options: TagOption[]) => void
  clearTags: () => void
  clear: () => void
}

export const NotesFilterContext = createContext<NotesFilterContextValue | null>(null)
