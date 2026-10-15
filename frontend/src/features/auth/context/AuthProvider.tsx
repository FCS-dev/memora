import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/authApi'
import { NetworkError, setAccessToken, setRefreshHandler, setUnauthorizedHandler } from '../../../shared/lib/http'
import { AuthContext } from './authContext'
import type { AuthUser, LoginCredentials, SessionStatus } from '../model/types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [restoreKey, setRestoreKey] = useState(0)
  const activeRef = useRef(true)

  useEffect(() => {
    setRefreshHandler(() => authApi.refresh())
    setUnauthorizedHandler(() => {
      setAccessToken(null)
      setUser(null)
      setStatus('anonymous')
    })
    return () => {
      setRefreshHandler(null)
      setUnauthorizedHandler(null)
    }
  }, [])

  useEffect(() => {
    activeRef.current = true

    const bootstrap = async () => {
      setStatus('loading')
      try {
        const token = await authApi.refresh()
        setAccessToken(token)
        const me = await authApi.getMe()
        if (!activeRef.current) return
        setUser(me)
        setStatus('authenticated')
      } catch (error) {
        if (!activeRef.current) return
        if (error instanceof NetworkError) {
          setStatus('restoreError')
        } else {
          setAccessToken(null)
          setUser(null)
          setStatus('anonymous')
        }
      }
    }

    void bootstrap()

    return () => {
      activeRef.current = false
    }
  }, [restoreKey])

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    const token = await authApi.login(credentials)
    setAccessToken(token)
    const me = await authApi.getMe()
    setUser(me)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // Un fallo de red conserva la sesión para permitir reintentar (RF-17).
      if (error instanceof NetworkError) {
        throw error
      }
      // Otros errores (p. ej. token inválido) no impiden el cierre de sesión local.
    }
    setAccessToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const restore = useCallback(() => {
    setRestoreKey((key) => key + 1)
  }, [])

  const applyProfile = useCallback((profile: AuthUser) => {
    setUser(profile)
  }, [])

  const value = useMemo(
    () => ({ status, user, signIn, signOut, restore, applyProfile }),
    [status, user, signIn, signOut, restore, applyProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
