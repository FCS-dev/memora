import { request } from '../../../shared/lib/http'
import type { CreateTagResult, Tag } from '../model/types'

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
    tag: { id: response.id, tagName: response.tagName, global: response.global },
    reused: response.reused,
  }
}
