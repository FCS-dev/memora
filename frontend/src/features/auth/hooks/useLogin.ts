import { useCallback, useState } from 'react'
import { HttpError } from '../../../shared/lib/http'
import { useAuth } from '../context/useAuth'
import { mapLoginError } from '../model/errors'
import { normalizeEmail } from '../model/validation'
import type { LoginCredentials, LoginErrorKind } from '../model/types'

export function useLogin() {
  const { signIn } = useAuth()
  const [values, setValues] = useState<LoginCredentials>({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<LoginErrorKind | null>(null)

  const updateField = useCallback((field: keyof LoginCredentials, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }))
  }, [])

  const submit = useCallback(async () => {
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ email: normalizeEmail(values.email), password: values.password })
    } catch (caught) {
      if (caught instanceof HttpError) {
        setError(mapLoginError(caught.status) ?? 'server')
      } else {
        setError('server')
      }
    } finally {
      setSubmitting(false)
    }
  }, [signIn, values])

  return { values, updateField, submitting, error, submit }
}
