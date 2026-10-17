export type Role = 'USER' | 'ADMIN'

export interface AuthUser {
  uuidUser: string
  email: string
  name: string
  role: Role
  avatarColor: string | null
}

export interface Session {
  accessToken: string
  user: AuthUser
}

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated' | 'restoreError'

export interface RegisterValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export type RegisterField = keyof RegisterValues

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export type LoginErrorKind = 'generic' | 'inactive' | 'server'
