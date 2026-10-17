import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { Spinner } from '../../../shared/components/Spinner'
import { TextField } from '../../../shared/components/TextField'
import { getMe } from '../../auth/api/authApi'
import { useAuth } from '../../auth/context/useAuth'
import { updateProfile } from '../api/accountApi'
import { accountCopy } from '../model/copy'
import { AVATAR_COLORS, DEFAULT_AVATAR_COLOR } from '../model/avatarColors'
import { profileErrorMessage } from '../model/errors'
import { validateProfileName } from '../model/validation'
import { useModalBehavior } from '../../../shared/hooks/useModalBehavior'

export interface ProfileDialogProps {
  open: boolean
  onClose: () => void
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { applyProfile } = useAuth()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarColor, setAvatarColor] = useState(DEFAULT_AVATAR_COLOR)
  const [nameError, setNameError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useModalBehavior({ open, containerRef: modalRef, onClose })

  const load = useCallback(async () => {
    setStatus('loading')
    setLoadError('')
    try {
      const profile = await getMe()
      setName(profile.name)
      setEmail(profile.email)
      setAvatarColor(profile.avatarColor ?? DEFAULT_AVATAR_COLOR)
      setStatus('ready')
    } catch (error) {
      setLoadError(profileErrorMessage(error))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    setNameError(null)
    setSaveError(null)
    void load()
  }, [open, load])

  if (!open) {
    return null
  }

  async function handleSave() {
    const error = validateProfileName(name)
    setNameError(error)
    if (error) {
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateProfile({ name: name.trim(), avatarColor })
      applyProfile(updated)
      onClose()
    } catch (saveFailure) {
      setSaveError(profileErrorMessage(saveFailure))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={accountCopy.profile.title}
      className="modal modal-open"
    >
      <div className="modal-box flex max-w-sm flex-col gap-4">
        <h2 className="text-lg font-semibold">{accountCopy.profile.title}</h2>

        {status === 'loading' ? <Spinner /> : null}

        {status === 'error' ? (
          <>
            <ErrorAlert message={loadError} />
            <div className="modal-action">
              <button type="button" className="btn" onClick={onClose}>
                {accountCopy.profile.cancel}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void load()}>
                {accountCopy.profile.retry}
              </button>
            </div>
          </>
        ) : null}

        {status === 'ready' ? (
          <>
            <TextField
              id="profile-name"
              label={accountCopy.profile.name}
              value={name}
              onChange={setName}
              error={nameError ?? undefined}
            />
            <TextField
              id="profile-email"
              label={accountCopy.profile.email}
              value={email}
              onChange={() => {}}
              disabled
            />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{accountCopy.profile.avatarColor}</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={accountCopy.profile.avatarColor}>
                {AVATAR_COLORS.map((color) => {
                  const selected = avatarColor === color.hex
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={color.hex}
                      className={`h-8 w-8 rounded-full transition ${selected ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => setAvatarColor(color.hex)}
                    />
                  )
                })}
              </div>
            </div>
            {saveError ? <ErrorAlert message={saveError} /> : null}
            <div className="modal-action">
              <button type="button" className="btn" onClick={onClose}>
                {accountCopy.profile.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {accountCopy.profile.save}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
