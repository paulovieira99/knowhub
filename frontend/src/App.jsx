import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import EntryPage from './pages/EntryPage'
import NewEntryPage from './pages/NewEntryPage'

function PrivateRoute({ children }) {
  const { token, loading } = useAuthStore()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-3)' }}>Carregando...</div>
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => { init() }, [init])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<HomePage />} />
        <Route path="entry/new" element={<NewEntryPage />} />
        <Route path="entry/:id" element={<EntryPage />} />
        <Route path="entry/:id/edit" element={<NewEntryPage />} />
      </Route>
    </Routes>
  )
}
