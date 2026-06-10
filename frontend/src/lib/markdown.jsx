import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { api } from './api'

/**
 * Converte sintaxe Obsidian e caminhos locais para URLs de anexos.
 * Suporta: ![[img.png]], ![](img.png), ![](./pasta/img.png)
 */
export function preprocessMarkdown(content, attachments = []) {
  if (!content) return ''

  const byFilename = new Map()
  for (const a of attachments) {
    const base = a.filename?.split('/').pop()
    if (base) byFilename.set(base.toLowerCase(), a)
    if (a.filename) byFilename.set(a.filename.toLowerCase(), a)
  }

  function resolvePath(raw) {
    const clean = raw.split('|')[0].trim()
    const basename = clean.split('/').pop().split('\\').pop()
    const att = byFilename.get(basename.toLowerCase()) || byFilename.get(clean.toLowerCase())
    if (att?.stored_name) return api.fileUrl(att.stored_name)
    if (clean.startsWith('/api/attachments/file/')) return clean
    return null
  }

  let text = content

  // Obsidian wiki embeds: ![[image.png]] ou ![[image.png|alt]]
  text = text.replace(/!\[\[([^\]]+)\]\]/g, (_, ref) => {
    const url = resolvePath(ref)
    const alt = ref.split('|')[1]?.trim() || ref.split('/').pop()
    return url ? `![${alt}](${url})` : `*[Imagem não encontrada: ${ref}]*`
  })

  // Markdown images com caminhos relativos ou só o nome do ficheiro
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    const trimmed = src.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/api/')) {
      return match
    }
    const url = resolvePath(trimmed)
    return url ? `![${alt}](${url})` : match
  })

  return text
}

function MarkdownImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      style={{
        maxWidth: '100%',
        height: 'auto',
        borderRadius: 'var(--radius)',
        margin: '1em 0',
        display: 'block',
        border: '1px solid var(--border)',
        background: 'var(--bg-3)',
      }}
      onError={(e) => {
        e.target.style.display = 'none'
        const fallback = document.createElement('p')
        fallback.style.cssText = 'color:var(--text-3);font-size:13px;font-style:italic;margin:0.5em 0'
        fallback.textContent = `[Imagem indisponível: ${alt || src}]`
        e.target.parentNode?.insertBefore(fallback, e.target.nextSibling)
      }}
    />
  )
}

export default function MarkdownContent({ content, attachments = [], className, style }) {
  const processed = preprocessMarkdown(content, attachments)

  return (
    <div className={className} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} /> }}
      >
        {processed || '*Sem conteúdo*'}
      </ReactMarkdown>
    </div>
  )
}
