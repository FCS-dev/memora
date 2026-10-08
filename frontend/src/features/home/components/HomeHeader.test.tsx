import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HomeHeader } from './HomeHeader'
import { authCopy } from '../../auth/model/copy'

describe('HomeHeader', () => {
  it('muestra el nombre, el encabezado y el cierre de sesión', () => {
    render(<HomeHeader title="Inicio" userName="Ana" onLogout={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: authCopy.actions.logout })).toBeInTheDocument()
  })

  it('invoca el cierre de sesión al pulsar el botón', async () => {
    const onLogout = vi.fn()
    render(<HomeHeader title="Inicio" userName="Ana" onLogout={onLogout} />)

    await userEvent.click(screen.getByRole('button', { name: authCopy.actions.logout }))

    expect(onLogout).toHaveBeenCalledOnce()
  })
})
