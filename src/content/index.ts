import { EXTENSION_CONFIG } from '../constants'
import type { ExtensionMessage, MessageResponse } from '../types/messages'

declare global {
  interface Window { __cfInitialized?: boolean }
}

// Guard against double-injection (programmatic fallback can re-run this file)
if (!window.__cfInitialized) {
  window.__cfInitialized = true

  chrome.runtime.onMessage.addListener((
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (r: MessageResponse<string>) => void,
  ) => {
    if (message.type !== 'SCRAPE_PAGE') return

    try {
      sendResponse({ status: 'ok', data: extractPageText() })
    } catch (e) {
      sendResponse({ status: 'error', error: (e as Error).message })
    }

    return true // keep the message channel open
  })
}

// ── Noise elements stripped before extraction ──────────────────────────────
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe',
  'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.nav', '.navbar', '.navigation', '.menu',
  '.header', '.site-header', '.page-header',
  '.footer', '.site-footer', '.page-footer',
  '.sidebar', '.side-bar', '.widget-area',
  '.ads', '.ad', '.advertisement', '.promo',
  '.cookie-banner', '.cookie-notice', '.consent',
  '#comments', '.comments', '.comment-section',
  '.social-share', '.share-buttons',
].join(', ')

// ── Preferred semantic containers (tried in order) ─────────────────────────
const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.article-body',
  '.post-body',
  '.content-body',
  '#article-body',
  '#content',
  '.content',
]

function extractPageText(): string {
  const title = document.title.trim()
  const url   = location.href

  // Find the best content root
  let root: Element = document.body
  for (const selector of CONTENT_SELECTORS) {
    const el = document.querySelector(selector)
    if (el && (el.textContent?.trim().length ?? 0) > 200) {
      root = el
      break
    }
  }

  // Clone so we don't mutate the live DOM
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll(NOISE_SELECTORS).forEach(el => el.remove())

  const body = (clone.textContent ?? '')
    .replace(/[ \t]+/g, ' ')      // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')   // collapse excess blank lines
    .trim()
    .slice(0, EXTENSION_CONFIG.MAX_CONTENT_LENGTH)

  return `Title: ${title}\nURL: ${url}\n\n${body}`
}
