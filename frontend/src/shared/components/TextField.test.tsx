import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextField } from './TextField'

describe('TextField', () => {
  it('asocia la etiqueta al campo', () => {
    render(<TextField id="email" label="Correo electrónico" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
  })

  it('marca el campo inválido y asocia el mensaje de error', () => {
    render(
      <TextField
        id="email"
        label="Correo electrónico"
        value=""
        onChange={() => {}}
        error="Ingresa un correo válido"
      />,
    )

    const input = screen.getByLabelText('Correo electrónico')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'email-error')
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un correo válido')
  })

  it('no añade atributos de error cuando no hay error', () => {
    render(<TextField id="name" label="Nombre" value="Ana" onChange={() => {}} />)

    const input = screen.getByLabelText('Nombre')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
