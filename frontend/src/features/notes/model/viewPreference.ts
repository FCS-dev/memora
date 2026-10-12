import type { ViewMode } from './types'

export const VIEW_MODE_STORAGE_KEY = 'memora.notes.viewMode'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function readViewMode(storage: StorageLike, fallback: ViewMode = 'card'): ViewMode {
  const raw = storage.getItem(VIEW_MODE_STORAGE_KEY)
  return raw === 'card' || raw === 'list' ? raw : fallback
}

export function writeViewMode(storage: StorageLike, mode: ViewMode): void {
  storage.setItem(VIEW_MODE_STORAGE_KEY, mode)
}
