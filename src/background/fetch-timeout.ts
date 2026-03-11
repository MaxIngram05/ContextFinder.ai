import { EXTENSION_CONFIG } from '../constants'

/**
 * fetch() wrapper that aborts after REQUEST_TIMEOUT_MS.
 * Background service workers have no native timeout — this fills the gap.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), EXTENSION_CONFIG.REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}
