import { request } from '../../../shared/lib/http'
import type { Tag } from '../model/types'

export function listTags(): Promise<Tag[]> {
  return request<Tag[]>('/tags', { auth: true })
}

export function createTag(tagName: string): Promise<Tag> {
  return request<Tag>('/tags', { method: 'POST', body: { tagName }, auth: true })
}
