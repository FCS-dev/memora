import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { Spinner } from '../../../shared/components/Spinner'
import { TextField } from '../../../shared/components/TextField'
import { useLogin } from '../hooks/useLogin'
import { authCopy } from '../model/copy'
import { loginErrorMessage } from '../model/errors'
import { PasswordInput } from './PasswordInput'

export function LoginForm() {
  const { values, updateField, submitting, error, submit } = useLogin()

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {error ? <ErrorAlert message={loginErrorMessage(error)} /> : null}

      <TextField
        id="login-email"
        label={authCopy.labels.email}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(value) => updateField('email', value)}
        disabled={submitting}
      />

      <PasswordInput
        id="login-password"
        label={authCopy.labels.password}
        autoComplete="current-password"
        value={values.password}
        onChange={(value) => updateField('password', value)}
        disabled={submitting}
      />

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? <Spinner /> : null}
        {authCopy.actions.login}
      </button>
    </form>
  )
}
