import { authCopy } from './copy'
import type { LoginErrorKind } from './types'

export function mapLoginError(status: number): LoginErrorKind | null {
  if (status === 401) {
    return 'generic'
  }
  if (status === 403) {
    return 'inactive'
  }
  if (status >= 500) {
    return 'server'
  }
  return null
}

export function loginErrorMessage(kind: LoginErrorKind): string {
  switch (kind) {
    case 'inactive':
      return authCopy.errors.accountInactive
    case 'server':
      return authCopy.errors.serverError
    default:
      return authCopy.errors.loginGeneric
  }
}
