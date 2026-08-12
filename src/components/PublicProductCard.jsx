import { Link } from 'react-router-dom'
import { formatPublicPrice } from '../services/publicCatalog.js'

const STATUS_LABELS = { available: 'Disponible', reserved: 'Reservado', sold: 'Vendido' }

export default function PublicProductCard({ product }) {
  const location = product.branches?.name || product.stores?.name

  return (
    <Link className="public-product-card" to={`/catalogo/${product.id}`}>
      <div className="public-card-image">
        {product.mainImageUrl ? <img src={product.mainImageUrl} alt={product.title} loading="lazy" /> : <div><span>{product.code.slice(0, 3)}</span><small>Sin fotografía</small></div>}
        <span className={`public-status public-status-${product.status}`}><i className={`bi ${product.status === 'available' ? 'bi-check-circle-fill' : 'bi-clock-fill'}`} aria-hidden="true" /> {STATUS_LABELS[product.status]}</span>
      </div>
      <div className="public-card-copy">
        <h2>{product.title}</h2>
        <strong className="public-card-price">{formatPublicPrice(product.price)}</strong>
        <div className="public-card-features">
          {product.sizes?.name && <span><small><i className="bi bi-rulers" aria-hidden="true" /> Talla</small><strong>{product.sizes.name}</strong></span>}
          {location && <span className="public-card-location"><small><i className="bi bi-geo-alt" aria-hidden="true" /> Sucursal</small><strong>{location}</strong></span>}
        </div>
      </div>
    </Link>
  )
}
