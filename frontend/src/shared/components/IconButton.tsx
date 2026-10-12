import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ label, children, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`btn btn-ghost btn-sm ${className ?? ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}
