export interface AvatarColorOption {
  hex: string
  fg: string
}

export const AVATAR_COLORS: AvatarColorOption[] = [
  { hex: '#4F5DFF', fg: '#ffffff' },
  { hex: '#059669', fg: '#ffffff' },
  { hex: '#E11D48', fg: '#ffffff' },
  { hex: '#7C3AED', fg: '#ffffff' },
  { hex: '#0891B2', fg: '#ffffff' },
  { hex: '#B45309', fg: '#ffffff' },
  { hex: '#C026D3', fg: '#ffffff' },
  { hex: '#0D9488', fg: '#ffffff' },
]

export const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0].hex
