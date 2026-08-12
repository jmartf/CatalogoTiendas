import { Link } from 'react-router-dom'

const STATUS_LABELS = { available: 'Disponible', reserved: 'Reservado', sold: 'Vendido' }

function formatPrice(price) {
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 }).format(Number(price))
}

export default function ProductCard({ product, changing, canDelete, onStatusChange, onToggleActive, onDelete }) {
  return (
    <article className={`product-card ${product.active ? '' : 'inactive'}`}>
      {product.mainImageUrl ? <div className="product-photo"><img src={product.mainImageUrl} alt={`Fotografía de ${product.title}`} loading="lazy" /></div> : <div className="product-placeholder" aria-hidden="true"><span>{product.code.slice(0, 3)}</span><small>Sin fotografía</small></div>}
      <div className="product-card-body">
        <div className="product-card-top">
          <div><p className="product-code">{product.code}</p><h2>{product.title}</h2></div>
          <strong className="product-price">{formatPrice(product.price)}</strong>
        </div>
        <div className="product-meta">
          <span>{product.stores?.name || 'Sin tienda'}</span>
          {product.branches?.name && <span>{product.branches.name}</span>}
          <span>{product.categories?.name || 'Sin categoría'}</span>
          {product.sizes?.name && <span>Talla {product.sizes.name}</span>}
        </div>
        <div className="product-card-actions">
          <label className={`status-select status-${product.status}`}>
            <span className="sr-only">Estado de {product.title}</span>
            <select value={product.status} onChange={(event) => onStatusChange(product, event.target.value)} disabled={changing}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <div>
            <Link className="small-action" to={`/productos/${product.id}/editar`}><i className="bi bi-pencil" aria-hidden="true" /> Editar</Link>
            <button className={`small-action ${product.active ? 'danger-action' : 'success-action'}`} type="button" onClick={() => onToggleActive(product)} disabled={changing}><i className={`bi ${product.active ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" /> {product.active ? 'Desactivar' : 'Activar'}</button>
            {canDelete && <button className="small-action delete-action" type="button" onClick={() => onDelete(product)} disabled={changing}><i className="bi bi-trash3" aria-hidden="true" /> Eliminar</button>}
          </div>
        </div>
      </div>
    </article>
  )
}
