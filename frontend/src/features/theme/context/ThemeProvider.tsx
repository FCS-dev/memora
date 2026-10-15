import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  THEME_BROADCAST_CHANNEL,
  THEME_STORAGE_KEY,
  isValidTheme,
  readStoredTheme,
  resolveDocumentTheme,
} from '../model/themes'
import type { Theme } from '../model/themes'
import { ThemeContext } from './themeContext'

function applyToDocument(theme: Theme | null): void {
  const resolved = resolveDocumentTheme(theme)
  if (resolved) {
    document.documentElement.dataset.theme = resolved
  } else {
    delete document.documentElement.dataset.theme
  }
}

function readInitialTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null
  }
  return readStoredTheme(localStorage)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme | null>(readInitialTheme)

  useEffect(() => {
    applyToDocument(theme)
  }, [theme])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
        return
      }
      setThemeState(isValidTheme(event.newValue) ? event.newValue : null)
    }
    window.addEventListener('storage', onStorage)

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL)
      channel.onmessage = (event: MessageEvent) => {
        setThemeState(isValidTheme(event.data) ? event.data : null)
      }
    }

    return () => {
      window.removeEventListener('storage', onStorage)
      channel?.close()
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    if (!isValidTheme(next)) {
      return
    }
    localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL)
      channel.postMessage(next)
      channel.close()
    }
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
