import { HttpError, NetworkError } from '../../../shared/lib/http'
import { accountCopy } from './copy'

export function profileErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return accountCopy.errors.network
  }
  if (error instanceof HttpError) {
    if (error.status === 400) {
      return accountCopy.errors.invalidName
    }
    if (error.status === 401) {
      return accountCopy.errors.session
    }
    if (error.status === 403) {
      return accountCopy.errors.accountInactive
    }
  }
  return accountCopy.errors.server
}

export function passwordErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return accountCopy.errors.network
  }
  if (error instanceof HttpError) {
    if (error.status === 400) {
      return accountCopy.errors.invalidPassword
    }
    if (error.status === 401) {
      return accountCopy.errors.currentPassword
    }
    if (error.status === 403) {
      return accountCopy.errors.accountInactive
    }
  }
  return accountCopy.errors.server
}
