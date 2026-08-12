import { Link } from 'react-router-dom'

export default function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="public-header-brands" to="/catalogo" aria-label="Ir al catálogo de Jumping y American Home">
        <img src="/brands/jumping.png" alt="Jumping" />
        <span aria-hidden="true" />
        <img src="/brands/american-home.png" alt="American Home" />
      </Link>
      <nav className="public-nav" aria-label="Navegación del catálogo">
        <Link className="public-employee-link" to="/login" aria-label="Acceso para empleados" title="Acceso para empleados"><i className="bi bi-person" aria-hidden="true" /></Link>
      </nav>
    </header>
  )
}

export function StoreBrands({ compact = false, storeName = '' }) {
  const normalizedStore = storeName.toLowerCase()
  const showJumping = !storeName || normalizedStore.includes('jumping')
  const showAmericanHome = !storeName || normalizedStore.includes('american')

  return (
    <div className={`store-brands ${compact ? 'store-brands-compact' : ''} ${storeName ? 'store-brand-single' : ''}`} aria-label="Tiendas disponibles">
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
