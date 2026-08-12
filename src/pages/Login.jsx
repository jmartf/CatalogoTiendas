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
        <div className="login-store-logos"><img src="/brands/jumping.png" alt="Jumping Ropa Americana" /><span aria-hidden="true" /><img src="/brands/american-home.png" alt="American Home Ropa Americana" /></div>
        <div><p className="eyebrow">Gestión de nuestras tiendas</p><h1>Dos marcas.<br />Un solo equipo.</h1><p>Administra las prendas de Jumping y American Home, mantén el inventario actualizado y conecta cada cliente con la tienda correcta.</p></div>
        <p className="login-footnote">Acceso exclusivo para personal autorizado.</p>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-heading"><span><i className="bi bi-shop" aria-hidden="true" /></span><div><p className="eyebrow">Portal del equipo</p><h2>Inicia sesión</h2><p>Ingresa con las credenciales asignadas para administrar nuestras tiendas.</p></div></div>
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
