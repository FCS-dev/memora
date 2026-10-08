import type { Role, SessionStatus } from '../features/auth/model/types'

export type HomePath = '/home' | '/admin'

export function resolveHomePath(role: Role): HomePath {
  return role === 'ADMIN' ? '/admin' : '/home'
}

export function canAccess(role: Role, required: Role): boolean {
  return role === required
}

export function resolveInitialRoute(status: SessionStatus, role: Role | null): string {
  if (status === 'authenticated' && role) {
    return resolveHomePath(role)
  }
  return '/login'
}
