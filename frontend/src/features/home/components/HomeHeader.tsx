import { UserMenu } from '../../account/components/UserMenu'

export interface HomeHeaderProps {
  title: string
}

export function HomeHeader({ title }: HomeHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 p-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <UserMenu />
    </header>
  )
}
