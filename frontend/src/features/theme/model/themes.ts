export const THEMES = ['cupcake', 'sunset', 'retro', 'nord', 'abyss'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'cupcake'
export const DARK_THEME: Theme = 'sunset'

export const THEME_STORAGE_KEY = 'memora.theme'
export const THEME_BROADCAST_CHANNEL = 'memora.theme'

export type StorageLike = Pick<Storage, 'getItem'>

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function readStoredTheme(storage: StorageLike): Theme | null {
  const raw = storage.getItem(THEME_STORAGE_KEY)
  return isValidTheme(raw) ? raw : null
}

export function resolveDocumentTheme(chosen: Theme | null): Theme | null {
  return isValidTheme(chosen) ? chosen : null
}
