import { HttpError, NetworkError } from '../../../shared/lib/http'
import { adminTagsCopy } from './copy'

export function isDuplicateGlobalTagError(error: unknown): boolean {
  return error instanceof HttpError && error.status === 409
}

export type AdminTagsErrorKind = 'load' | 'save' | 'delete'

export function mapAdminTagsError(error: unknown, kind: AdminTagsErrorKind): string {
  if (error instanceof NetworkError) {
    return adminTagsCopy.errors.generic
  }
  if (error instanceof HttpError) {
    if (isDuplicateGlobalTagError(error)) {
      return adminTagsCopy.errors.duplicate
    }
    if (error.status === 400) {
      return adminTagsCopy.errors.invalid
    }
    if (error.status >= 500) {
      return adminTagsCopy.errors.generic
    }
    return adminTagsCopy.errors[kind]
  }
  return adminTagsCopy.errors.generic
}
