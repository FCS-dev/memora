import { accountCopy } from './copy'

export const PROFILE_NAME_MIN = 3
export const PROFILE_NAME_MAX = 150
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 20

export function validateProfileName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return accountCopy.errors.required
  }
  if (trimmed.length < PROFILE_NAME_MIN) {
    return accountCopy.errors.nameTooShort
  }
  if (trimmed.length > PROFILE_NAME_MAX) {
    return accountCopy.errors.nameTooLong
  }
  return null
}

export interface PasswordChangeValues {
  current: string
  next: string
  confirm: string
}

export type PasswordChangeField = keyof PasswordChangeValues

export interface PasswordChangeError {
  field: PasswordChangeField
  message: string
}

export function validatePasswordChange(values: PasswordChangeValues): PasswordChangeError[] {
  const errors: PasswordChangeError[] = []

  if (values.current === '') {
    errors.push({ field: 'current', message: accountCopy.errors.required })
  }

  if (values.next === '') {
    errors.push({ field: 'next', message: accountCopy.errors.required })
  } else if (values.next.length < PASSWORD_MIN || values.next.length > PASSWORD_MAX) {
    errors.push({ field: 'next', message: accountCopy.errors.passwordLength })
  }

  if (values.confirm === '') {
    errors.push({ field: 'confirm', message: accountCopy.errors.required })
  } else if (values.confirm !== values.next) {
    errors.push({ field: 'confirm', message: accountCopy.errors.passwordMismatch })
  }

  return errors
}
