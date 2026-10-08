import type { ChangeEvent } from 'react'

export interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  name?: string
  autoComplete?: string
  error?: string
  disabled?: boolean
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  name,
  autoComplete,
  error,
  disabled,
}: TextFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="input w-full"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-error text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
