import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { Spinner } from '../../../shared/components/Spinner'
import { TextField } from '../../../shared/components/TextField'
import { useRegister } from '../hooks/useRegister'
import { authCopy } from '../model/copy'
import { loginErrorMessage } from '../model/errors'
import { PasswordInput } from './PasswordInput'

export function RegisterForm() {
  const { values, errors, serverError, submitting, updateField, submit } = useRegister()

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {serverError ? <ErrorAlert message={loginErrorMessage(serverError)} /> : null}

      <TextField
        id="register-name"
        label={authCopy.labels.name}
        autoComplete="name"
        value={values.name}
        onChange={(value) => updateField('name', value)}
        error={errors.name}
        placeholder={authCopy.placeholders.name}
        disabled={submitting}
      />

      <TextField
        id="register-email"
        label={authCopy.labels.email}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(value) => updateField('email', value)}
        error={errors.email}
        placeholder={authCopy.placeholders.email}
        disabled={submitting}
      />

      <PasswordInput
        id="register-password"
        label={authCopy.labels.password}
        autoComplete="new-password"
        value={values.password}
        onChange={(value) => updateField('password', value)}
        error={errors.password}
        placeholder={authCopy.placeholders.password}
        disabled={submitting}
      />

      <PasswordInput
        id="register-confirm-password"
        label={authCopy.labels.confirmPassword}
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={(value) => updateField('confirmPassword', value)}
        error={errors.confirmPassword}
        placeholder={authCopy.placeholders.confirmPassword}
        disabled={submitting}
      />

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? <Spinner /> : null}
        {authCopy.actions.register}
      </button>
    </form>
  )
}
