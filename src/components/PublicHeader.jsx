import { Link } from 'react-router-dom'

export default function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-brand" to="/catalogo" aria-label="Ir al catálogo">
        <i className="bi bi-bag-heart" aria-hidden="true" />
        <strong>Catálogo</strong>
      </Link>
      <nav className="public-nav" aria-label="Navegación del catálogo">
        <Link to="/catalogo"><i className="bi bi-grid" aria-hidden="true" /> Catálogo</Link>
        <Link className="public-employee-link" to="/login"><i className="bi bi-person" aria-hidden="true" /> <span>Acceso empleados</span></Link>
      </nav>
    </header>
  )
}

export function StoreBrands({ compact = false, storeName = '' }) {
  const normalizedStore = storeName.toLowerCase()
  const showJumping = !storeName || normalizedStore.includes('jumping')
  const showAmericanHome = !storeName || normalizedStore.includes('american')

  return (
    <div className={`store-brands ${compact ? 'store-brands-compact' : ''}`} aria-label="Tiendas disponibles">
      {!compact && <span>{storeName ? 'Estás comprando en' : 'Compra en nuestras tiendas'}</span>}
      <div>
        {showJumping && <img src="/brands/jumping.png" alt="Jumping Ropa Americana" />}
        {showJumping && showAmericanHome && <span aria-hidden="true" />}
        {showAmericanHome && <img src="/brands/american-home.png" alt="American Home Ropa Americana" />}
        {!showJumping && !showAmericanHome && <strong>{storeName}</strong>}
      </div>
    </div>
  )
}
