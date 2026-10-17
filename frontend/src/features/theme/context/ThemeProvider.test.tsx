import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from '../hooks/useTheme'

function Probe() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme ?? 'none'}</span>
      <button onClick={() => setTheme('memora-dark')}>memora-dark</button>
      <button onClick={() => setTheme('memora-light')}>memora-light</button>
    </div>
  )
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('sin elección no fija data-theme para dejar actuar al default/OS (RF-34)', () => {
    renderProvider()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('aplica el tema al elegirlo y lo persiste (RF-32, RF-33)', async () => {
    renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'memora-dark' }))

    expect(document.documentElement.dataset.theme).toBe('memora-dark')
    expect(localStorage.getItem('memora.theme')).toBe('memora-dark')
    expect(screen.getByTestId('theme')).toHaveTextContent('memora-dark')
  })

  it('aplica el tema guardado al montar (RF-33)', () => {
    localStorage.setItem('memora.theme', 'memora-light')

    renderProvider()

    expect(document.documentElement.dataset.theme).toBe('memora-light')
  })

  it('retrocede al default ante un valor guardado inválido (RF-35)', () => {
    localStorage.setItem('memora.theme', 'inexistente')

    renderProvider()

    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('sincroniza el tema desde otras pestañas vía localStorage (RF-32)', async () => {
    renderProvider()

    fireEvent(window, new StorageEvent('storage', { key: 'memora.theme', newValue: 'memora-dark' }))

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('memora-dark'))
  })

  it('retrocede al default si otra pestaña borra el tema (RF-35)', async () => {
    localStorage.setItem('memora.theme', 'memora-dark')
    renderProvider()
    expect(document.documentElement.dataset.theme).toBe('memora-dark')

    fireEvent(window, new StorageEvent('storage', { key: 'memora.theme', newValue: null }))

    await waitFor(() => expect(document.documentElement.dataset.theme).toBeUndefined())
  })
})
