import { describe, expect, it } from 'vitest'
import {
  buildRegisterPayload,
  isValidEmail,
  isValidEmailLength,
  isValidName,
  isValidPassword,
  normalizeEmail,
  validateRegister,
} from './validation'
import { authCopy } from './copy'

describe('normalizeEmail', () => {
  it('quita espacios externos y conserva mayúsculas', () => {
    expect(normalizeEmail('  User@Example.com ')).toBe('User@Example.com')
  })
})

describe('isValidEmail', () => {
  it('acepta direcciones con parte local, arroba y dominio con punto', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@sub.example.co')).toBe(true)
  })

  it('rechaza direcciones sin arroba, sin punto en el dominio o con espacios', () => {
    expect(isValidEmail('userexample.com')).toBe(false)
    expect(isValidEmail('user@example')).toBe(false)
    expect(isValidEmail('user@example.')).toBe(false)
    expect(isValidEmail('user @example.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('acepta longitudes de 8 y 20 caracteres', () => {
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('12345678901234567890')).toBe(true)
  })

  it('rechaza longitudes de 7 y 21 caracteres', () => {
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('123456789012345678901')).toBe(false)
  })
})

describe('isValidName', () => {
  it('acepta nombres de 3 a 150 caracteres', () => {
    expect(isValidName('Ana')).toBe(true)
    expect(isValidName('abc')).toBe(true)
    expect(isValidName('a'.repeat(150))).toBe(true)
  })

  it('rechaza nombres vacíos, solo con espacios, menores a 3 o mayores a 150 caracteres', () => {
    expect(isValidName('')).toBe(false)
    expect(isValidName('   ')).toBe(false)
    expect(isValidName('ab')).toBe(false)
    expect(isValidName('a'.repeat(151))).toBe(false)
  })
})

describe('isValidEmailLength', () => {
  it('acepta longitudes de 5 a 150 caracteres y rechaza las fuera de rango', () => {
    expect(isValidEmailLength('a@b.c')).toBe(true)
    expect(isValidEmailLength('a'.repeat(145) + '@b.co')).toBe(true)
    expect(isValidEmailLength('a@bc')).toBe(false)
    expect(isValidEmailLength('a'.repeat(146) + '@b.co')).toBe(false)
  })
})

describe('validateRegister', () => {
  const valid = {
    name: 'Ana',
    email: 'ana@example.com',
    password: '12345678',
    confirmPassword: '12345678',
  }

  it('no reporta errores con datos válidos', () => {
    expect(validateRegister(valid)).toEqual({})
  })

  it('reporta campos obligatorios vacíos', () => {
    const errors = validateRegister({
      name: '   ',
      email: '',
      password: '',
      confirmPassword: '',
    })
    expect(errors.name).toBe(authCopy.errors.required)
    expect(errors.email).toBe(authCopy.errors.required)
    expect(errors.password).toBe(authCopy.errors.required)
    expect(errors.confirmPassword).toBe(authCopy.errors.required)
  })

  it('reporta email inválido y email demasiado largo', () => {
    expect(validateRegister({ ...valid, email: 'no-es-email' }).email).toBe(
      authCopy.errors.emailInvalid,
    )
    expect(validateRegister({ ...valid, email: 'a'.repeat(146) + '@b.co' }).email).toBe(
      authCopy.errors.emailTooLong,
    )
  })

  it('reporta nombre demasiado corto y demasiado largo', () => {
    expect(validateRegister({ ...valid, name: 'ab' }).name).toBe(authCopy.errors.nameTooShort)
    expect(validateRegister({ ...valid, name: 'a'.repeat(151) }).name).toBe(
      authCopy.errors.nameTooLong,
    )
  })

  it('reporta contraseña fuera de 8–20 y confirmación distinta', () => {
    expect(validateRegister({ ...valid, password: '1234567' }).password).toBe(
      authCopy.errors.passwordLength,
    )
    expect(validateRegister({ ...valid, confirmPassword: 'otra1234' }).confirmPassword).toBe(
      authCopy.errors.passwordMismatch,
    )
  })
})

describe('buildRegisterPayload', () => {
  it('normaliza el email y recorta el nombre', () => {
    expect(
      buildRegisterPayload({
        name: '  Ana  ',
        email: '  ana@example.com ',
        password: '12345678',
        confirmPassword: '12345678',
      }),
    ).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: '12345678',
    })
  })
})
