import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useModalBehavior } from '../../../../shared/hooks/useModalBehavior'
import { captureCopy } from '../model/copy'

export interface AiConsentDialogProps {
  open: boolean
  noticeVersion: string
  busy?: boolean
  error?: string | null
  onAccept: () => void
  onReject: () => void
  onClose: () => void
}

export function AiConsentDialog({
  open,
  noticeVersion,
  busy = false,
  error,
  onAccept,
  onReject,
  onClose,
}: AiConsentDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useModalBehavior({ open, containerRef: modalRef, onClose })

  if (!open) {
    return null
  }

  return createPortal(
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={captureCopy.consent.title}
      className="modal modal-open"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="modal-box flex max-w-md flex-col gap-4">
        <h2 className="text-lg font-semibold">{captureCopy.consent.title}</h2>
        <p className="text-sm text-base-content/80">{captureCopy.consent.body}</p>
        <p className="text-xs text-base-content/60">
          {captureCopy.consent.version}: {noticeVersion}
        </p>
        {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        <div className="modal-action flex-wrap">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {captureCopy.consent.close}
          </button>
          <button type="button" className="btn" onClick={onReject} disabled={busy}>
            {captureCopy.consent.reject}
          </button>
          <button type="button" className="btn btn-primary" onClick={onAccept} disabled={busy}>
            {captureCopy.consent.accept}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
