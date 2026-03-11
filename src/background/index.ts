import type { ExtensionMessage, MessageResponse } from '../types/messages'

chrome.runtime.onInstalled.addListener(() => {
  console.log('ContextFinder.ai installed')
})

chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (r: MessageResponse) => void,
) => {
  if (message.type === 'SCRAPE_PAGE') {
    handleScrapePage(sendResponse)
    return true // keep channel open — response is async
  }

  // PROCESS_PDF, SUMMARIZE, ASK_QUESTION — handled once API layer is wired up
  sendResponse({ status: 'ok' })
  return true
})

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
      // Happy path — content script already injected by manifest
      response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' } as ExtensionMessage)
    } catch {
      // Content script not present — tab was open before the extension was installed.
      // Inject it programmatically and retry once.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      })
      response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' } as ExtensionMessage)
    }

    sendResponse(response)
  } catch (e) {
    sendResponse({
      status: 'error',
      error: `Scrape failed: ${(e as Error).message}`,
    })
  }
}
