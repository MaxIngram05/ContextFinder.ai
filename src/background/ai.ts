import { fetchWithTimeout } from './fetch-timeout'

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION   = '2023-06-01'
const MODEL               = 'claude-haiku-4-5-20251001'
const MAX_TOKENS          = 1024
// Injected by webpack DefinePlugin at build time — never appears in source control
const ANTHROPIC_API_KEY: string = process.env.ANTHROPIC_API_KEY ?? ''

interface AnthropicResponse {
  content?: Array<{ type: string; text: string }>
  error?:   { type: string; message: string }
}

export async function summarizeContent(content: string): Promise<string> {
  const prompt =
    'Summarize the following content clearly and concisely. ' +
    'Write 3–5 sentences covering the main topic, key findings or arguments, ' +
    'and any notable conclusions. Avoid filler phrases.\n\n' +
    content
  return callClaude(prompt)
}

export async function answerQuestion(question: string, context: string): Promise<string> {
  const prompt =
    'Answer the question below using only the provided content. ' +
    'If the answer is not present in the content, say so clearly.\n\n' +
    `Content:\n${context}\n\n` +
    `Question: ${question}`
  return callClaude(prompt)
}

async function callClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'Anthropic API key not configured. ' +
      'Add ANTHROPIC_API_KEY=<your-key> to your .env file and rebuild.',
    )
  }

  const res = await fetchWithTimeout(ANTHROPIC_ENDPOINT, {
    method:  'POST',
    headers: {
      'x-api-key':        ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type':     'application/json',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json() as AnthropicResponse

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Anthropic API error: HTTP ${res.status}`)
  }

  const text = data.content?.find(b => b.type === 'text')?.text?.trim() ?? ''
  if (!text) throw new Error('Empty response from Claude.')
  return text
}
