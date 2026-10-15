import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { emitTagsChanged } from '../../../shared/lib/events'
import { NotesFilterProvider } from './NotesFilterProvider'
import { useNotesFilter } from '../hooks/useNotesFilter'

function Probe() {
  const { reminderOnly, tagIds, toggleReminder, toggleTag, clear } = useNotesFilter()
  return (
    <div>
      <span data-testid="state">{`${reminderOnly}|${tagIds.join(',')}`}</span>
      <button onClick={toggleReminder}>rem</button>
      <button onClick={() => toggleTag(3)}>t3</button>
      <button onClick={() => toggleTag(9)}>t9</button>
      <button onClick={clear}>clear</button>
    </div>
  )
}

function Host() {
  const [show, setShow] = useState(true)
  return (
    <>
      <button onClick={() => setShow((value) => !value)}>switch</button>
      {show ? <Probe /> : null}
    </>
  )
}

function renderProvider() {
  return render(
    <NotesFilterProvider>
      <Probe />
    </NotesFilterProvider>,
  )
}

describe('NotesFilterProvider', () => {
  it('activa recordatorio, alterna etiquetas y limpia todo (RF-6)', async () => {
    renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'rem' }))
    await userEvent.click(screen.getByRole('button', { name: 't3' }))
    expect(screen.getByTestId('state')).toHaveTextContent('true|3')

    await userEvent.click(screen.getByRole('button', { name: 't3' }))
    expect(screen.getByTestId('state')).toHaveTextContent('true|')

    await userEvent.click(screen.getByRole('button', { name: 'clear' }))
    expect(screen.getByTestId('state')).toHaveTextContent('false|')
  })

  it('remapea la selección ante fusiones y borrados de etiquetas (RF-13)', async () => {
    renderProvider()
    await userEvent.click(screen.getByRole('button', { name: 't3' }))
    expect(screen.getByTestId('state')).toHaveTextContent('false|3')

    act(() => emitTagsChanged({ merged: [{ fromId: 3, toId: 9 }], deleted: [3] }))

    expect(screen.getByTestId('state')).toHaveTextContent('false|9')
  })

  it('conserva el estado cuando sus consumidores se desmontan y vuelven (RF-14)', async () => {
    render(
      <NotesFilterProvider>
        <Host />
      </NotesFilterProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'rem' }))
    expect(screen.getByTestId('state')).toHaveTextContent('true|')

    await userEvent.click(screen.getByRole('button', { name: 'switch' }))
    expect(screen.queryByTestId('state')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'switch' }))
    expect(screen.getByTestId('state')).toHaveTextContent('true|')
  })
})
