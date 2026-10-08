import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('expone un estado con nombre accesible', () => {
    render(<Spinner />)

    expect(screen.getByRole('status')).toHaveAccessibleName('Cargando')
  })
})
