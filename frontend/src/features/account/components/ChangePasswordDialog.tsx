import { useEffect, useState } from 'react'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { PasswordInput } from '../../auth/components/PasswordInput'
import { useAuth } from '../../auth/context/useAuth'
import { changePassword } from '../api/accountApi'
import { accountCopy } from '../model/copy'
import { passwordErrorMessage } from '../model/errors'
import { validatePasswordChange } from '../model/validation'
import type { PasswordChangeField } from '../model/validation'

export interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PasswordChangeField, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    setFieldErrors({})
    setSubmitError(null)
  }, [open])

  if (!open) {
    return null
  }

  async function handleSubmit() {
    const found = validatePasswordChange({ current, next, confirm })
    const errors: Partial<Record<PasswordChangeField, string>> = {}
    for (const entry of found) {
      errors[entry.field] = entry.message
    }
    setFieldErrors(errors)
    setSubmitError(null)
    if (found.length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await changePassword(current, next)
      onClose()
      await signOut()
    } catch (error) {
      setSubmitError(passwordErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={accountCopy.password.title} className="modal modal-open">
      <div className="modal-box flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{accountCopy.password.title}</h2>

        <PasswordInput
          id="password-current"
          label={accountCopy.password.current}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          error={fieldErrors.current}
        />
        <PasswordInput
          id="password-next"
          label={accountCopy.password.next}
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          error={fieldErrors.next}
        />
        <PasswordInput
          id="password-confirm"
          label={accountCopy.password.confirm}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={fieldErrors.confirm}
        />

        {submitError ? <ErrorAlert message={submitError} /> : null}

        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            {accountCopy.password.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {accountCopy.password.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
