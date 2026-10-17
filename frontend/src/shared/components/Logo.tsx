export interface LogoProps {
  showWordmark?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
}

export function Logo({ showWordmark = true, size = 'md', className }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`${SIZE_CLASSES[size]} shrink-0 text-primary`}
      >
        <rect x="2" y="2" width="28" height="28" rx="7" stroke="currentColor" strokeWidth="2.5" />
        <path
          d="M9 24V11L16 17L23 11V24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-lg font-bold tracking-tight text-base-content">Memora</span>
      ) : null}
    </div>
  )
}
