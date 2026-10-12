import type { Note, ReorderPayload } from './types'

export type MoveDirection = 'up' | 'down'

export function resolveNeighborUuids(
  ordered: Note[],
  movingUuid: string,
  direction: MoveDirection,
): ReorderPayload | null {
  const index = ordered.findIndex((note) => note.uuidNote === movingUuid)
  if (index === -1) {
    return null
  }

  if (direction === 'up') {
    if (index === 0) {
      return null
    }
    const beforeUuid = index - 2 >= 0 ? ordered[index - 2].uuidNote : ''
    return { beforeUuid, afterUuid: ordered[index - 1].uuidNote }
  }

  if (index === ordered.length - 1) {
    return null
  }
  const afterUuid = index + 2 < ordered.length ? ordered[index + 2].uuidNote : ''
  return { beforeUuid: ordered[index + 1].uuidNote, afterUuid }
}

export function resolveReorderPayloadFromDrop(
  ordered: Note[],
  movingUuid: string,
  targetIndex: number,
): ReorderPayload | null {
  if (!ordered.some((note) => note.uuidNote === movingUuid)) {
    return null
  }
  const remaining = ordered.filter((note) => note.uuidNote !== movingUuid)
  const beforeUuid = targetIndex - 1 >= 0 ? remaining[targetIndex - 1].uuidNote : ''
  const afterUuid = targetIndex < remaining.length ? remaining[targetIndex].uuidNote : ''
  return { beforeUuid, afterUuid }
}

export function applyReorder(notes: Note[], movingUuid: string, payload: ReorderPayload): Note[] {
  const moving = notes.find((note) => note.uuidNote === movingUuid)
  if (!moving) {
    return notes
  }
  const remaining = notes.filter((note) => note.uuidNote !== movingUuid)

  let index = 0
  if (payload.beforeUuid !== '') {
    index = remaining.findIndex((note) => note.uuidNote === payload.beforeUuid) + 1
  } else if (payload.afterUuid !== '') {
    index = remaining.findIndex((note) => note.uuidNote === payload.afterUuid)
  }
  if (index < 0) {
    index = 0
  }

  const result = [...remaining]
  result.splice(index, 0, moving)
  return result
}

