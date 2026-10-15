import { createContext } from 'react'
import type { AuthUser, LoginCredentials, SessionStatus } from '../model/types'

export interface AuthContextValue {
  status: SessionStatus
  user: AuthUser | null
  signIn: (credentials: LoginCredentials) => Promise<void>
  signOut: () => Promise<void>
  restore: () => void
  applyProfile: (user: AuthUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
