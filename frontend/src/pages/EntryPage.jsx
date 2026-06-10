import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import MarkdownContent from '../lib/markdown'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Edit2, Trash2, Pin, PinOff, Download, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function EntryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getEntry(id)
      .then(setEntry)
      .catch(() => { toast.error('Entrada não encontrada'); navigate('/') })
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Deletar esta entrada permanentemente?')) return
    try {
      await api.deleteEntry(id)
      toast.success('Entrada deletada')
      navigate('/')
    } catch {
      toast.error('Erro ao deletar')
    }
  }

  async function togglePin() {
    try {
      const updated = await api.updateEntry(id, { is_pinned: !entry.is_pinned })
      setEntry((e) => ({ ...e, is_pinned: updated.is_pinned }))
      toast.success(updated.is_pinned ? 'Entrada fixada' : 'Entrada desafixada')
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-3)' }}>Carregando…</div>
  if (!entry) return null

  const fileAttachments = (entry.attachments || []).filter(
    (a) => !a.mime_type?.startsWith('image/')
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div style={styles.headerActions}>
          <button onClick={togglePin} className="btn btn-ghost btn-sm" title={entry.is_pinned ? 'Desafixar' : 'Fixar'}>
            {entry.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {entry.is_pinned ? 'Desafixar' : 'Fixar'}
          </button>
          <Link to={`/entry/${id}/edit`} className="btn btn-ghost btn-sm">
            <Edit2 size={14} /> Editar
          </Link>
          <button onClick={handleDelete} className="btn btn-danger btn-sm">
            <Trash2 size={14} /> Deletar
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.titleRow}>
          {entry.is_pinned && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--yellow)' }}>
              <Pin size={12} /> Fixada
            </span>
          )}
        </div>

        <h1 style={styles.title}>{entry.title}</h1>

        <div style={styles.metaRow}>
          <span style={styles.metaItem}>
            Criada em {format(new Date(entry.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
          {entry.updated_at !== entry.created_at && (
            <span style={styles.metaItem}>
              · Atualizada {format(new Date(entry.updated_at), "d MMM yyyy HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>

        {entry.tags?.length > 0 && (
          <div style={styles.tagsRow}>
            {entry.tags.map((t) => (
              <Link key={t.id} to={`/?tag=${t.name}`} className="tag">#{t.name}</Link>
            ))}
          </div>
        )}

        <div style={styles.divider} />

        <MarkdownContent
          content={entry.content}
          attachments={entry.attachments}
          className="md-content"
          style={styles.mdBody}
        />

        {fileAttachments.length > 0 && (
          <div style={styles.attachSection}>
            <div style={styles.attachTitle}>
              <Paperclip size={13} /> Anexos ({fileAttachments.length})
            </div>
            <div style={styles.attachList}>
              {fileAttachments.map((a) => {
                const url = api.fileUrl(a.stored_name)
                return (
                  <div key={a.id} style={styles.attachItem}>
                    <div style={styles.attachFile}>
                      <Paperclip size={14} style={{ color: 'var(--text-3)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{a.filename}</div>
                        {a.size_bytes && (
                          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatBytes(a.size_bytes)}</div>
                        )}
                      </div>
                      <a href={url} download={a.filename} className="btn btn-ghost btn-sm">
                        <Download size={12} /> Baixar
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-2)', gap: 12, flexShrink: 0,
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: 'none', color: 'var(--text-2)',
    cursor: 'pointer', fontSize: 13.5, padding: '4px 8px', borderRadius: 'var(--radius)',
  },
  headerActions: { display: 'flex', gap: 8 },
  content: { flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 900, width: '100%', margin: '0 auto' },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginBottom: 10, letterSpacing: '-0.02em' },
  metaRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  metaItem: { fontSize: 12.5, color: 'var(--text-3)' },
  tagsRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  divider: { borderTop: '1px solid var(--border)', margin: '18px 0' },
  mdBody: { lineHeight: 1.75 },
  attachSection: { marginTop: 32 },
  attachTitle: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
    textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12,
  },
  attachList: { display: 'flex', flexDirection: 'column', gap: 10 },
  attachItem: {
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    overflow: 'hidden', background: 'var(--bg-2)',
  },
  attachFile: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' },
}
