import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { signIn } from '../services/auth.js'
import { isSupabaseConfigured } from '../services/supabase.js'

export default function Login() {
  const { session, profile, loading, authError, clearAuthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => () => clearAuthError(), [clearAuthError])

  if (loading) return <LoadingScreen />
  if (session && profile) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: loginError } = await signIn(email, password)
    setSubmitting(false)

    if (loginError) {
      setError(loginError.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : 'No fue posible iniciar sesión. Inténtalo nuevamente.')
      return
    }

    navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand brand-light"><span className="brand-mark">CT</span><span><strong>Catálogo Tiendas</strong><small>Administración central</small></span></div>
        <div><p className="eyebrow">Inventario, sin complicaciones</p><h1>Todas tus tiendas.<br />Un solo lugar.</h1><p>Una herramienta rápida y segura para registrar cada prenda y mantener al equipo coordinado.</p></div>
        <p className="login-footnote">Acceso exclusivo para personal autorizado.</p>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div><p className="eyebrow">Bienvenido</p><h2>Inicia sesión</h2><p>Ingresa con las credenciales asignadas por tu administrador.</p></div>
          {!isSupabaseConfigured && <div className="notice notice-warning" role="alert">Falta configurar Supabase. Copia <code>.env.example</code> como <code>.env.local</code> y agrega las credenciales del proyecto.</div>}
          {(error || authError) && <div className="notice notice-error" role="alert">{error || authError}</div>}
          <label>Correo electrónico<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@tienda.com" required disabled={!isSupabaseConfigured || submitting} /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required minLength="6" disabled={!isSupabaseConfigured || submitting} /></label>
          <button className="button button-primary" type="submit" disabled={!isSupabaseConfigured || submitting}>{submitting ? 'Ingresando…' : 'Ingresar al sistema'}</button>
        </form>
      </section>
    </main>
  )
}
