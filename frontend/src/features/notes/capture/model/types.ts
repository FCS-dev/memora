import type { AiConsent } from '../../../auth/model/types'

export type AiWarningCode =
  | 'TITLE_TRUNCATED'
  | 'CONTENT_TRUNCATED'
  | 'CHECKLIST_DISCARDED'
  | 'TAGS_DISCARDED'
  | 'REMINDER_AMBIGUOUS'
  | 'REMINDER_ZONE_INVALID'
  | 'MULTIPLE_INTENTS'
  | 'TAGS_UNAVAILABLE'
  | 'PROVIDER_ERROR'
  | 'OUT_OF_SCOPE'

export interface DraftChecklistItem {
  text: string
  checked: boolean
}

export interface NoteDraft {
  title: string
  content: string
  checklistMode: boolean
  checklistItems: DraftChecklistItem[]
  rememberAt: string | null
  tagIds: number[]
}

export interface NoteInterpretationResponse {
  draft: NoteDraft | null
  warnings: AiWarningCode[]
}

export type AiConsentAction = Exclude<AiConsent, 'NOT_SET'>
