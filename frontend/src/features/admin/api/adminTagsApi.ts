import { request } from '../../../shared/lib/http'
import type { GlobalTag } from '../model/types'

export function listGlobalTags(): Promise<GlobalTag[]> {
  return request<GlobalTag[]>('/admin/tags', { auth: true })
}

export function createGlobalTag(tagName: string): Promise<GlobalTag> {
  return request<GlobalTag>('/admin/tags', { method: 'POST', body: { tagName }, auth: true })
}

export function renameGlobalTag(id: number, tagName: string): Promise<GlobalTag> {
  return request<GlobalTag>(`/admin/tags/${id}`, { method: 'PATCH', body: { tagName }, auth: true })
}

export function deleteGlobalTag(id: number): Promise<void> {
  return request<void>(`/admin/tags/${id}`, { method: 'DELETE', auth: true })
}
