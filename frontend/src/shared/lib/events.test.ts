import { describe, expect, it, vi } from 'vitest'
import { emitTagsChanged, subscribeTagsChanged } from './events'

describe('events · tags-changed', () => {
  it('entrega el detalle emitted al suscriptor (RF-13)', () => {
    const handler = vi.fn()
    const unsubscribe = subscribeTagsChanged(handler)

    emitTagsChanged({ merged: [{ fromId: 3, toId: 9 }], deleted: [3] })

    expect(handler).toHaveBeenCalledWith({ merged: [{ fromId: 3, toId: 9 }], deleted: [3] })
    unsubscribe()
  })

  it('entrega un detalle vacío cuando no se especifica (RF-13)', () => {
    const handler = vi.fn()
    const unsubscribe = subscribeTagsChanged(handler)

    emitTagsChanged()

    expect(handler).toHaveBeenCalledWith({})
    unsubscribe()
  })

  it('deja de escuchar tras el unsubscribe', () => {
    const handler = vi.fn()
    const unsubscribe = subscribeTagsChanged(handler)
    unsubscribe()

    emitTagsChanged({ deleted: [1] })

    expect(handler).not.toHaveBeenCalled()
  })
})
