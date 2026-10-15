import { request } from '../../../shared/lib/http'
import type { CreateTagResult, RenameTagPayload, Tag } from '../model/types'

interface CreateTagResponse {
  id: number
  tagName: string
  global: boolean
  reused: boolean
}

export function listTags(): Promise<Tag[]> {
  return request<Tag[]>('/tags', { auth: true })
}

export async function createTag(tagName: string): Promise<CreateTagResult> {
  const response = await request<CreateTagResponse>('/tags', {
    method: 'POST',
    body: { tagName },
    auth: true,
  })
  return {
    tag: { id: response.id, tagName: response.tagName, global: response.global, noteCount: 0 },
    reused: response.reused,
  }
}

export function renameTag(id: number, tagName: string): Promise<Tag> {
  const payload: RenameTagPayload = { tagName }
  return request<Tag>(`/tags/${id}`, { method: 'PATCH', body: payload, auth: true })
}

export function deleteTag(id: number): Promise<void> {
  return request<void>(`/tags/${id}`, { method: 'DELETE', auth: true })
}
