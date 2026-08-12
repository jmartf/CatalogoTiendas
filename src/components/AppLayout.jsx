import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function AppLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/dashboard" aria-label="Ir al inicio">
          <span className="brand-mark">CT</span>
          <span><strong>Catálogo Tiendas</strong><small>Administración central</small></span>
        </NavLink>
        <div className="topbar-actions"><NavLink className="button button-ghost catalog-preview-link" to="/catalogo"><i className="bi bi-eye" aria-hidden="true" /> Ver catálogo</NavLink><button className="button button-ghost" type="button" onClick={signOut}><i className="bi bi-box-arrow-right" aria-hidden="true" /> Cerrar sesión</button></div>
      </header>
      <aside className="sidebar" aria-label="Navegación principal">
        <nav>
          <NavLink to="/dashboard"><i className="bi bi-grid-1x2" aria-hidden="true" /> Resumen</NavLink>
          <NavLink to="/productos"><i className="bi bi-bag" aria-hidden="true" /> Productos</NavLink>
          {profile.role === 'admin' && <NavLink to="/administracion/catalogos"><i className="bi bi-tags" aria-hidden="true" /> Catálogos</NavLink>}
          {profile.role === 'admin' && <NavLink to="/administracion/usuarios"><i className="bi bi-people" aria-hidden="true" /> Usuarios</NavLink>}
        </nav>
        <div className="user-card">
          <span className="avatar">{profile.full_name.slice(0, 1).toUpperCase()}</span>
          <span><strong>{profile.full_name}</strong><small>{profile.role === 'admin' ? 'Administrador' : 'Empleado'}</small></span>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  )
}
