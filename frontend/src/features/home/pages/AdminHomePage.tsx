import { GlobalTagsPanel } from '../../admin/components/GlobalTagsPanel'
import { authCopy } from '../../auth/model/copy'
import { HomeHeader } from '../components/HomeHeader'

export function AdminHomePage() {
  return (
    <div className="min-h-dvh">
      <HomeHeader title={authCopy.titles.adminHome} />
      <main>
        <GlobalTagsPanel />
      </main>
    </div>
  )
}
