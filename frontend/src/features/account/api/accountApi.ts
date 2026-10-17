import { request } from '../../../shared/lib/http'
import type { AuthUser } from '../../auth/model/types'

export async function updateProfile(payload: {
  name: string
  avatarColor: string
}): Promise<AuthUser> {
  return request<AuthUser>('/users/me', { method: 'PUT', body: payload, auth: true })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<void>('/users/me/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
    auth: true,
  })
}
