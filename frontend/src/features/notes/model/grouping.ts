import type { Note, NoteGroup } from './types'

export interface NoteGroups {
  pinned: Note[]
  others: Note[]
  archived: Note[]
}

export function splitByGroup(notes: Note[]): NoteGroups {
  const pinned: Note[] = []
  const others: Note[] = []
  const archived: Note[] = []

  for (const note of notes) {
    if (note.isArchived) {
      archived.push(note)
    } else if (note.isPinned) {
      pinned.push(note)
    } else {
      others.push(note)
    }
  }

  return { pinned, others, archived }
}

export function resolveGroupForPin(isPinned: boolean): NoteGroup {
  return isPinned ? 'PINNED' : 'NOT_PINNED'
}
