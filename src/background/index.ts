import type { ExtensionMessage, MessageResponse } from '../types/messages'
import { extractTextFromPdf } from './ocr'
import { summarizeContent, answerQuestion } from './ai'

chrome.runtime.onInstalled.addListener(() => {
  console.log('ContextFinder.ai installed')
})

// Single listener — dispatch by message type, always return true to keep
// the response channel open (all handlers are async).
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (r: MessageResponse) => void,
) => {
  dispatch(message, sendResponse)
  return true
})

function dispatch(
  message: ExtensionMessage,
  sendResponse: (r: MessageResponse) => void,
): void {
  switch (message.type) {
    case 'SCRAPE_PAGE':
      handleScrapePage(sendResponse)
      break
    case 'PROCESS_PDF':
      handleProcessPdf(message.fileName, message.content, sendResponse)
      break
    case 'SUMMARIZE':
      handleSummarize(message.content, sendResponse)
      break
    case 'ASK_QUESTION':
      handleAskQuestion(message.question, message.context, sendResponse)
      break
  }
}

// ── SCRAPE_PAGE ───────────────────────────────────────────────────────────────

async function handleScrapePage(
  sendResponse: (r: MessageResponse<string>) => void,
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id || !tab.url) {
      sendResponse({ status: 'error', error: 'No active tab found.' })
      return
    }

    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      sendResponse({
        status: 'error',
        error: 'Cannot scrape this page. Navigate to an http/https page and try again.',
      })
      return
    }

    let response: MessageResponse<string>
    try {
      response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' } as ExtensionMessage)
    } catch {
      // Tab was open before the extension installed — inject content script and retry.
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
      response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' } as ExtensionMessage)
    }

    sendResponse(response)
  } catch (e) {
    sendResponse({ status: 'error', error: `Scrape failed: ${(e as Error).message}` })
  }
}

// ── PROCESS_PDF ───────────────────────────────────────────────────────────────

async function handleProcessPdf(
  fileName: string,
  base64Content: string,
  sendResponse: (r: MessageResponse<string>) => void,
): Promise<void> {
  try {
    const text = await extractTextFromPdf(base64Content)
    sendResponse({ status: 'ok', data: `Source: ${fileName}\n\n${text}` })
  } catch (e) {
    sendResponse({ status: 'error', error: (e as Error).message })
  }
}

// ── SUMMARIZE ─────────────────────────────────────────────────────────────────

async function handleSummarize(
  content: string,
  sendResponse: (r: MessageResponse<string>) => void,
): Promise<void> {
  try {
    const summary = await summarizeContent(content)
    sendResponse({ status: 'ok', data: summary })
  } catch (e) {
    sendResponse({ status: 'error', error: (e as Error).message })
  }
}

// ── ASK_QUESTION ──────────────────────────────────────────────────────────────

async function handleAskQuestion(
  question: string,
  context: string,
  sendResponse: (r: MessageResponse<string>) => void,
): Promise<void> {
  try {
    const answer = await answerQuestion(question, context)
    sendResponse({ status: 'ok', data: answer })
  } catch (e) {
    sendResponse({ status: 'error', error: (e as Error).message })
  }
}
