import { useContext } from 'react'
import { NotesFilterContext } from '../context/notesFilterContext'
import type { NotesFilterContextValue } from '../context/notesFilterContext'

export function useNotesFilter(): NotesFilterContextValue {
  const context = useContext(NotesFilterContext)
  if (!context) {
    throw new Error('useNotesFilter debe usarse dentro de NotesFilterProvider')
  }
  return context
}
