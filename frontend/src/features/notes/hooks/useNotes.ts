import { useCallback, useEffect, useRef, useState } from 'react'
import * as notesApi from '../api/notesApi'
import { mapNotesError } from '../model/errors'
import { resolveGroupForPin } from '../model/grouping'
import { applyReorder } from '../model/position'
import type { Note, ReorderPayload } from '../model/types'

export interface UseNotesResult {
  notes: Note[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  setPinned: (uuidNote: string, isPinned: boolean) => Promise<boolean>
  archive: (uuidNote: string) => Promise<boolean>
  remove: (uuidNote: string) => Promise<boolean>
  reorder: (uuidNote: string, payload: ReorderPayload) => Promise<boolean>
  setChecklistItemChecked: (uuidNote: string, item: string, checked: boolean) => Promise<boolean>
}

export function useNotes(): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const notesRef = useRef(notes)

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [active, archived] = await Promise.all([
        notesApi.listNotes(),
        notesApi.listArchivedNotes(),
      ])
      setNotes([...active, ...archived])
    } catch (loadError) {
      setError(mapNotesError(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const run = useCallback(
    async (
      optimistic: (current: Note[]) => Note[],
      action: () => Promise<Note | void>,
    ): Promise<boolean> => {
      const snapshot = notesRef.current
      setError(null)
      setNotes(optimistic(snapshot))
      try {
        const updated = await action()
        if (updated) {
          setNotes((current) =>
            current.map((note) => (note.uuidNote === updated.uuidNote ? updated : note)),
          )
        }
        return true
      } catch (actionError) {
        setNotes(snapshot)
        setError(mapNotesError(actionError))
        return false
      }
    },
    [],
  )

  const setPinned = useCallback(
    (uuidNote: string, isPinned: boolean) =>
      run(
        (current) =>
          current.map((note) =>
            note.uuidNote === uuidNote ? { ...note, isPinned, isArchived: false } : note,
          ),
        () => notesApi.changeNoteGroup(uuidNote, { group: resolveGroupForPin(isPinned) }),
      ),
    [run],
  )

  const archive = useCallback(
    (uuidNote: string) =>
      run(
        (current) =>
          current.map((note) =>
            note.uuidNote === uuidNote ? { ...note, isArchived: true, isPinned: false } : note,
          ),
        () => notesApi.changeNoteGroup(uuidNote, { group: 'ARCHIVED' }),
      ),
    [run],
  )

  const remove = useCallback(
    (uuidNote: string) =>
      run(
        (current) => current.filter((note) => note.uuidNote !== uuidNote),
        () => notesApi.deleteNote(uuidNote),
      ),
    [run],
  )

  const reorder = useCallback(
    (uuidNote: string, payload: ReorderPayload) =>
      run(
        (current) => applyReorder(current, uuidNote, payload),
        () => notesApi.reorderNote(uuidNote, payload),
      ),
    [run],
  )

  const setChecklistItemChecked = useCallback(
    (uuidNote: string, item: string, checked: boolean) =>
      run(
        (current) =>
          current.map((note) => {
            if (note.uuidNote !== uuidNote || !note.checklistItems) {
              return note
            }
            return {
              ...note,
              checklistItems: note.checklistItems.map((checklistItem) =>
                checklistItem.text === item ? { ...checklistItem, checked } : checklistItem,
              ),
            }
          }),
        () => notesApi.updateChecklistItem(uuidNote, item, checked),
      ),
    [run],
  )

  return {
    notes,
    loading,
    error,
    reload,
    setPinned,
    archive,
    remove,
    reorder,
    setChecklistItemChecked,
  }
}
