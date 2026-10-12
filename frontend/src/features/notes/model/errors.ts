import { HttpError, NetworkError } from '../../../shared/lib/http'
import { notesCopy } from './copy'

function detailOf(body: unknown): string {
  const detail = serverDetail(body)
  return detail === null ? '' : detail.toLowerCase()
}

function serverDetail(body: unknown): string | null {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim() !== '') {
      return detail
    }
  }
  return null
}

export function isDuplicateTagError(error: unknown): boolean {
  return (
    error instanceof HttpError &&
    error.status === 400 &&
    detailOf(error.body).includes('tag')
  )
}

export function mapNotesError(error: unknown): string {
  if (error instanceof NetworkError) {
    return notesCopy.errors.generic
  }
  if (error instanceof HttpError) {
    if (error.status === 404) {
      return notesCopy.errors.notFound
    }
    if (isDuplicateTagError(error)) {
      return notesCopy.errors.duplicateTag
    }
    if (error.status === 401 || error.status === 403) {
      return serverDetail(error.body) ?? notesCopy.errors.sessionExpired
    }
    if (error.status >= 500) {
      return notesCopy.errors.generic
    }
    return serverDetail(error.body) ?? notesCopy.errors.generic
  }
  return notesCopy.errors.generic
}
