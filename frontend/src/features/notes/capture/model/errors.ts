import { HttpError, NetworkError } from '../../../../shared/lib/http'
import { captureCopy } from './copy'

function serverDetail(body: unknown): string | null {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === 'string' && detail.trim() !== '') {
      return detail
    }
  }
  return null
}

export function isConsentRequired(error: unknown): boolean {
  return error instanceof HttpError && error.status === 428
}

export function isQuotaExceeded(error: unknown): boolean {
  return error instanceof HttpError && error.status === 429
}

export function isOutOfScope(error: unknown): boolean {
  return error instanceof HttpError && error.status === 422
}

export function isTagsUnavailable(error: unknown): boolean {
  return error instanceof HttpError
    && error.status === 502
    && serverDetail(error.body) === 'No se pudieron cargar las etiquetas'
}

export function mapCaptureError(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'No se pudo conectar. Revisa tu conexión e intenta nuevamente.'
  }
  if (error instanceof HttpError) {
    if (error.status === 428) {
      return captureCopy.consentRequired
    }
    if (error.status === 422) {
      return serverDetail(error.body) ?? captureCopy.outOfScope
    }
    if (error.status === 429) {
      return captureCopy.quota
    }
    if (error.status === 503) {
      return captureCopy.aiDisabled
    }
    if (error.status === 504) {
      return 'El proveedor de IA tardó demasiado. Se abrió el editor manual.'
    }
    if (error.status === 409) {
      return 'La confirmación ya fue usada con otros datos. Revisa la nota e intenta nuevamente.'
    }
    return serverDetail(error.body) ?? captureCopy.providerError
  }
  return captureCopy.providerError
}
