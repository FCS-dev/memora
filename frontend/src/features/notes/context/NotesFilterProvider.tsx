import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { subscribeTagsChanged } from '../../../shared/lib/events'
import { pruneTagIds, remapTagIds, toggleId } from '../model/filters'
import type { TagOption } from '../model/filters'
import { NotesFilterContext } from './notesFilterContext'

export function NotesFilterProvider({ children }: { children: ReactNode }) {
  const [reminderOnly, setReminderOnly] = useState(false)
  const [tagIds, setTagIds] = useState<number[]>([])

  useEffect(
    () =>
      subscribeTagsChanged((detail) => {
        setTagIds((current) => remapTagIds(current, detail))
      }),
    [],
  )

  const toggleReminder = useCallback(() => setReminderOnly((value) => !value), [])

  const toggleTag = useCallback((id: number) => {
    setTagIds((current) => toggleId(current, id))
  }, [])

  const pruneTags = useCallback((options: TagOption[]) => {
    setTagIds((current) => {
      const pruned = pruneTagIds(current, options)
      return pruned.length === current.length ? current : pruned
    })
  }, [])

  const clearTags = useCallback(() => setTagIds([]), [])

  const clear = useCallback(() => {
    setReminderOnly(false)
    setTagIds([])
  }, [])

  const value = useMemo(
    () => ({ reminderOnly, tagIds, toggleReminder, toggleTag, pruneTags, clearTags, clear }),
    [reminderOnly, tagIds, toggleReminder, toggleTag, pruneTags, clearTags, clear],
  )

  return <NotesFilterContext.Provider value={value}>{children}</NotesFilterContext.Provider>
}
