import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth'
import { authCopy } from '../features/auth/model/copy'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { AdminHomePage } from '../features/home/pages/AdminHomePage'
import { UserHomePage } from '../features/home/pages/UserHomePage'
import { ErrorAlert } from '../shared/components/ErrorAlert'
import { Spinner } from '../shared/components/Spinner'
import { PublicOnly } from './guards/PublicOnly'
import { RequireAuth } from './guards/RequireAuth'
import { RequireRole } from './guards/RequireRole'
import { resolveInitialRoute } from './routing'

function FullPageSpinner() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <Spinner />
    </main>
  )
}

function RestoreError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 p-4">
      <ErrorAlert message={authCopy.errors.serverError} />
      <button type="button" className="btn" onClick={onRetry}>
        {authCopy.actions.retry}
      </button>
    </main>
  )
}

function DefaultLanding() {
  const { status, user } = useAuth()
  return <Navigate to={resolveInitialRoute(status, user?.role ?? null)} replace />
}

export function App() {
  const { status, restore } = useAuth()

  if (status === 'loading') {
    return <FullPageSpinner />
  }

  if (status === 'restoreError') {
    return <RestoreError onRetry={restore} />
  }

  return (
    <Routes>
      <Route path="/" element={<DefaultLanding />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <RequireRole role="USER">
              <UserHomePage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole role="ADMIN">
              <AdminHomePage />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
