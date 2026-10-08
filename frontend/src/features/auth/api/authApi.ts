import { request } from '../../../shared/lib/http'
import type { AuthUser, LoginCredentials, RegisterPayload } from '../model/types'

interface TokenResponse {
  accessToken: string
}

export async function register(payload: RegisterPayload): Promise<void> {
  await request<void>('/auth/register', { method: 'POST', body: payload })
}

export async function login(credentials: LoginCredentials): Promise<string> {
  const data = await request<TokenResponse>('/auth/login', { method: 'POST', body: credentials })
  return data.accessToken
}

export async function refresh(): Promise<string> {
  const data = await request<TokenResponse>('/auth/refresh', { method: 'POST' })
  return data.accessToken
}

export async function logout(): Promise<void> {
  await request<void>('/auth/logout', { method: 'POST' })
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>('/users/me', { auth: true })
}
