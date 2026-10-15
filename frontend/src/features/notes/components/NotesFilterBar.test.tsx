import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { notesCopy } from '../model/copy'
import type { TagOption } from '../model/filters'
import { NotesFilterBar } from './NotesFilterBar'

function option(id: number, tagName: string, usage = 1): TagOption {
  return { id, tagName, global: false, usage }
}

const options = [
  option(1, 'alfa', 7),
  option(2, 'beta', 6),
  option(3, 'gamma', 5),
  option(4, 'delta', 4),
  option(5, 'epsilon', 3),
  option(6, 'zeta', 2),
]

function renderBar(overrides: Partial<Parameters<typeof NotesFilterBar>[0]> = {}) {
  const props = {
    reminderOnly: false,
    tagIds: [] as number[],
    options,
    tagsStatus: 'ready' as const,
    onToggleReminder: vi.fn(),
    onToggleTag: vi.fn(),
    onClear: vi.fn(),
    onOpenSheet: vi.fn(),
    onRetryTags: vi.fn(),
    ...overrides,
  }
  render(<NotesFilterBar {...props} />)
  return props
}

describe('NotesFilterBar', () => {
  it('muestra Todos, Con recordatorio, el top 5 de etiquetas y Ver etiquetas (RF-1, RF-3)', () => {
    renderBar()

    expect(screen.getByRole('button', { name: notesCopy.filters.all })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: notesCopy.filters.reminder })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'alfa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'epsilon' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'zeta' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: notesCopy.filters.viewAll })).toBeInTheDocument()
  })

  it('usa botones de ícono con nombre accesible y etiquetas con ícono + nombre (RNF-2)', () => {
    renderBar()

    const all = screen.getByRole('button', { name: notesCopy.filters.all })
    expect(all).toHaveAttribute('aria-label', notesCopy.filters.all)
    expect(all).toHaveTextContent('')
    expect(all.querySelector('svg')).toBeInTheDocument()

    const reminder = screen.getByRole('button', { name: notesCopy.filters.reminder })
    expect(reminder).toHaveTextContent('')
    expect(reminder.querySelector('svg')).toBeInTheDocument()

    const viewAll = screen.getByRole('button', { name: notesCopy.filters.viewAll })
    expect(viewAll).toHaveTextContent('')
    expect(viewAll.querySelector('svg')).toBeInTheDocument()

    const chip = screen.getByRole('button', { name: 'alfa' })
    expect(chip.querySelector('svg')).toBeInTheDocument()
    expect(chip).toHaveTextContent('alfa')
  })

  it('refleja los filtros activos con aria-pressed (RF-7)', () => {
    renderBar({ reminderOnly: true, tagIds: [2] })

    expect(screen.getByRole('button', { name: notesCopy.filters.reminder })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'beta' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'alfa' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('invoca los callbacks de activar y limpiar (RF-2, RF-4, RF-6)', async () => {
    const props = renderBar()

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.reminder }))
    await userEvent.click(screen.getByRole('button', { name: 'beta' }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.viewAll }))
    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.all }))

    expect(props.onToggleReminder).toHaveBeenCalledOnce()
    expect(props.onToggleTag).toHaveBeenCalledWith(2)
    expect(props.onOpenSheet).toHaveBeenCalledOnce()
    expect(props.onClear).toHaveBeenCalledOnce()
  })

  it('sin etiquetas usadas solo ofrece Todos y Con recordatorio (RF-3)', () => {
    renderBar({ options: [] })

    expect(screen.getByRole('button', { name: notesCopy.filters.all })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: notesCopy.filters.reminder })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: notesCopy.filters.viewAll })).not.toBeInTheDocument()
  })

  it('ante error de etiquetas mantiene el recordatorio y ofrece reintento (RF-3)', async () => {
    const props = renderBar({ tagsStatus: 'error', options: [] })

    expect(screen.getByRole('button', { name: notesCopy.filters.reminder })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(notesCopy.filters.tagsError)

    await userEvent.click(screen.getByRole('button', { name: notesCopy.filters.retryTags }))
    expect(props.onRetryTags).toHaveBeenCalledOnce()
  })
})
