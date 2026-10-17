export interface AvatarProps {
  name: string
  color?: string
  sizeClass?: string
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function textColor(backgroundColor: string): string {
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150 ? '#151922' : '#ffffff'
}

export function Avatar({ name, color, sizeClass = 'h-8 w-8 text-sm' }: AvatarProps) {
  const label = initial(name)
  if (!color) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-content ${sizeClass}`}
        aria-hidden="true"
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass}`}
      style={{ backgroundColor: color, color: textColor(color) }}
      aria-hidden="true"
    >
      {label}
    </span>
  )
}
