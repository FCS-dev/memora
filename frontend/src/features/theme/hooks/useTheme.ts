import { useContext } from 'react'
import { ThemeContext } from '../context/themeContext'
import type { ThemeContextValue } from '../context/themeContext'

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider')
  }
  return context
}
