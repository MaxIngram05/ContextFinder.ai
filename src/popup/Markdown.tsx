import { ReactNode } from 'react'

// Minimal Markdown → React renderer for Claude's answers.
// Handles headings, bullet/numbered lists, paragraphs, **bold**, *italic* and
// `code`. Builds React elements (no innerHTML), so model output can't inject HTML.

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${i++}`
    if (tok.startsWith('**') || tok.startsWith('__')) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={key}>{tok.slice(1, -1)}</code>)
    else out.push(<em key={key}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function Markdown({ text }: { text: string }) {
  const lines  = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let para: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushPara = () => {
    if (para.length) {
      const k = `p${blocks.length}`
      blocks.push(<p key={k}>{renderInline(para.join(' '), k)}</p>)
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      const k = `l${blocks.length}`
      const items = list.items.map((it, j) => <li key={j}>{renderInline(it, `${k}-${j}`)}</li>)
      blocks.push(list.ordered ? <ol key={k}>{items}</ol> : <ul key={k}>{items}</ul>)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    const bullet  = /^[-*•]\s+(.*)$/.exec(line)
    const num     = /^\d+[.)]\s+(.*)$/.exec(line)

    if (!line) { flushPara(); flushList(); continue }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { flushPara(); flushList(); continue }

    if (heading) {
      flushPara(); flushList()
      const k = `h${blocks.length}`
      blocks.push(<div key={k} className="md-heading">{renderInline((heading[1] ?? '').replace(/#+$/, '').trim(), k)}</div>)
    } else if (bullet || num) {
      flushPara()
      const ordered = !!num
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] } }
      list.items.push((bullet ?? num)?.[1] ?? '')
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara(); flushList()

  return <div className="md">{blocks}</div>
}
