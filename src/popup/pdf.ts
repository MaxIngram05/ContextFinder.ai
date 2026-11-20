import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { EXTENSION_CONFIG } from '../constants'

// ── Worker setup ─────────────────────────────────────────────────────────────
// Must be set once before any getDocument() call. Points to the bundled worker
// that webpack copies into dist/ via CopyPlugin.
// Extension context: use chrome.runtime.getURL so the URL is CSP-safe and
// points to the worker bundled inside the extension package.
// Outside an extension (e.g. dev server), fall back to a relative URL — the
// worker is served next to popup.html. PDF.js throws if workerSrc is unset.
GlobalWorkerOptions.workerSrc =
  typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('pdf.worker.min.mjs')
    : new URL('pdf.worker.min.mjs', document.baseURI).href

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Minimum characters returned before we consider the PDF text-based.
 * Below this, the PDF is likely scanned and should fall back to OCR.
 */
export const MIN_PDF_TEXT_CHARS = 50

/**
 * Extracts plain text from a PDF file using PDF.js.
 *
 * Returns an empty string when the PDF has no selectable text (i.e. it is a
 * scanned document). The caller should detect this and fall back to OCR.
 */
export async function extractPdfText(file: File): Promise<string> {
  const buffer    = await file.arrayBuffer()
  const loadingTask = getDocument({ data: buffer, useWorkerFetch: false })

  const pdf = await loadingTask.promise
  const pageTexts: string[] = []

  for (let n = 1; n <= pdf.numPages; n++) {
    const page        = await pdf.getPage(n)
    const textContent = await page.getTextContent()

    const pageText = textContent.items
      .filter((item): item is typeof item & { str: string } => 'str' in item)
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (pageText) pageTexts.push(pageText)

    page.cleanup()
  }

  await pdf.destroy()

  return pageTexts
    .join('\n\n')
    .trim()
    .slice(0, EXTENSION_CONFIG.MAX_CONTENT_LENGTH)
}
