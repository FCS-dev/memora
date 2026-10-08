import { authCopy } from './copy'
import type { RegisterField, RegisterPayload, RegisterValues } from './types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_NAME_LENGTH = 3
const MAX_NAME_LENGTH = 150
const MIN_EMAIL_LENGTH = 5
const MAX_EMAIL_LENGTH = 150
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 20

export function normalizeEmail(raw: string): string {
  return raw.trim()
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(raw))
}

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH
}

export function isValidName(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= MIN_NAME_LENGTH && trimmed.length <= MAX_NAME_LENGTH
}

export function isValidEmailLength(value: string): boolean {
  const length = normalizeEmail(value).length
  return length >= MIN_EMAIL_LENGTH && length <= MAX_EMAIL_LENGTH
}

export function validateRegister(values: RegisterValues): Partial<Record<RegisterField, string>> {
  const errors: Partial<Record<RegisterField, string>> = {}

  const nameLength = values.name.trim().length
  if (nameLength === 0) {
    errors.name = authCopy.errors.required
  } else if (nameLength < MIN_NAME_LENGTH) {
    errors.name = authCopy.errors.nameTooShort
  } else if (nameLength > MAX_NAME_LENGTH) {
    errors.name = authCopy.errors.nameTooLong
  }

  const emailLength = normalizeEmail(values.email).length
  if (emailLength === 0) {
    errors.email = authCopy.errors.required
  } else if (!isValidEmail(values.email)) {
    errors.email = authCopy.errors.emailInvalid
  } else if (emailLength < MIN_EMAIL_LENGTH) {
    errors.email = authCopy.errors.emailTooShort
  } else if (emailLength > MAX_EMAIL_LENGTH) {
    errors.email = authCopy.errors.emailTooLong
  }

  if (values.password === '') {
    errors.password = authCopy.errors.required
  } else if (!isValidPassword(values.password)) {
    errors.password = authCopy.errors.passwordLength
  }

  if (values.confirmPassword === '') {
    errors.confirmPassword = authCopy.errors.required
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = authCopy.errors.passwordMismatch
  }

  return errors
}

export function buildRegisterPayload(values: RegisterValues): RegisterPayload {
  return {
    name: values.name.trim(),
    email: normalizeEmail(values.email),
    password: values.password,
  }
}
