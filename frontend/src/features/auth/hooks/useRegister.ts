import { useCallback, useState } from 'react'
import * as authApi from '../api/authApi'
import { HttpError } from '../../../shared/lib/http'
import { useAuth } from '../context/useAuth'
import { authCopy } from '../model/copy'
import { mapLoginError } from '../model/errors'
import { buildRegisterPayload, normalizeEmail, validateRegister } from '../model/validation'
import type { LoginErrorKind, RegisterField, RegisterValues } from '../model/types'

const INITIAL_VALUES: RegisterValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export function useRegister() {
  const { signIn } = useAuth()
  const [values, setValues] = useState<RegisterValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<Partial<Record<RegisterField, string>>>({})
  const [serverError, setServerError] = useState<LoginErrorKind | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const updateField = useCallback((field: RegisterField, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }))
  }, [])

  const submit = useCallback(async () => {
    const validation = validateRegister(values)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      setServerError(null)
      return
    }

    setErrors({})
    setServerError(null)
    setSubmitting(true)
    try {
      await authApi.register(buildRegisterPayload(values))
      await signIn({ email: normalizeEmail(values.email), password: values.password })
    } catch (caught) {
      if (caught instanceof HttpError) {
        if (caught.status === 400) {
          setErrors({ email: authCopy.errors.emailTaken })
        } else {
          setServerError(mapLoginError(caught.status) ?? 'server')
        }
      } else {
        setServerError('server')
      }
    } finally {
      setSubmitting(false)
    }
  }, [signIn, values])

  return { values, errors, serverError, submitting, updateField, submit }
}
