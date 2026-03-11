import { fetchWithTimeout } from './fetch-timeout'

const OCR_ENDPOINT = 'https://api.ocr.space/parse/image'
// Injected by webpack DefinePlugin at build time — never appears in source control
const OCRS_API_KEY: string = process.env.OCRS_API_KEY ?? ''

interface OcrResponse {
  ParsedResults?: Array<{ ParsedText: string }>
  IsErroredOnProcessing: boolean
  ErrorMessage?: string[]
  ErrorDetails?: string
}

/**
 * Sends a base64-encoded PDF to OCR.space and returns the extracted plain text.
 * @param base64Content  Raw base64 string (no data-URI prefix).
 */
export async function extractTextFromPdf(base64Content: string): Promise<string> {
  if (!OCRS_API_KEY) {
    throw new Error('OCR API key not configured. Add OCRS_API_KEY to your .env file.')
  }

  const body = new URLSearchParams({
    apikey:                       OCRS_API_KEY,
    base64Image:                  `data:application/pdf;base64,${base64Content}`,
    OCREngine:                    '2',   // more accurate engine
    isSearchablePdfHideTextLayer: 'true',
    scale:                        'true',
  })

  const res = await fetchWithTimeout(OCR_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!res.ok) {
    throw new Error(`OCR request failed: HTTP ${res.status}`)
  }

  const data = await res.json() as OcrResponse

  if (data.IsErroredOnProcessing) {
    const msg = data.ErrorMessage?.[0] ?? data.ErrorDetails ?? 'OCR processing failed.'
    throw new Error(msg)
  }

  const text = (data.ParsedResults ?? [])
    .map(r => r.ParsedText.trim())
    .filter(Boolean)
    .join('\n\n')

  if (!text) throw new Error('No text could be extracted from this PDF.')
  return text
}
