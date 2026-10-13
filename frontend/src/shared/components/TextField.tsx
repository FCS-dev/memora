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
  floating?: boolean
  placeholder?: string
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
  floating = false,
  placeholder,
}: TextFieldProps) {
  const errorId = `${id}-error`

  const input = (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      autoComplete={autoComplete}
      disabled={disabled}
      placeholder={placeholder ?? (floating ? ' ' : undefined)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className="input w-full"
    />
  )

  return (
    <div className="flex flex-col gap-1">
      {floating ? (
        <label className="floating-label">
          <span>{label}</span>
          {input}
        </label>
      ) : (
        <>
          <label className="label" htmlFor={id}>
            {label}
          </label>
          {input}
        </>
      )}
      {error ? (
        <p id={errorId} role="alert" className="text-error text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}
