import { authCopy } from '../../auth/model/copy'
import { HomeHeader } from '../components/HomeHeader'

export function UserHomePage() {
  return (
    <div className="min-h-dvh">
      <HomeHeader title={authCopy.titles.userHome} />
    </div>
  )
}
