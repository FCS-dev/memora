import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorAlert } from './ErrorAlert'

describe('ErrorAlert', () => {
  it('muestra el mensaje con rol de alerta', () => {
    render(<ErrorAlert message="Ocurrió un error" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error')
  })
})
