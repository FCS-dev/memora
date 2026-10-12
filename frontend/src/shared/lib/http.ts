export class HttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Network error')
    this.name = 'NetworkError'
  }
}

export interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
}

type RefreshHandler = () => Promise<string>

const API_BASE_PATH = '/api'

let accessToken: string | null = null
let refreshHandler: RefreshHandler | null = null
let unauthorizedHandler: (() => void) | null = null
let refreshPromise: Promise<string> | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

function notifyUnauthorized(): void {
  unauthorizedHandler?.()
}

function runRefresh(): Promise<string> {
  if (!refreshHandler) {
    return Promise.reject(new HttpError(401, null))
  }
  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function execute(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  try {
    return await fetch(`${API_BASE_PATH}${path}`, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new NetworkError()
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await execute(path, options)

  if (response.status === 401 && options.auth) {
    if (refreshHandler) {
      try {
        const freshToken = await runRefresh()
        setAccessToken(freshToken)
        response = await execute(path, options)
      } catch {
        notifyUnauthorized()
        throw new HttpError(401, await parseBody(response))
      }
    } else {
      notifyUnauthorized()
    }
  }

  const body = await parseBody(response)
  if (!response.ok) {
    throw new HttpError(response.status, body)
  }
  return body as T
}
