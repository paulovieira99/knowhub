import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { api } from '../../lib/api'
import { Plus, LogOut, Tag, Menu, X } from 'lucide-react'

export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [tags, setTags] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTag, setActiveTag] = useState(null)

  useEffect(() => {
    api.listTags().then(setTags).catch(() => {})
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function filterByTag(tag) {
    const next = activeTag === tag ? null : tag
    setActiveTag(next)
    navigate(`/?tag=${next || ''}`)
  }

  return (
    <div style={styles.root}>
      <header style={styles.topbar}>
        <div style={styles.topbarLeft}>
          <button onClick={() => setSidebarOpen((v) => !v)} style={styles.iconBtn}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link to="/" style={styles.brand}>
            <span style={{ color: 'var(--accent)', fontSize: 20 }}>⬡</span>
            <span style={styles.brandText}>KnowHub</span>
          </Link>
        </div>
        <div style={styles.topbarRight}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{user?.username}</span>
          <button onClick={handleLogout} style={styles.iconBtn} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div style={styles.body}>
        {sidebarOpen && (
          <aside style={styles.sidebar}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/entry/new')}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }}
            >
              <Plus size={15} /> Nova nota
            </button>

            {tags.length > 0 && (
              <>
                <div style={styles.sectionTitle}>
                  <Tag size={12} /> Tags
                </div>
                <div style={styles.tagList}>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => filterByTag(tag)}
                      className="tag"
                      style={{
                        cursor: 'pointer',
                        border: activeTag === tag ? '1px solid var(--accent)' : undefined,
                        color: activeTag === tag ? 'var(--accent)' : undefined,
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}

        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  topbar: {
    height: 'var(--topbar-h)',
    minHeight: 'var(--topbar-h)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: 'var(--bg-2)',
    borderBottom: '1px solid var(--border)',
    zIndex: 10,
  },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  brand: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  brandText: { fontWeight: 700, fontSize: 17, color: 'var(--text)', letterSpacing: '-0.01em' },
  iconBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 'var(--radius)',
    background: 'transparent', color: 'var(--text-2)',
    cursor: 'pointer', border: 'none',
    transition: 'background var(--transition)',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 'var(--sidebar-w)',
    minWidth: 'var(--sidebar-w)',
    background: 'var(--bg-2)',
    borderRight: '1px solid var(--border)',
    padding: '16px 12px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-3)',
    marginBottom: 6, padding: '0 4px',
  },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 0' },
  main: { flex: 1, overflowY: 'auto', background: 'var(--bg)' },
}
