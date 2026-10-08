import { Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from '../../features/auth/context/useAuth'

export function RequireAuth({ children }: { children: ReactElement }) {
  const { status } = useAuth()

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }

  return children
}
