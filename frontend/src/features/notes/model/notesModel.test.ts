import { describe, expect, it } from 'vitest'
import { resolveGroupForPin, splitByGroup } from './grouping'
import { resolveNeighborUuids, resolveReorderPayloadFromDrop } from './position'
import type { Note } from './types'

function note(uuidNote: string, isPinned = false, isArchived = false): Note {
  return {
    uuidNote,
    title: uuidNote,
    content: '',
    checklistMode: false,
    checklistItems: null,
    rememberAt: null,
    isPinned,
    isArchived,
    tags: [],
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
  }
}

describe('splitByGroup', () => {
  it('separa fijadas, otras y archivadas (RF-3)', () => {
    const groups = splitByGroup([
      note('b', false, false),
      note('a', true, false),
      note('c', false, true),
    ])
    expect(groups.pinned.map((n) => n.uuidNote)).toEqual(['a'])
    expect(groups.others.map((n) => n.uuidNote)).toEqual(['b'])
    expect(groups.archived.map((n) => n.uuidNote)).toEqual(['c'])
  })
})

describe('resolveGroupForPin', () => {
  it('mapea el estado fijada al grupo destino (RF-27, RF-29)', () => {
    expect(resolveGroupForPin(true)).toBe('PINNED')
    expect(resolveGroupForPin(false)).toBe('NOT_PINNED')
  })
})

describe('resolveNeighborUuids', () => {
  const ordered = [note('A'), note('B'), note('C')]

  it('sube una posición con before/after correctos (RF-26)', () => {
    expect(resolveNeighborUuids(ordered, 'B', 'up')).toEqual({ beforeUuid: '', afterUuid: 'A' })
  })

  it('baja una posición con before/after correctos (RF-26)', () => {
    expect(resolveNeighborUuids(ordered, 'B', 'down')).toEqual({ beforeUuid: 'C', afterUuid: '' })
  })

  it('no hace nada en los extremos (RF-26)', () => {
    expect(resolveNeighborUuids(ordered, 'A', 'up')).toBeNull()
    expect(resolveNeighborUuids(ordered, 'C', 'down')).toBeNull()
  })

  it('no hace nada con una sola nota (RF-34)', () => {
    expect(resolveNeighborUuids([note('S')], 'S', 'up')).toBeNull()
    expect(resolveNeighborUuids([note('S')], 'S', 'down')).toBeNull()
  })
})

describe('resolveReorderPayloadFromDrop', () => {
  const ordered = [note('A'), note('B'), note('C')]

  it('mueve al inicio', () => {
    expect(resolveReorderPayloadFromDrop(ordered, 'C', 0)).toEqual({ beforeUuid: '', afterUuid: 'A' })
  })

  it('mueve al final', () => {
    expect(resolveReorderPayloadFromDrop(ordered, 'A', 2)).toEqual({ beforeUuid: 'C', afterUuid: '' })
  })

  it('devuelve null si la nota no está en el grupo', () => {
    expect(resolveReorderPayloadFromDrop(ordered, 'Z', 0)).toBeNull()
  })
})
