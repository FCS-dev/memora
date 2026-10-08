import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('oculta la contraseña por defecto y permite mostrarla y ocultarla', async () => {
    render(<PasswordInput id="password" label="Contraseña" value="secreto" onChange={() => {}} />)

    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('asocia el mensaje de error al campo', () => {
    render(
      <PasswordInput
        id="password"
        label="Contraseña"
        value=""
        onChange={() => {}}
        error="Contraseña inválida"
      />,
    )

    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'password-error')
    expect(screen.getByRole('alert')).toHaveTextContent('Contraseña inválida')
  })
})
