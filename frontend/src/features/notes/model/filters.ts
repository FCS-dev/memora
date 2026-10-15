import type { Note, NotesFilter, Tag } from './types'

export interface TagOption {
  id: number
  tagName: string
  global: boolean
  usage: number
}

export interface TagsChangedDetail {
  merged?: { fromId: number; toId: number }[]
  deleted?: number[]
}

export interface ResolvedFilter {
  reminderOnly: boolean
  tagNames: string[]
}

export function isFilterActive(filter: NotesFilter): boolean {
  return filter.reminderOnly || filter.tagIds.length > 0
}

export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]
}

export function buildTagOptions(notes: Note[], tags: Tag[]): TagOption[] {
  const usage = new Map<string, number>()
  for (const note of notes) {
    for (const name of new Set(note.tags)) {
      usage.set(name, (usage.get(name) ?? 0) + 1)
    }
  }

  const byName = new Map<string, TagOption>()
  for (const tag of tags) {
    const count = usage.get(tag.tagName) ?? 0
    if (count === 0) {
      continue
    }
    const current = byName.get(tag.tagName)
    if (!current || (tag.global && !current.global)) {
      byName.set(tag.tagName, {
        id: tag.id,
        tagName: tag.tagName,
        global: tag.global,
        usage: count,
      })
    }
  }

  return [...byName.values()].sort(
    (a, b) => b.usage - a.usage || a.tagName.localeCompare(b.tagName, 'es', { sensitivity: 'base' }),
  )
}

export function frequentOptions(options: TagOption[], limit = 5): TagOption[] {
  return options.slice(0, limit)
}

export function pruneTagIds(ids: number[], options: TagOption[]): number[] {
  const valid = new Set(options.map((option) => option.id))
  return ids.filter((id) => valid.has(id))
}

export function remapTagIds(ids: number[], detail: TagsChangedDetail): number[] {
  const merged = new Map((detail.merged ?? []).map((entry) => [entry.fromId, entry.toId]))
  const deleted = new Set(detail.deleted ?? [])
  const result: number[] = []
  for (const id of ids) {
    const next = merged.get(id) ?? id
    if (deleted.has(next) || result.includes(next)) {
      continue
    }
    result.push(next)
  }
  return result
}

export function resolveSelectedNames(ids: number[], options: TagOption[]): string[] {
  const byId = new Map(options.map((option) => [option.id, option.tagName]))
  return ids
    .map((id) => byId.get(id))
    .filter((name): name is string => name !== undefined)
}

export function filterNotes(notes: Note[], filter: ResolvedFilter): Note[] {
  return notes.filter((note) => {
    if (filter.reminderOnly && !note.rememberAt) {
      return false
    }
    if (filter.tagNames.length > 0 && !note.tags.some((name) => filter.tagNames.includes(name))) {
      return false
    }
    return true
  })
}
