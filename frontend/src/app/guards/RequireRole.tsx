import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from '../../features/auth/context/useAuth'
import type { Role } from '../../features/auth/model/types'
import { canAccess, resolveHomePath } from '../routing'

export function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!canAccess(user.role, role)) {
    return <Navigate to={resolveHomePath(user.role)} replace />
  }

  return children
}
