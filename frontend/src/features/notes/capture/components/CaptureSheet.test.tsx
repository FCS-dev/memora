import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CaptureSheet } from './CaptureSheet'
import { captureCopy } from '../model/copy'

function renderSheet(text: string, onCancel = vi.fn()) {
  return render(
    <CaptureSheet
      text={text}
      status="editing"
      canReview={text.trim() !== ''}
      onChange={vi.fn()}
      onReview={vi.fn()}
      onManual={vi.fn()}
      onCancel={onCancel}
    />,
  )
}

describe('CaptureSheet', () => {
  it('muestra la pista de dictado nativo en móvil/táctil', () => {
    renderSheet('')
    expect(screen.getByText(captureCopy.mobileDictationHint)).toBeInTheDocument()
  })

  it('cierra al hacer click fuera si el texto está vacío', async () => {
    const onCancel = vi.fn()
    renderSheet('', onCancel)

    await userEvent.click(screen.getByRole('dialog', { name: captureCopy.title }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('pide confirmación al hacer click fuera si hay texto', async () => {
    const onCancel = vi.fn()
    renderSheet('texto sin guardar', onCancel)

    await userEvent.click(screen.getByRole('dialog', { name: captureCopy.title }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: captureCopy.confirmDiscardTitle })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(onCancel).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('dialog', { name: captureCopy.title }))
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('pide confirmación con Escape si hay texto', async () => {
    const onCancel = vi.fn()
    renderSheet('texto sin guardar', onCancel)

    await userEvent.keyboard('{Escape}')

    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: captureCopy.confirmDiscardTitle })).toBeInTheDocument()
  })

  it('no cierra al hacer click fuera mientras interpreta', async () => {
    const onCancel = vi.fn()
    render(
      <CaptureSheet
        text="texto"
        status="interpreting"
        canReview={false}
        onChange={vi.fn()}
        onReview={vi.fn()}
        onManual={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await userEvent.click(screen.getByRole('dialog', { name: captureCopy.title }))

    expect(onCancel).not.toHaveBeenCalled()
  })
})
