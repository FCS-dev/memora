import { authCopy } from '../../auth/model/copy'

export interface HomeHeaderProps {
  title: string
  userName: string
  onLogout: () => void
}

export function HomeHeader({ title, userName, onLogout }: HomeHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 p-4">
      <div className="flex flex-col">
        <span className="text-sm text-base-content/70">{userName}</span>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <button type="button" className="btn btn-outline" onClick={onLogout}>
        {authCopy.actions.logout}
      </button>
    </header>
  )
}
