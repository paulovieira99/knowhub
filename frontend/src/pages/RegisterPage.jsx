import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  function set(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('As senhas não coincidem')
    if (form.password.length < 6) return toast.error('Senha deve ter pelo menos 6 caracteres')
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      toast.success('Conta criada!')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{ fontSize: 28, color: 'var(--accent)' }}>⬡</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>KnowHub</span>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 13.5, marginBottom: 28 }}>Criar nova conta</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'username', label: 'Usuário', type: 'text', placeholder: 'seu_usuario' },
            { key: 'email', label: 'E-mail', type: 'email', placeholder: 'voce@exemplo.com' },
            { key: 'password', label: 'Senha', type: 'password', placeholder: '••••••••' },
            { key: 'confirm', label: 'Confirmar senha', type: 'password', placeholder: '••••••••' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</label>
              <input className="input" type={type} value={form[key]} onChange={set(key)} placeholder={placeholder} required />
            </div>
          ))}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5 }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 },
  card: { width: '100%', maxWidth: 380, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 32px' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
}
