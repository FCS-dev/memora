import type { TagsChangedDetail } from '../../features/notes/model/filters'

export const TAGS_CHANGED_EVENT = 'memora:tags-changed'

export function emitTagsChanged(detail?: TagsChangedDetail): void {
  window.dispatchEvent(new CustomEvent<TagsChangedDetail>(TAGS_CHANGED_EVENT, { detail }))
}

export function subscribeTagsChanged(handler: (detail: TagsChangedDetail) => void): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<TagsChangedDetail>).detail ?? {})
  }
  window.addEventListener(TAGS_CHANGED_EVENT, listener)
  return () => window.removeEventListener(TAGS_CHANGED_EVENT, listener)
}
