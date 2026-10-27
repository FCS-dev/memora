import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNoteEditor } from './useNoteEditor'
import type { ChecklistItemForm, Note } from '../model/types'

function stripId(items: ChecklistItemForm[]) {
  return items.map(({ text, checked }) => ({ text, checked }))
}

const note: Note = {
  uuidNote: 'N',
  title: 'Nota',
  content: '',
  checklistMode: true,
  checklistItems: [
    { text: 'uno', checked: true },
    { text: 'dos', checked: false },
  ],
  rememberAt: '2026-02-03T08:30:00',
  isPinned: false,
  isArchived: false,
  tags: ['casa'],
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
}

describe('useNoteEditor', () => {
  it('deriva ítems del contenido al activar checklist (RF-15)', () => {
    const { result } = renderHook(() => useNoteEditor(null, {}, vi.fn()))

    act(() => result.current.update({ content: 'uno\n\n dos \ntres' }))
    act(() => result.current.toggleChecklistMode())

    expect(result.current.values.checklistMode).toBe(true)
    expect(stripId(result.current.values.checklistItems)).toEqual([
      { text: 'uno', checked: false },
      { text: 'dos', checked: false },
      { text: 'tres', checked: false },
    ])
  })

  it('muestra una primera casilla si no hay contenido (RF-15)', () => {
    const { result } = renderHook(() => useNoteEditor(null, {}, vi.fn()))
    act(() => result.current.toggleChecklistMode())
    expect(stripId(result.current.values.checklistItems)).toEqual([{ text: '', checked: false }])
  })

  it('permite marcar y desmarcar un ítem (RF-41)', () => {
    const { result } = renderHook(() => useNoteEditor(note, { casa: 7 }, vi.fn()))

    act(() => result.current.toggleChecklistItemChecked(1))

    expect(stripId(result.current.values.checklistItems)).toEqual([
      { text: 'uno', checked: true },
      { text: 'dos', checked: true },
    ])
    expect(result.current.dirty).toBe(true)
  })

  it('reordena los ítems del checklist (RF-4, RF-5)', () => {
    const { result } = renderHook(() => useNoteEditor(note, { casa: 7 }, vi.fn()))

    act(() => result.current.moveChecklistItem(0, 1))

    expect(stripId(result.current.values.checklistItems)).toEqual([
      { text: 'dos', checked: false },
      { text: 'uno', checked: true },
    ])
    expect(result.current.dirty).toBe(true)
  })

  it('cancela cuando la nota no tiene datos (RF-22)', async () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useNoteEditor(null, {}, onSave))

    let status = ''
    await act(async () => {
      status = (await result.current.save()).status
    })

    expect(status).toBe('empty')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('valida y no guarda sin título (RF-21)', async () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useNoteEditor(null, {}, onSave))
    act(() => result.current.update({ content: 'algo' }))

    let status = ''
    await act(async () => {
      status = (await result.current.save()).status
    })

    expect(status).toBe('invalid')
    expect(result.current.errors.title).toBeDefined()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('construye el payload y guarda (RF-13, RF-18)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useNoteEditor(null, {}, onSave))
    act(() => result.current.update({ title: 'T', content: 'c' }))

    let status = ''
    await act(async () => {
      status = (await result.current.save()).status
    })

    expect(status).toBe('saved')
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'T', content: 'c', isPinned: false }),
    )
  })

  it('precarga la nota y preserva el estado del checklist al guardar (RF-12)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useNoteEditor(note, { casa: 7 }, onSave))

    expect(result.current.values.title).toBe('Nota')
    expect(stripId(result.current.values.checklistItems)).toEqual([
      { text: 'uno', checked: true },
      { text: 'dos', checked: false },
    ])
    expect(result.current.values.tagIds).toEqual([7])
    expect(result.current.dirty).toBe(false)

    await act(async () => {
      await result.current.save()
    })

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        checklistItems: [
          { text: 'uno', checked: true },
          { text: 'dos', checked: false },
        ],
      }),
    )
  })
})


describe('borrador e idempotencia', () => {
  it('precarga un texto inicial con fallback de título y contenido', () => {
    const { result } = renderHook(() =>
      useNoteEditor(null, {}, vi.fn(), { initialText: 'comprar pan' }),
    )
    expect(result.current.values.title).toBe('comprar pan')
    expect(result.current.values.content).toBe('comprar pan')
    expect(result.current.values.isPinned).toBe(false)
  })

  it('precarga un borrador con etiquetas y recordatorio', () => {
    const { result } = renderHook(() =>
      useNoteEditor(null, {}, vi.fn(), {
        initialDraft: {
          title: 'Comprar pan',
          content: '',
          checklistMode: false,
          checklistItems: [],
          rememberAt: '2026-10-27T18:00:00',
          tagIds: [2],
        },
      }),
    )
    expect(result.current.values.title).toBe('Comprar pan')
    expect(result.current.values.tagIds).toEqual([2])
    expect(result.current.values.rememberAt).toBe('2026-10-27T18:00')
  })

  it('reutiliza la clave de idempotencia en reintentos', async () => {
    const onSave = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useNoteEditor(null, {}, onSave, { initialText: 'texto' }))

    await act(async () => {
      await result.current.save()
    })
    await act(async () => {
      await result.current.save()
    })

    const first = onSave.mock.calls[0][0] as { idempotencyKey?: string }
    const second = onSave.mock.calls[1][0] as { idempotencyKey?: string }
    expect(first.idempotencyKey).toBeDefined()
    expect(second.idempotencyKey).toBe(first.idempotencyKey)
  })
})
