import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
  const { profile } = useAuth()
  const isAdmin = profile.role === 'admin'

  return (
    <section className="dashboard">
      <header className="dashboard-welcome">
        <div><p className="eyebrow">Resumen</p><h1>Hola, {profile.full_name.split(' ')[0]}</h1><p>¿Qué deseas hacer hoy? Accede rápidamente a las herramientas principales del catálogo.</p></div>
        <span className="status-pill"><i /> Sistema activo</span>
      </header>

      <div className="dashboard-actions">
        <Link className="dashboard-action dashboard-action-primary" to="/productos/nuevo"><i className="bi bi-plus-circle" aria-hidden="true" /><span><strong>Registrar producto</strong><small>Agrega una nueva pieza al inventario.</small></span><i className="bi bi-arrow-right" aria-hidden="true" /></Link>
        <Link className="dashboard-action" to="/productos"><i className="bi bi-bag" aria-hidden="true" /><span><strong>Gestionar productos</strong><small>Consulta, edita o cambia su estado.</small></span><i className="bi bi-arrow-right" aria-hidden="true" /></Link>
        <Link className="dashboard-action" to="/catalogo"><i className="bi bi-eye" aria-hidden="true" /><span><strong>Ver catálogo público</strong><small>Revisa lo que ven tus clientes.</small></span><i className="bi bi-arrow-right" aria-hidden="true" /></Link>
        {isAdmin && <Link className="dashboard-action" to="/administracion/catalogos"><i className="bi bi-tags" aria-hidden="true" /><span><strong>Administrar catálogos</strong><small>Tiendas, sucursales, prendas y tallas.</small></span><i className="bi bi-arrow-right" aria-hidden="true" /></Link>}
        {isAdmin && <Link className="dashboard-action" to="/administracion/usuarios"><i className="bi bi-people" aria-hidden="true" /><span><strong>Administrar usuarios</strong><small>Crea cuentas y controla sus accesos.</small></span><i className="bi bi-arrow-right" aria-hidden="true" /></Link>}
      </div>

      <aside className="dashboard-tip"><i className="bi bi-lightbulb" aria-hidden="true" /><div><strong>Consejo rápido</strong><p>Después de registrar una prenda, abre el catálogo público para comprobar cómo se verá desde el teléfono.</p></div></aside>
    </section>
  )
}
