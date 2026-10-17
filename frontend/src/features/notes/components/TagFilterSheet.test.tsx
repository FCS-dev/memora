import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { notesCopy } from '../model/copy'
import type { TagOption } from '../model/filters'
import { TagFilterSheet } from './TagFilterSheet'

const options: TagOption[] = [
  { id: 1, tagName: 'alfa', global: false, usage: 3 },
  { id: 2, tagName: 'beta', global: true, usage: 1 },
]

function Harness() {
  const [open, setOpen] = useState(false)
  const [tagIds, setTagIds] = useState<number[]>([1])
  return (
    <>
      <button onClick={() => setOpen(true)}>abrir</button>
      <TagFilterSheet
        open={open}
        options={options}
        tagIds={tagIds}
        onToggleTag={(id) =>
          setTagIds((current) =>
            current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
          )
        }
        onClear={() => setTagIds([])}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

async function openSheet() {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'abrir' }))
  return user
}

describe('TagFilterSheet', () => {
  it('lista todas las etiquetas filtrables con su estado (RF-3)', async () => {
    await openSheet()

    const dialog = screen.getByRole('dialog', { name: notesCopy.filters.sheetTitle })
    expect(within(dialog).getByRole('checkbox', { name: 'alfa' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'beta' })).not.toBeChecked()
  })

  it('alterna etiquetas y limpia (RF-4, RF-6)', async () => {
    const user = await openSheet()

    await user.click(screen.getByRole('checkbox', { name: 'beta' }))
    expect(screen.getByRole('checkbox', { name: 'beta' })).toBeChecked()

    await user.click(screen.getByRole('button', { name: notesCopy.filters.clear }))
    expect(screen.getByRole('checkbox', { name: 'alfa' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'beta' })).not.toBeChecked()
  })

  it('cierra con Escape y devuelve el foco al disparador (RNF-2)', async () => {
    const user = await openSheet()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'abrir' })).toHaveFocus()
  })

  it('mantiene el foco dentro del modal con Tab', async () => {
    const user = await openSheet()
    const dialog = screen.getByRole('dialog', { name: notesCopy.filters.sheetTitle })

    expect(dialog).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'alfa' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: notesCopy.filters.close })).toHaveFocus()
  })

  it('se cierra con el botón de cierre', async () => {
    const user = await openSheet()

    await user.click(screen.getByRole('button', { name: notesCopy.filters.close }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra un aviso cuando no hay etiquetas (RF-3)', async () => {
    const onClose = vi.fn()
    render(
      <TagFilterSheet
        open
        options={[]}
        tagIds={[]}
        onToggleTag={vi.fn()}
        onClear={vi.fn()}
        onClose={onClose}
      />,
    )

    expect(screen.getByText(notesCopy.filters.noTags)).toBeInTheDocument()
  })
})
