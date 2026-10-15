import { describe, expect, it } from 'vitest'
import {
  buildTagOptions,
  filterNotes,
  frequentOptions,
  isFilterActive,
  pruneTagIds,
  remapTagIds,
  resolveSelectedNames,
  toggleId,
} from './filters'
import type { Note, Tag } from './types'

function note(overrides: Partial<Note> = {}): Note {
  return {
    uuidNote: overrides.uuidNote ?? 'n1',
    title: 'Nota',
    content: 'contenido',
    checklistMode: false,
    checklistItems: null,
    rememberAt: null,
    isPinned: false,
    isArchived: false,
    tags: [],
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function tag(id: number, tagName: string, global = false, noteCount = 0): Tag {
  return { id, tagName, global, noteCount }
}

describe('isFilterActive', () => {
  it('es falso sin filtros y verdadero con recordatorio o etiquetas', () => {
    expect(isFilterActive({ reminderOnly: false, tagIds: [] })).toBe(false)
    expect(isFilterActive({ reminderOnly: true, tagIds: [] })).toBe(true)
    expect(isFilterActive({ reminderOnly: false, tagIds: [1] })).toBe(true)
  })
})

describe('toggleId', () => {
  it('agrega y quita un id', () => {
    expect(toggleId([], 3)).toEqual([3])
    expect(toggleId([3, 5], 3)).toEqual([5])
  })
})

describe('buildTagOptions', () => {
  it('cuenta el uso desde las notas (incluye archivadas) y excluye las no usadas (RF-3, RF-12)', () => {
    const notes = [
      note({ uuidNote: 'a', tags: ['casa'] }),
      note({ uuidNote: 'b', tags: ['casa', 'trabajo'] }),
      note({ uuidNote: 'c', isArchived: true, tags: ['casa'] }),
    ]
    const options = buildTagOptions(notes, [tag(1, 'casa'), tag(2, 'trabajo'), tag(3, 'sinuso')])

    expect(options.map((option) => option.tagName)).toEqual(['casa', 'trabajo'])
    expect(options[0].usage).toBe(3)
    expect(options[1].usage).toBe(1)
  })

  it('cuenta una vez por nota aunque la etiqueta se repita', () => {
    const options = buildTagOptions([note({ tags: ['casa', 'casa'] })], [tag(1, 'casa')])
    expect(options[0].usage).toBe(1)
  })

  it('deduplica homónimas dando prioridad a la global (RF-3)', () => {
    const notes = [note({ tags: ['casa'] })]
    const options = buildTagOptions(notes, [tag(1, 'casa', false), tag(9, 'casa', true)])

    expect(options).toHaveLength(1)
    expect(options[0].id).toBe(9)
    expect(options[0].global).toBe(true)
  })

  it('ordena por uso desc y luego nombre asc', () => {
    const notes = [
      note({ uuidNote: 'a', tags: ['zeta', 'alfa'] }),
      note({ uuidNote: 'b', tags: ['zeta'] }),
    ]
    const options = buildTagOptions(notes, [tag(1, 'zeta'), tag(2, 'alfa')])

    expect(options.map((option) => option.tagName)).toEqual(['zeta', 'alfa'])
  })
})

describe('frequentOptions', () => {
  it('limita el resultado (por defecto 5)', () => {
    const options = Array.from({ length: 7 }, (_, index) => ({
      id: index,
      tagName: `t${index}`,
      global: false,
      usage: 7 - index,
    }))
    expect(frequentOptions(options)).toHaveLength(5)
    expect(frequentOptions(options, 3)).toHaveLength(3)
  })
})

describe('pruneTagIds', () => {
  it('descarta ids que ya no están entre las opciones (RF-13)', () => {
    const options = [
      { id: 1, tagName: 'casa', global: false, usage: 1 },
      { id: 2, tagName: 'trabajo', global: false, usage: 1 },
    ]
    expect(pruneTagIds([1, 5, 2], options)).toEqual([1, 2])
  })
})

describe('remapTagIds', () => {
  it('reasigna fusiones y quita borrados (RF-13)', () => {
    expect(remapTagIds([3, 7], { merged: [{ fromId: 3, toId: 9 }], deleted: [3, 7] })).toEqual([9])
  })

  it('sin detalle deja los ids igual', () => {
    expect(remapTagIds([1, 2], {})).toEqual([1, 2])
  })

  it('evita duplicados tras la fusión', () => {
    expect(remapTagIds([3, 9], { merged: [{ fromId: 3, toId: 9 }] })).toEqual([9])
  })
})

describe('resolveSelectedNames', () => {
  it('traduce ids a nombres existentes y descarta ids inexistentes', () => {
    const options = [{ id: 1, tagName: 'casa', global: false, usage: 1 }]
    expect(resolveSelectedNames([1, 5], options)).toEqual(['casa'])
  })
})

describe('filterNotes', () => {
  it('sin filtros devuelve todas (RF-11)', () => {
    const notes = [note({ uuidNote: 'a' }), note({ uuidNote: 'b', rememberAt: '2020-01-01T00:00' })]
    expect(filterNotes(notes, { reminderOnly: false, tagNames: [] })).toHaveLength(2)
  })

  it('incluye recordatorios pasados y futuros (RF-2)', () => {
    const notes = [
      note({ uuidNote: 'a', rememberAt: '2000-01-01T00:00' }),
      note({ uuidNote: 'b', rememberAt: '2999-01-01T00:00' }),
      note({ uuidNote: 'c' }),
    ]
    const result = filterNotes(notes, { reminderOnly: true, tagNames: [] })
    expect(result.map((item) => item.uuidNote)).toEqual(['a', 'b'])
  })

  it('con varias etiquetas muestra las que tengan al menos una (RF-4)', () => {
    const notes = [
      note({ uuidNote: 'a', tags: ['casa'] }),
      note({ uuidNote: 'b', tags: ['trabajo'] }),
      note({ uuidNote: 'c', tags: ['otra'] }),
    ]
    const result = filterNotes(notes, { reminderOnly: false, tagNames: ['casa', 'trabajo'] })
    expect(result.map((item) => item.uuidNote)).toEqual(['a', 'b'])
  })

  it('combina recordatorio y etiquetas con AND (RF-5)', () => {
    const notes = [
      note({ uuidNote: 'a', rememberAt: '2999-01-01T00:00', tags: ['casa'] }),
      note({ uuidNote: 'b', tags: ['casa'] }),
      note({ uuidNote: 'c', rememberAt: '2999-01-01T00:00', tags: ['trabajo'] }),
    ]
    const result = filterNotes(notes, { reminderOnly: true, tagNames: ['casa'] })
    expect(result.map((item) => item.uuidNote)).toEqual(['a'])
  })
})
