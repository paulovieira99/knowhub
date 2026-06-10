import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Pin, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

function highlight(text, query) {
  if (!query) return text
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${safe})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: 'rgba(79,156,249,0.25)', color: 'var(--accent)', borderRadius: 2 }}>{p}</mark>
      : p
  )
}

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const debounceRef = useRef(null)

  const tagFilter = searchParams.get('tag') || ''
  const isSearching = query.trim().length > 0

  const load = useCallback(async (q, pg, tag) => {
    setLoading(true)
    try {
      const data = await api.listEntries({ q: q.trim() || undefined, page: pg, page_size: 24, tag })
      setEntries(data.items)
      setTotal(data.total)
    } catch {
      setEntries([])
      setTotal(0)
      toast.error('Erro ao carregar entradas')
    } finally {
      setLoading(false)
    }
  }, [])

  // Volta para página 1 ao mudar busca ou tag
  useEffect(() => {
    setPage(1)
  }, [query, tagFilter])

  // Busca com debounce; paginação imediata
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const delay = isSearching ? 280 : 0
    debounceRef.current = setTimeout(() => load(query, page, tagFilter), delay)
    return () => clearTimeout(debounceRef.current)
  }, [query, tagFilter, page, load, isSearching])

  const pinned = isSearching ? [] : entries.filter((e) => e.is_pinned)
  const rest = isSearching ? entries : entries.filter((e) => !e.is_pinned)
  const visible = isSearching ? entries : rest

  return (
    <div style={styles.page}>
      <div style={styles.searchWrap}>
        <div style={styles.searchBox}>
          <Search size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            style={styles.searchInput}
            placeholder="Buscar por título, conteúdo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} style={styles.clearBtn}>
              <X size={14} />
            </button>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/entry/new')}>
          <Plus size={14} /> Nova
        </button>
      </div>

      {(tagFilter || isSearching) && (
        <div style={styles.filters}>
          {isSearching && <span className="tag"><Search size={11} />{query.trim()}</span>}
          {tagFilter && <span className="tag" style={{ color: 'var(--green)', borderColor: 'var(--green)' }}>#{tagFilter}</span>}
          <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{total} resultado{total !== 1 ? 's' : ''}</span>
        </div>
      )}

      {loading ? (
        <div style={styles.empty}>Buscando…</div>
      ) : visible.length === 0 ? (
        <div style={styles.empty}>
          <span style={{ fontSize: 32 }}>⬡</span>
          <span>{isSearching ? 'Nenhuma nota encontrada para esta busca' : 'Nenhuma entrada encontrada'}</span>
          {!isSearching && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/entry/new')}>
              <Plus size={14} /> Criar primeira entrada
            </button>
          )}
        </div>
      ) : (
        <div style={styles.content}>
          {pinned.length > 0 && (
            <section style={styles.section}>
              <div style={styles.sectionHeader}><Pin size={13} /> Fixadas</div>
              <div style={styles.grid}>
                {pinned.map((e) => <EntryCard key={e.id} entry={e} query={query} />)}
              </div>
            </section>
          )}

          <section style={styles.section}>
            {(pinned.length > 0 || isSearching) && (
              <div style={styles.sectionHeader}>{isSearching ? 'Resultados' : 'Recentes'}</div>
            )}
            <div style={styles.grid}>
              {visible.map((e) => <EntryCard key={e.id} entry={e} query={query} />)}
            </div>
          </section>

          {total > 24 && (
            <div style={styles.pagination}>
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Página {page} de {Math.ceil(total / 24)}</span>
              <button className="btn btn-ghost btn-sm" disabled={page * 24 >= total} onClick={() => setPage((p) => p + 1)}>Próxima →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EntryCard({ entry, query }) {
  const preview = entry.content?.slice(0, 140).replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/`/g, '').replace(/!\[\[?[^\]]*\]?\]?/g, '') || ''

  return (
    <Link to={`/entry/${entry.id}`} style={styles.card}>
      {entry.is_pinned && (
        <div style={styles.cardTop}>
          <Pin size={12} style={{ color: 'var(--yellow)' }} />
        </div>
      )}
      <div style={styles.cardTitle}>{highlight(entry.title, query)}</div>
      {preview && (
        <div style={styles.cardPreview}>
          {query ? highlight(preview, query) : preview}
          {entry.content?.length > 140 ? '…' : ''}
        </div>
      )}
      <div style={styles.cardFooter}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {entry.tags?.slice(0, 3).map((t) => (
            <span key={t.id} className="tag" style={{ fontSize: 11 }}>#{t.name}</span>
          ))}
        </div>
        <span style={styles.cardDate}>
          {formatDistanceToNow(new Date(entry.updated_at), { locale: ptBR, addSuffix: true })}
        </span>
      </div>
    </Link>
  )
}

const styles = {
  page: { padding: '20px 24px', maxWidth: 1100, margin: '0 auto' },
  searchWrap: { display: 'flex', gap: 10, marginBottom: 16 },
  searchBox: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '0 14px',
    transition: 'border-color var(--transition)',
  },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--text)', fontSize: 14, padding: '9px 0',
    fontFamily: 'var(--font)',
  },
  clearBtn: {
    display: 'flex', alignItems: 'center', background: 'transparent',
    border: 'none', color: 'var(--text-3)', cursor: 'pointer',
  },
  filters: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, padding: '80px 20px', color: 'var(--text-3)', fontSize: 14,
  },
  content: {},
  section: { marginBottom: 28 },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11.5, fontWeight: 600, letterSpacing: '0.05em',
    textTransform: 'uppercase', color: 'var(--text-3)',
    marginBottom: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },
  card: {
    display: 'block',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 16px',
    textDecoration: 'none',
    transition: 'border-color var(--transition), background var(--transition)',
    cursor: 'pointer',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 14.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.3 },
  cardPreview: {
    fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5,
    marginBottom: 10, fontFamily: 'var(--mono)',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardFooter: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  cardDate: { fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 },
}
