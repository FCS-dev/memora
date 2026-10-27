import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../../auth/context/useAuth'
import type { AiConsent } from '../../../auth/model/types'
import type { CreateNotePayload, Tag, CreateTagResult, UpdateNotePayload } from '../../model/types'
import { countCodePoints } from '../../model/validation'
import { NoteEditor } from '../../components/NoteEditor'
import { interpretNote, updateAiConsent } from '../api/captureApi'
import { AiConsentDialog } from './AiConsentDialog'
import { CaptureSheet } from './CaptureSheet'
import { captureCopy } from '../model/copy'
import {
  isConsentRequired,
  isOutOfScope,
  isQuotaExceeded,
  isTagsUnavailable,
  mapCaptureError,
} from '../model/errors'
import type { AiWarningCode, NoteDraft } from '../model/types'

export interface CaptureFlowProps {
  open: boolean
  tags: Tag[]
  tagsStatus: 'loading' | 'ready' | 'error'
  onClose: () => void
  onManual: (text: string) => void
  onCreateTag: (name: string) => Promise<CreateTagResult>
  onSave: (payload: CreateNotePayload | UpdateNotePayload) => Promise<void>
}

type CaptureStatus = 'editing' | 'interpreting' | 'review'

function currentZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

export function CaptureFlow({
  open,
  tags,
  tagsStatus,
  onClose,
  onManual,
  onCreateTag,
  onSave,
}: CaptureFlowProps) {
  const { user, applyProfile } = useAuth()
  const [text, setText] = useState('')
  const [status, setStatus] = useState<CaptureStatus>('editing')
  const [draft, setDraft] = useState<NoteDraft | null>(null)
  const [warnings, setWarnings] = useState<AiWarningCode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [manualDirect, setManualDirect] = useState(false)
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentBusy, setConsentBusy] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)
  const requestId = useRef(0)
  const wasOpen = useRef(false)

  const aiEnabled = user?.aiEnabled ?? false
  const aiConsent: AiConsent = user?.aiConsent ?? 'NOT_SET'
  const aiConsentRequired = user?.aiConsentRequired ?? true
  const noticeVersion = user?.aiConsentNoticeVersion ?? '1'

  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }
    if (wasOpen.current) {
      return
    }
    wasOpen.current = true
    requestId.current += 1
    setText('')
    setStatus('editing')
    setDraft(null)
    setWarnings([])
    setError(null)
    setConsentOpen(false)
    setConsentError(null)
    setManualDirect(
      !aiEnabled
        || aiConsent === 'DENIED'
        || aiConsent === 'REVOKED'
        || tagsStatus === 'error',
    )
    if (tagsStatus === 'error') {
      setWarnings(['TAGS_UNAVAILABLE'])
    }
  }, [open, aiEnabled, aiConsent, tagsStatus])

  useEffect(() => {
    if (open && tagsStatus === 'error') {
      setManualDirect(true)
      setWarnings((current) =>
        current.includes('TAGS_UNAVAILABLE') ? current : [...current, 'TAGS_UNAVAILABLE'],
      )
    }
  }, [open, tagsStatus])

  if (!open) {
    return null
  }

  async function interpret() {
    if (text.trim() === '') {
      setError(captureCopy.empty)
      return
    }
    if (countCodePoints(text) > 2500) {
      setError(captureCopy.tooLong)
      return
    }

    const id = ++requestId.current
    setStatus('interpreting')
    setError(null)
    try {
      const response = await interpretNote(text.trim(), currentZone())
      if (id !== requestId.current) {
        return
      }
      if (response.draft === null) {
        setWarnings(response.warnings)
        setManualDirect(true)
        setStatus('editing')
        return
      }
      setDraft(response.draft)
      setWarnings(response.warnings)
      setStatus('review')
    } catch (failure) {
      if (id !== requestId.current) {
        return
      }
      if (isConsentRequired(failure)) {
        setStatus('editing')
        setConsentOpen(true)
        return
      }
      if (isOutOfScope(failure)) {
        setWarnings(['OUT_OF_SCOPE'])
        setError(mapCaptureError(failure))
        setManualDirect(true)
        setStatus('editing')
        return
      }
      setWarnings((current) => [
        ...current,
        isTagsUnavailable(failure) ? 'TAGS_UNAVAILABLE' : 'PROVIDER_ERROR',
      ])
      if (isQuotaExceeded(failure)) {
        setError(captureCopy.quota)
      } else {
        setError(mapCaptureError(failure))
      }
      setManualDirect(true)
      setStatus('editing')
    }
  }

  function handleReview() {
    if (manualDirect) {
      return
    }
    if (aiConsentRequired) {
      setConsentOpen(true)
      return
    }
    void interpret()
  }

  async function handleAcceptConsent() {
    setConsentBusy(true)
    setConsentError(null)
    try {
      const updated = await updateAiConsent('GRANTED', noticeVersion)
      applyProfile(updated)
      setConsentOpen(false)
      void interpret()
    } catch (failure) {
      setConsentError(mapCaptureError(failure))
    } finally {
      setConsentBusy(false)
    }
  }

  async function handleRejectConsent() {
    setConsentBusy(true)
    setConsentError(null)
    try {
      const updated = await updateAiConsent('DENIED', noticeVersion)
      applyProfile(updated)
      setConsentOpen(false)
      setManualDirect(true)
    } catch (failure) {
      setConsentError(mapCaptureError(failure))
    } finally {
      setConsentBusy(false)
    }
  }

  function handleCloseConsent() {
    setConsentOpen(false)
    setManualDirect(true)
  }

  function cancelInterpretation() {
    requestId.current += 1
    setStatus('editing')
    setError(null)
  }

  function cancelReview() {
    setDraft(null)
    setWarnings([])
    setStatus('editing')
  }

  const showEditor = manualDirect || status === 'review'
  const editor = (
    <NoteEditor
      key={status === 'review' ? 'review' : 'manual'}
      note={null}
      tags={tags}
      initialDraft={status === 'review' ? (draft ?? undefined) : undefined}
      initialText={manualDirect ? text : undefined}
      warnings={warnings}
      originalText={status === 'review' ? text : undefined}
      onSave={onSave}
      onCreateTag={onCreateTag}
      onCancel={status === 'review' ? cancelReview : onClose}
    />
  )

  return createPortal(
    <>
      {showEditor ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-base-100">
          {error ? (
            <div role="alert" className="mx-auto mt-4 w-full max-w-2xl px-4 text-sm text-error">
              {error}
            </div>
          ) : null}
          {editor}
        </div>
      ) : (
        <CaptureSheet
          text={text}
          status={status === 'interpreting' ? 'interpreting' : 'editing'}
          error={error}
          canReview={
            text.trim() !== ''
            && countCodePoints(text) <= 2500
            && status === 'editing'
            && tagsStatus !== 'loading'
          }
          onChange={setText}
          onReview={handleReview}
          onManual={() => onManual(text)}
          onCancel={status === 'interpreting' ? cancelInterpretation : onClose}
        />
      )}
      <AiConsentDialog
        open={consentOpen}
        noticeVersion={noticeVersion}
        busy={consentBusy}
        error={consentError}
        onAccept={() => void handleAcceptConsent()}
        onReject={() => void handleRejectConsent()}
        onClose={handleCloseConsent}
      />
    </>,
    document.body,
  )
}
