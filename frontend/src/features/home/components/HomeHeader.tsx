import { UserMenu } from '../../account/components/UserMenu'
import { Logo } from '../../../shared/components/Logo'

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-base-300/60 bg-base-200/80 px-4 backdrop-blur">
      <Logo />
      <UserMenu />
    </header>
  )
}
