import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from '../../features/auth/context/useAuth'
import { resolveHomePath } from '../routing'

export function PublicOnly({ children }: { children: ReactElement }) {
  const { status, user } = useAuth()

  if (status === 'authenticated' && user) {
    return <Navigate to={resolveHomePath(user.role)} replace />
  }

  return children
}
