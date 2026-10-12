import { describe, expect, it } from 'vitest'
import {
  buildChecklistRecord,
  buildCreatePayload,
  buildUpdatePayload,
  charCount,
  deriveChecklistItems,
  isNoteEmpty,
  validateNoteForm,
} from './validation'
import type { NoteFormValues } from './types'

function values(overrides: Partial<NoteFormValues> = {}): NoteFormValues {
  return {
    title: '',
    content: '',
    checklistMode: false,
    checklistItems: [],
    tagIds: [],
    rememberAt: '',
    isPinned: false,
    ...overrides,
  }
}

describe('deriveChecklistItems', () => {
  it('separa por líneas, recorta espacios y descarta vacías (RF-15)', () => {
    expect(deriveChecklistItems('  uno \n\n dos \n   \ntres')).toEqual([
      { text: 'uno', checked: false },
      { text: 'dos', checked: false },
      { text: 'tres', checked: false },
    ])
  })
})

describe('isNoteEmpty', () => {
  it('considera vacía una nota sin título, contenido ni ítems', () => {
    expect(isNoteEmpty(values())).toBe(true)
  })

  it('no cuenta fijada, recordatorio ni checklist vacío como datos (RF-22)', () => {
    expect(
      isNoteEmpty(
        values({
          isPinned: true,
          rememberAt: '2026-01-01T10:00',
          checklistMode: true,
          checklistItems: [{ text: '', checked: false }],
        }),
      ),
    ).toBe(true)
  })

  it('deja de estar vacía con título, contenido o ítems', () => {
    expect(isNoteEmpty(values({ title: 'Hola' }))).toBe(false)
    expect(isNoteEmpty(values({ content: 'texto' }))).toBe(false)
    expect(
      isNoteEmpty(values({ checklistMode: true, checklistItems: [{ text: 'item', checked: false }] })),
    ).toBe(false)
  })
})

describe('validateNoteForm', () => {
  it('exige título (RF-21)', () => {
    expect(validateNoteForm(values()).title).toBeDefined()
  })

  it('limita el título a 200 caracteres (RF-21)', () => {
    expect(validateNoteForm(values({ title: 'a'.repeat(201) })).title).toBeDefined()
    expect(validateNoteForm(values({ title: 'a'.repeat(200) })).title).toBeUndefined()
  })

  it('limita el contenido a 2500 caracteres (RF-21)', () => {
    expect(validateNoteForm(values({ title: 't', content: 'a'.repeat(2501) })).content).toBeDefined()
    expect(validateNoteForm(values({ title: 't', content: 'a'.repeat(2500) })).content).toBeUndefined()
  })

  it('exige al menos un ítem en modo checklist (RF-21)', () => {
    expect(
      validateNoteForm(
        values({ title: 't', checklistMode: true, checklistItems: [{ text: '  ', checked: false }] }),
      ).checklistItems,
    ).toBeDefined()
    expect(
      validateNoteForm(
        values({ title: 't', checklistMode: true, checklistItems: [{ text: 'item', checked: false }] }),
      ).checklistItems,
    ).toBeUndefined()
  })
})

describe('charCount', () => {
  it('cuenta la longitud del contenido sin checklist (RF-36)', () => {
    expect(charCount(values({ content: 'hola mundo' }))).toBe(10)
  })

  it('suma las longitudes de los ítems recortados con checklist (RF-36)', () => {
    expect(
      charCount(
        values({
          checklistMode: true,
          checklistItems: [
            { text: '  casa ', checked: false },
            { text: 'perro', checked: false },
          ],
        }),
      ),
    ).toBe(9)
  })
})

describe('buildChecklistRecord', () => {
  it('construye el mapa usando el estado marcado de cada ítem (RF-41)', () => {
    expect(
      buildChecklistRecord([
        { text: 'a', checked: true },
        { text: ' b ', checked: false },
        { text: '   ', checked: true },
      ]),
    ).toEqual({ a: true, b: false })
  })
})

describe('buildCreatePayload', () => {
  it('arma una nota de texto (RF-18)', () => {
    const payload = buildCreatePayload(values({ title: ' T ', content: 'c', isPinned: true }), null)
    expect(payload).toEqual({
      title: 'T',
      content: 'c',
      checklistMode: false,
      checklistItems: null,
      rememberAt: null,
      isPinned: true,
      isArchived: false,
      tagIds: [],
    })
  })

  it('arma una nota checklist con su mapa de ítems (RF-15)', () => {
    const items = [
      { text: 'a', checked: true },
      { text: 'b', checked: false },
    ]
    const payload = buildCreatePayload(
      values({ title: 'T', checklistMode: true, checklistItems: items }),
      buildChecklistRecord(items),
    )
    expect(payload.content).toBe('')
    expect(payload.checklistItems).toEqual({ a: true, b: false })
  })
})

describe('buildUpdatePayload', () => {
  it('incluye isPinned y el recordatorio (RF-13, RF-17)', () => {
    const payload = buildUpdatePayload(
      values({ title: 'T', content: 'c', isPinned: true, rememberAt: '2026-02-03T08:00' }),
      null,
    )
    expect(payload.isPinned).toBe(true)
    expect(payload.rememberAt).toBe('2026-02-03T08:00')
  })
})
