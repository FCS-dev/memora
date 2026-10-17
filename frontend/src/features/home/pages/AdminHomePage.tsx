import { GlobalTagsPanel } from '../../admin/components/GlobalTagsPanel'
import { HomeHeader } from '../components/HomeHeader'

export function AdminHomePage() {
  return (
    <div className="min-h-dvh">
      <HomeHeader />
      <main className="p-4">
        <GlobalTagsPanel />
      </main>
    </div>
  )
}
