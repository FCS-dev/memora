import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { authCopy } from '../model/copy'

export interface PasswordInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  name?: string
  autoComplete?: string
  error?: string
  disabled?: boolean
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  name,
  autoComplete,
  error,
  disabled,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="input w-full pr-24"
        />
        <button
          type="button"
          className="btn btn-sm btn-ghost absolute right-1 top-1/2 -translate-y-1/2"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-label={visible ? authCopy.labels.hidePassword : authCopy.labels.showPassword}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-error text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
