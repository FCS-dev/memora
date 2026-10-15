import { describe, expect, it } from 'vitest'
import { accountCopy } from './copy'
import { validatePasswordChange, validateProfileName } from './validation'

describe('validateProfileName', () => {
  it('rechaza el nombre vacío o solo espacios (RF-10)', () => {
    expect(validateProfileName('')).toBe(accountCopy.errors.required)
    expect(validateProfileName('   ')).toBe(accountCopy.errors.required)
  })

  it('rechaza nombres de menos de 3 y más de 150 (RF-9, RF-10)', () => {
    expect(validateProfileName('ab')).toBe(accountCopy.errors.nameTooShort)
    expect(validateProfileName('a'.repeat(151))).toBe(accountCopy.errors.nameTooLong)
  })

  it('acepta 3 y 150 caracteres y recorta los extremos (RF-9)', () => {
    expect(validateProfileName('abc')).toBeNull()
    expect(validateProfileName('a'.repeat(150))).toBeNull()
    expect(validateProfileName('  Ana  ')).toBeNull()
  })
})

describe('validatePasswordChange', () => {
  it('exige los tres campos (RF-14)', () => {
    const errors = validatePasswordChange({ current: '', next: '', confirm: '' })
    expect(errors.map((e) => e.field)).toEqual(['current', 'next', 'confirm'])
  })

  it('valida la longitud de la nueva contraseña 8-20 (RF-14)', () => {
    expect(validatePasswordChange({ current: 'actual8', next: '1234567', confirm: '1234567' })).toEqual([
      { field: 'next', message: accountCopy.errors.passwordLength },
    ])
    expect(
      validatePasswordChange({ current: 'actual8', next: 'a'.repeat(21), confirm: 'a'.repeat(21) }),
    ).toEqual([{ field: 'next', message: accountCopy.errors.passwordLength }])
  })

  it('exige que la confirmación coincida (RF-14)', () => {
    expect(
      validatePasswordChange({ current: 'actual8', next: 'nueva123', confirm: 'distinta' }),
    ).toEqual([{ field: 'confirm', message: accountCopy.errors.passwordMismatch }])
  })

  it('acepta una nueva contraseña igual a la actual (RF-14)', () => {
    expect(
      validatePasswordChange({ current: 'misma123', next: 'misma123', confirm: 'misma123' }),
    ).toEqual([])
  })

  it('no reporta errores cuando todo es válido (RF-12)', () => {
    expect(
      validatePasswordChange({ current: 'actual8', next: 'nueva123', confirm: 'nueva123' }),
    ).toEqual([])
  })
})
