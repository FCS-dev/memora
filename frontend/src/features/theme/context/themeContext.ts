import { createContext } from 'react'
import type { Theme } from '../model/themes'

export interface ThemeContextValue {
  theme: Theme | null
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
