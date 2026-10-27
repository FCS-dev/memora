import { request } from '../../../../shared/lib/http'
import type { AuthUser } from '../../../auth/model/types'
import type { AiConsentAction, NoteInterpretationResponse } from '../model/types'

export function interpretNote(
  text: string,
  zoneId: string | null,
): Promise<NoteInterpretationResponse> {
  return request<NoteInterpretationResponse>('/notes/interpret', {
    method: 'POST',
    body: { text, zoneId },
    auth: true,
  })
}

export function updateAiConsent(
  action: AiConsentAction,
  noticeVersion: string,
): Promise<AuthUser> {
  return request<AuthUser>('/users/me/ai-consent', {
    method: 'PUT',
    body: { action, noticeVersion },
    auth: true,
  })
}
