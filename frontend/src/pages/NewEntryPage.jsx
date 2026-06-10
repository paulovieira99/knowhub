import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { markdown } from '@codemirror/lang-markdown'
import { ArrowLeft, Save, X, Upload, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewEntryPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '', content: '', is_pinned: false, tags: '',
  })
  const [files, setFiles] = useState([])
  const [existingAttachments, setExistingAttachments] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    api.getEntry(id).then((e) => {
      setForm({
        title: e.title,
        content: e.content,
        is_pinned: e.is_pinned,
        tags: e.tags.map((t) => t.name).join(', '),
      })
      setExistingAttachments(e.attachments || [])
      setLoading(false)
    }).catch(() => { toast.error('Erro ao carregar entrada'); navigate('/') })
  }, [id])

  function set(k) { return (v) => setForm((f) => ({ ...f, [k]: v })) }
  function setE(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })) }

  function imageSnippet(filename, storedName) {
    return `\n![${filename}](${api.fileUrl(storedName)})\n`
  }

  async function handleSave() {
    if (!form.title.trim()) return toast.error('Título obrigatório')
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        content: form.content,
        entry_type: 'note',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        is_pinned: form.is_pinned,
      }
      let entry = isEdit
        ? await api.updateEntry(id, payload)
        : await api.createEntry(payload)

      let content = form.content
      for (const file of files) {
        const att = await api.uploadFile(entry.id, file)
        if (file.type?.startsWith('image/')) {
          content += imageSnippet(file.name, att.stored_name)
        }
      }

      if (content !== form.content) {
        entry = await api.updateEntry(entry.id, { content })
      }

      toast.success(isEdit ? 'Nota atualizada!' : 'Nota criada!')
      navigate(`/entry/${entry.id}`)
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function uploadImageImmediately(file) {
    if (!isEdit) {
      setFiles((f) => [...f, file])
      toast('Imagem será inserida na nota ao salvar', { icon: '🖼️' })
      return
    }
    try {
      const att = await api.uploadFile(id, file)
      const content = form.content + imageSnippet(file.name, att.stored_name)
      setExistingAttachments((a) => [...a, att])
      setForm((f) => ({ ...f, content }))
      await api.updateEntry(id, { content })
      toast.success('Imagem inserida na nota')
    } catch {
      toast.error('Erro ao enviar imagem')
    }
  }

  async function removeExisting(attId) {
    if (!confirm('Remover este arquivo?')) return
    try {
      await api.deleteAttachment(attId)
      setExistingAttachments((a) => a.filter((x) => x.id !== attId))
    } catch {
      toast.error('Erro ao remover arquivo')
    }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-3)' }}>Carregando…</div>

  const nonImageAttachments = existingAttachments.filter((a) => !a.mime_type?.startsWith('image/'))

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <span style={styles.pageTitle}>{isEdit ? 'Editar nota' : 'Nova nota'}</span>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      <div style={styles.body}>
        <div style={styles.formCol}>
          <input
            className="input"
            placeholder="Título da nota"
            value={form.title}
            onChange={setE('title')}
            style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}
          />

          <div style={styles.row}>
            <div style={{ ...styles.field, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="pinned" checked={form.is_pinned} onChange={(e) => set('is_pinned')(e.target.checked)} style={{ cursor: 'pointer' }} />
              <label htmlFor="pinned" style={{ ...styles.label, cursor: 'pointer', margin: 0 }}>Fixar</label>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Tags (separadas por vírgula)</label>
            <input className="input" placeholder="docker, python, infra" value={form.tags} onChange={setE('tags')} />
          </div>

          <div style={styles.field}>
            <div style={styles.editorToolbar}>
              <label style={styles.label}>Conteúdo (Markdown)</label>
              <label style={styles.imageBtn}>
                <ImageIcon size={14} />
                Inserir imagem
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadImageImmediately(file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <div style={styles.editorWrap}>
              <CodeMirror
                value={form.content}
                onChange={set('content')}
                theme={oneDark}
                extensions={[markdown()]}
                style={{ fontSize: 13.5 }}
                basicSetup={{
                  lineNumbers: false,
                  foldGutter: false,
                  highlightActiveLine: true,
                  searchKeymap: true,
                }}
              />
            </div>
            <p style={styles.hint}>
              Suporta Markdown, blocos de código, tabelas e imagens.
              Sintaxe Obsidian <code>![[imagem.png]]</code> também funciona se a imagem estiver anexada.
            </p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Arquivos anexos (PDF, zip, etc.)</label>
            <label style={styles.uploadArea}>
              <Upload size={16} />
              <span>Clique para anexar arquivos (max 50MB)</span>
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files)])}
              />
            </label>

            {nonImageAttachments.map((a) => (
              <div key={a.id} style={styles.fileItem}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{a.filename}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{(a.size_bytes / 1024).toFixed(1)} KB</span>
                <button onClick={() => removeExisting(a.id)} style={styles.removeBtn}><X size={12} /></button>
              </div>
            ))}

            {files.map((f, i) => (
              <div key={i} style={{ ...styles.fileItem, borderColor: 'var(--accent)' }}>
                <span style={{ fontSize: 13, color: 'var(--accent)' }}>+ {f.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{(f.size / 1024).toFixed(1)} KB</span>
                <button onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} style={styles.removeBtn}><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px',
    borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: 'none', color: 'var(--text-2)',
    cursor: 'pointer', fontSize: 13.5, padding: '4px 8px', borderRadius: 'var(--radius)',
  },
  pageTitle: { flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--text)' },
  body: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  formCol: { maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 },
  label: { fontSize: 12.5, fontWeight: 500, color: 'var(--text-2)' },
  editorToolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  imageBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 12.5, color: 'var(--accent)', cursor: 'pointer',
    padding: '4px 10px', borderRadius: 'var(--radius)',
    border: '1px solid var(--border)', background: 'var(--bg-3)',
  },
  editorWrap: {
    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    overflow: 'hidden', minHeight: 400,
  },
  hint: { fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 },
  uploadArea: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
    border: '1px dashed var(--border-2)', borderRadius: 'var(--radius)',
    color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
    transition: 'border-color var(--transition)',
  },
  fileItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', marginTop: 4,
  },
  removeBtn: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center',
    background: 'transparent', border: 'none', color: 'var(--text-3)',
    cursor: 'pointer', padding: 2,
  },
}
