import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useModalBehavior } from '../hooks/useModalBehavior'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useModalBehavior({ open, containerRef: modalRef, onClose: onCancel })

  if (!open) {
    return null
  }

  return createPortal(
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="modal modal-open"
    >
      <div className="modal-box">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="py-2">{message}</p>
        <div className="modal-action">
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-error" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
