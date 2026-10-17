import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../auth/context/useAuth'
import { accountCopy } from '../model/copy'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { ProfileDialog } from './ProfileDialog'
import { PrivateTagsDialog } from './PrivateTagsDialog'
import { ThemeMenu } from './ThemeMenu'
import { Avatar } from '../../../shared/components/Avatar'

type DialogKind = 'profile' | 'password' | 'tags' | null

export function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [menuStyle, setMenuStyle] = useState<{ top: number; right: number }>({ top: 0, right: 0 })

  const computePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuStyle({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    computePosition()
  }, [open])

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
      const target = event.target as Node
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    const onResize = () => computePosition()
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  if (!user) {
    return null
  }

  function openDialog(kind: Exclude<DialogKind, null>) {
    buttonRef.current?.focus()
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

  const menu = (
    <ul
      ref={menuRef}
      role="menu"
      aria-label={accountCopy.menu.trigger}
      className="menu fixed z-[100] w-56 rounded-box border border-base-300 bg-base-200 p-2 shadow-lg"
      style={{ top: menuStyle.top, right: menuStyle.right }}
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
      <li className="mt-1 border-t border-base-300 pt-1">
        <button type="button" role="menuitem" onClick={() => void handleLogout()}>
          {accountCopy.menu.logout}
        </button>
      </li>
    </ul>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="flex items-center gap-2 rounded-full border border-base-300 bg-base-200 py-1 pl-1 pr-3 transition hover:bg-base-300"
        aria-label={accountCopy.menu.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={user.name} color={user.avatarColor ?? undefined} sizeClass="h-7 w-7 text-xs" />
        <span className="max-w-[8rem] truncate text-sm font-medium">{user.name}</span>
        <span aria-hidden="true" className="text-xs text-neutral">
          ▾
        </span>
      </button>

      {open ? createPortal(menu, document.body) : null}

      {logoutError ? (
        <p
          role="alert"
          className="fixed right-4 top-16 z-[100] w-56 rounded-box border border-error/20 bg-error/10 p-2 text-sm text-error"
        >
          {logoutError}
        </p>
      ) : null}

      <ProfileDialog open={dialog === 'profile'} onClose={() => setDialog(null)} />
      <ChangePasswordDialog open={dialog === 'password'} onClose={() => setDialog(null)} />
      <PrivateTagsDialog open={dialog === 'tags'} onClose={() => setDialog(null)} />
    </>
  )
}
