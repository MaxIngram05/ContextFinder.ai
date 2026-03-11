import { useState, useEffect, useRef, DragEvent, ChangeEvent, KeyboardEvent } from 'react'
import './App.css'
import type { ExtensionMessage, MessageResponse } from '../types/messages'
import { STORAGE_KEYS } from '../constants'

type Mode = 'page' | 'pdf'
type LoadingPhase = 'scrape' | 'summarize' | 'ask' | null
type SaveStatus = 'saved' | 'cleared' | null

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

// ── Chrome storage helpers (no-op outside extension context) ─────────────────

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.sync
}

async function storageGet(key: string): Promise<string> {
  if (!hasChromeStorage()) return ''
  const result = await chrome.storage.sync.get(key)
  return (result[key] as string | undefined) ?? ''
}

async function storageSet(key: string, value: string): Promise<void> {
  if (!hasChromeStorage()) return
  await chrome.storage.sync.set({ [key]: value })
}

async function storageClear(key: string): Promise<void> {
  if (!hasChromeStorage()) return
  await chrome.storage.sync.remove(key)
}

// ── Extension messaging helper ────────────────────────────────────────────────

function sendMessage<T>(message: ExtensionMessage): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(message, resolve)
    } else {
      console.log('[stub] message sent:', message)
      setTimeout(() => resolve({ status: 'ok', data: '[stub] backend not connected yet' as T }), 800)
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function App() {
  // ── Main state
  const [mode, setMode]               = useState<Mode>('page')
  const [content, setContent]         = useState('')
  const [fileName, setFileName]       = useState<string | null>(null)
  const [summary, setSummary]         = useState('')
  const [chat, setChat]               = useState<ChatMessage[]>([])
  const [question, setQuestion]       = useState('')
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null)
  const [error, setError]             = useState<string | null>(null)
  const [isDragging, setIsDragging]   = useState(false)

  // ── Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [keyIsSet, setKeyIsSet]         = useState(false)
  const [keyInput, setKeyInput]         = useState('')
  const [revealKey, setRevealKey]       = useState(false)
  const [saveStatus, setSaveStatus]     = useState<SaveStatus>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef   = useRef<HTMLDivElement>(null)
  const loading      = loadingPhase !== null

  // Load key-set state on mount
  useEffect(() => {
    storageGet(STORAGE_KEYS.ANTHROPIC_KEY).then(k => setKeyIsSet(!!k))
  }, [])

  // ── Settings handlers ──────────────────────────────────────────────────────

  async function handleSaveKey() {
    const k = keyInput.trim()
    if (!k) return
    await storageSet(STORAGE_KEYS.ANTHROPIC_KEY, k)
    setKeyIsSet(true)
    setKeyInput('')
    setRevealKey(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  async function handleClearKey() {
    await storageClear(STORAGE_KEYS.ANTHROPIC_KEY)
    setKeyIsSet(false)
    setKeyInput('')
    setSaveStatus('cleared')
    setTimeout(() => setSaveStatus(null), 2500)
  }

  // ── Main handlers ─────────────────────────────────────────────────────────

  function switchMode(next: Mode) {
    setMode(next)
    setContent('')
    setSummary('')
    setChat([])
    setFileName(null)
    setError(null)
  }

  async function handleScrapePage() {
    setError(null)
    setLoadingPhase('scrape')
    try {
      const res = await sendMessage<string>({ type: 'SCRAPE_PAGE' })
      if (res.status === 'error') throw new Error(res.error ?? 'Failed to scrape page')
      setContent(res.data ?? '')
      setSummary('')
      setChat([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingPhase(null)
    }
  }

  function processPdfFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    setError(null)
    setLoadingPhase('scrape')
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1] ?? ''
      try {
        const res = await sendMessage<string>({ type: 'PROCESS_PDF', fileName: file.name, content: base64 })
        if (res.status === 'error') throw new Error(res.error ?? 'Failed to process PDF')
        setFileName(file.name)
        setContent(res.data ?? base64)
        setSummary('')
        setChat([])
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoadingPhase(null)
      }
    }
    reader.onerror = () => { setError('Could not read file.'); setLoadingPhase(null) }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processPdfFile(file)
  }

  async function handleSummarize() {
    if (!content) return
    setError(null)
    setLoadingPhase('summarize')
    try {
      const res = await sendMessage<string>({ type: 'SUMMARIZE', content })
      if (res.status === 'error') throw new Error(res.error ?? 'Failed to summarize')
      setSummary(res.data ?? '')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingPhase(null)
    }
  }

  async function handleAsk() {
    const q = question.trim()
    if (!q || !content || loading) return
    setQuestion('')
    setError(null)
    setChat(prev => [...prev, { role: 'user', text: q }])
    setLoadingPhase('ask')
    try {
      const res = await sendMessage<string>({ type: 'ASK_QUESTION', question: q, context: content })
      if (res.status === 'error') throw new Error(res.error ?? 'No answer received')
      setChat(prev => [...prev, { role: 'assistant', text: res.data ?? '' }])
    } catch (e) {
      setChat(prev => [...prev, { role: 'assistant', text: `Error: ${(e as Error).message}` }])
    } finally {
      setLoadingPhase(null)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  function handleQuestionKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !loading) handleAsk()
  }

  const hasContent = content.length > 0
  const hasSummary = summary.length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* ── Header (always visible) ── */}
      <header className="app-header">
        <span className="app-logo" aria-hidden>◈</span>
        <h1 className="app-title">
          ContextFinder<span className="app-title-accent">.ai</span>
        </h1>
        <button
          className={`btn-gear${showSettings ? ' active' : ''}`}
          onClick={() => { setShowSettings(s => !s); setSaveStatus(null) }}
          aria-label="Settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>

      {/* ── Settings panel ── */}
      {showSettings ? (
        <div className="app-body">
          <section className="section">
            <div className="settings-heading">Anthropic API Key</div>

            <div className="key-status-row">
              <span className={`key-dot${keyIsSet ? ' key-dot--set' : ''}`} />
              <span className="key-status-label">
                {keyIsSet ? 'Key configured' : 'No key — AI features disabled'}
              </span>
            </div>

            <div className="key-input-wrap">
              <input
                className="qa-input"
                type={revealKey ? 'text' : 'password'}
                placeholder={keyIsSet ? 'Enter new key to replace…' : 'sk-ant-…'}
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveKey() }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="btn-icon"
                onClick={() => setRevealKey(r => !r)}
                aria-label={revealKey ? 'Hide key' : 'Show key'}
                title={revealKey ? 'Hide' : 'Show'}
              >
                {revealKey ? '●' : '○'}
              </button>
            </div>

            <p className="field-hint">
              Get yours at{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                console.anthropic.com
              </a>
            </p>

            <div className="key-actions">
              <button
                className="btn btn-accent"
                onClick={handleSaveKey}
                disabled={!keyInput.trim()}
              >
                Save Key
              </button>
              {keyIsSet && (
                <button className="btn btn-danger" onClick={handleClearKey}>
                  Clear
                </button>
              )}
            </div>

            {saveStatus === 'saved'   && <p className="save-feedback save-feedback--ok">Key saved.</p>}
            {saveStatus === 'cleared' && <p className="save-feedback save-feedback--muted">Key cleared.</p>}
          </section>

          <p className="settings-privacy">
            Your key is stored in Chrome's encrypted sync storage and sent only to
            Anthropic's API — never to any other server.
          </p>
        </div>

      ) : (

        /* ── Main panel ── */
        <>
          <div className="mode-tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'page'}
              className={`mode-tab${mode === 'page' ? ' active' : ''}`}
              onClick={() => switchMode('page')}>
              Page
            </button>
            <button role="tab" aria-selected={mode === 'pdf'}
              className={`mode-tab${mode === 'pdf' ? ' active' : ''}`}
              onClick={() => switchMode('pdf')}>
              PDF
            </button>
          </div>

          <div className="app-body">

            {/* ── No-key warning ── */}
            {!keyIsSet && (
              <div className="key-warn">
                AI features need an API key —{' '}
                <button className="key-warn-link" onClick={() => setShowSettings(true)}>
                  open Settings ⚙
                </button>
              </div>
            )}

            {/* ── Input section ── */}
            {mode === 'page' ? (
              <section className="section">
                <button className="btn btn-primary btn-block" onClick={handleScrapePage} disabled={loading}>
                  {loadingPhase === 'scrape'
                    ? <><span className="spinner" /> Scraping page…</>
                    : 'Scrape Current Page'}
                </button>
                {hasContent && (
                  <p className="status-ok">
                    Page loaded &middot; {content.length.toLocaleString()} chars
                  </p>
                )}
              </section>
            ) : (
              <section className="section">
                <div
                  className={`drop-zone${isDragging ? ' dragging' : ''}${hasContent ? ' loaded' : ''}`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !loading && fileInputRef.current?.click()}
                  role="button" aria-label="Upload PDF" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                >
                  {loadingPhase === 'scrape' ? (
                    <><span className="drop-icon"><span className="spinner spinner-lg" /></span>
                      <span className="drop-primary">Processing PDF…</span></>
                  ) : hasContent ? (
                    <><span className="drop-icon">&#128196;</span>
                      <span className="drop-primary">{fileName}</span>
                      <span className="drop-secondary">Click to replace</span></>
                  ) : (
                    <><span className="drop-icon">&#8679;</span>
                      <span className="drop-primary">Drop PDF here</span>
                      <span className="drop-secondary">or click to browse</span></>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="sr-only"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0]
                    if (file) processPdfFile(file)
                    e.target.value = ''
                  }} />
              </section>
            )}

            {/* ── Error banner ── */}
            {error && (
              <div className="error-banner" role="alert">
                <span>{error}</span>
                <button className="error-dismiss" onClick={() => setError(null)} aria-label="Dismiss">&#215;</button>
              </div>
            )}

            {/* ── Summarize ── */}
            {hasContent && (
              <section className="section">
                <button className="btn btn-accent btn-block" onClick={handleSummarize} disabled={loading}>
                  {loadingPhase === 'summarize'
                    ? <><span className="spinner" /> Summarizing…</>
                    : 'Summarize'}
                </button>
              </section>
            )}

            {/* ── Summary result ── */}
            {hasSummary && (
              <section className="section">
                <div className="result-box">
                  <div className="result-label">Summary</div>
                  <p className="result-text">{summary}</p>
                </div>
              </section>
            )}

            {/* ── Q&A ── */}
            {hasContent && (
              <section className="section qa-section">
                <div className="qa-label">Ask a question</div>
                {chat.length > 0 && (
                  <div className="chat-history" aria-live="polite">
                    {chat.map((msg, i) => (
                      <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                        <span className="chat-role">{msg.role === 'user' ? 'You' : 'AI'}</span>
                        <span className="chat-text">{msg.text}</span>
                      </div>
                    ))}
                    {loadingPhase === 'ask' && (
                      <div className="chat-msg chat-msg--assistant">
                        <span className="chat-role">AI</span>
                        <span className="spinner" />
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
                <div className="qa-row">
                  <input className="qa-input" type="text" placeholder="Ask about this content…"
                    value={question} onChange={e => setQuestion(e.target.value)}
                    onKeyDown={handleQuestionKey} disabled={loading} aria-label="Question" />
                  <button className="btn btn-send" onClick={handleAsk}
                    disabled={!question.trim() || loading} aria-label="Send">
                    &#10148;
                  </button>
                </div>
              </section>
            )}

          </div>
        </>
      )}

    </div>
  )
}
