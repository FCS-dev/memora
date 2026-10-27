import { useRef, useState } from 'react'
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog'
import { useModalBehavior } from '../../../../shared/hooks/useModalBehavior'
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery'
import { captureCopy } from '../model/copy'
import { countCodePoints } from '../../model/validation'

export interface CaptureSheetProps {
  text: string
  status: 'editing' | 'interpreting'
  error?: string | null
  canReview: boolean
  onChange: (value: string) => void
  onReview: () => void
  onManual: () => void
  onCancel: () => void
}

const MAX = 2500

export function CaptureSheet({
  text,
  status,
  error,
  canReview,
  onChange,
  onReview,
  onManual,
  onCancel,
}: CaptureSheetProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  function requestClose() {
    if (status === 'interpreting') {
      return
    }
    if (text.trim() === '') {
      onCancel()
      return
    }
    setConfirmDiscard(true)
  }

  useModalBehavior({ open: true, containerRef: modalRef, onClose: requestClose })
  const showDictationHint = useMediaQuery('(pointer: coarse), (max-width: 767px)')
  const count = countCodePoints(text)
  const overLimit = count > MAX

  return (
    <div
      ref={modalRef}
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-label={captureCopy.title}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          requestClose()
        }
      }}
    >
      <div className="modal-box flex max-w-xl flex-col gap-4">
        <h2 className="text-lg font-semibold">{captureCopy.title}</h2>
        <textarea
          autoFocus
          aria-label={captureCopy.title}
          className="textarea min-h-40 w-full resize-y"
          placeholder={captureCopy.placeholder}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          disabled={status === 'interpreting'}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={overLimit ? 'text-error' : 'text-neutral'} aria-live="polite">
            {count}/{MAX} {captureCopy.counterSuffix}
          </span>
          {text.trim() === '' ? <span className="text-error">{captureCopy.empty}</span> : null}
          {overLimit ? <span className="text-error">{captureCopy.tooLong}</span> : null}
        </div>
        {showDictationHint ? (
          <p className="text-xs text-neutral">{captureCopy.mobileDictationHint}</p>
        ) : null}
        {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        <p aria-live="polite" className="text-sm text-neutral">
          {status === 'interpreting' ? captureCopy.interpreting : ''}
        </p>
        <div className="modal-action flex-wrap">
          {status === 'interpreting' ? (
            <button type="button" className="btn" onClick={onCancel}>
              {captureCopy.cancel}
            </button>
          ) : (
            <>
              <button type="button" className="btn" onClick={onManual}>
                {captureCopy.manual}
              </button>
              <button type="button" className="btn btn-primary" onClick={onReview} disabled={!canReview}>
                {captureCopy.review}
              </button>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDiscard}
        title={captureCopy.confirmDiscardTitle}
        message={captureCopy.confirmDiscardMessage}
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmDiscard(false)
          onCancel()
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}
