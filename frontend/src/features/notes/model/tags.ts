import type { Tag } from './types'

export function hasOverflow(scrollWidth: number, clientWidth: number): boolean {
  return scrollWidth > clientWidth
}

export function sortTagsByName(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) =>
    a.tagName.localeCompare(b.tagName, 'es', { sensitivity: 'base' }),
  )
}

export interface Page<T> {
  pageItems: T[]
  pageCount: number
  page: number
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(page, 1), pageCount)
  const start = (safePage - 1) * pageSize
  return { pageItems: items.slice(start, start + pageSize), pageCount, page: safePage }
}
