import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/context/useAuth'
import { accountCopy } from '../model/copy'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { ProfileDialog } from './ProfileDialog'
import { PrivateTagsDialog } from './PrivateTagsDialog'
import { ThemeMenu } from './ThemeMenu'

type DialogKind = 'profile' | 'password' | 'tags' | null

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [open])

  if (!user) {
    return null
  }

  function openDialog(kind: Exclude<DialogKind, null>) {
    setOpen(false)
    setThemeOpen(false)
    setDialog(kind)
  }

  async function handleLogout() {
    setOpen(false)
    setThemeOpen(false)
    setLogoutError(null)
    try {
      await signOut()
    } catch {
      setLogoutError(accountCopy.errors.network)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="btn btn-ghost gap-2"
        aria-label={accountCopy.menu.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="max-w-[10rem] truncate">{user.name}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <ul
          role="menu"
          aria-label={accountCopy.menu.trigger}
          className="menu absolute right-0 z-50 mt-2 w-56 rounded-box bg-base-100 shadow-lg"
        >
          <li>
            <button type="button" role="menuitem" onClick={() => openDialog('profile')}>
              {accountCopy.menu.profile}
            </button>
          </li>
          <li>
            <button type="button" role="menuitem" onClick={() => openDialog('password')}>
              {accountCopy.menu.password}
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              aria-expanded={themeOpen}
              onClick={() => setThemeOpen((value) => !value)}
            >
              {accountCopy.menu.theme}
            </button>
            {themeOpen ? <ThemeMenu /> : null}
          </li>
          {user.role === 'USER' ? (
            <li>
              <button type="button" role="menuitem" onClick={() => openDialog('tags')}>
                {accountCopy.menu.tags}
              </button>
            </li>
          ) : null}
          <li>
            <button type="button" role="menuitem" onClick={() => void handleLogout()}>
              {accountCopy.menu.logout}
            </button>
          </li>
        </ul>
      ) : null}

      {logoutError ? (
        <p role="alert" className="absolute right-0 z-50 mt-2 w-56 rounded-box bg-error/10 p-2 text-sm text-error">
          {logoutError}
        </p>
      ) : null}

      <ProfileDialog open={dialog === 'profile'} onClose={() => setDialog(null)} />
      <ChangePasswordDialog open={dialog === 'password'} onClose={() => setDialog(null)} />
      <PrivateTagsDialog open={dialog === 'tags'} onClose={() => setDialog(null)} />
    </div>
  )
}
