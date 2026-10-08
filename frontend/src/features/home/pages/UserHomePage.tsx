import { useAuth } from '../../auth/context/useAuth'
import { authCopy } from '../../auth/model/copy'
import { HomeHeader } from '../components/HomeHeader'

export function UserHomePage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-dvh">
      <HomeHeader
        title={authCopy.titles.userHome}
        userName={user?.name ?? ''}
        onLogout={() => void signOut()}
      />
    </div>
  )
}
