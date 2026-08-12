import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPublicPrice, getPublicProduct, getWhatsAppUrl } from '../services/publicCatalog.js'
import PublicHeader, { StoreBrands } from '../components/PublicHeader.jsx'

const STATUS_LABELS = { available: 'Disponible', reserved: 'Reservado', sold: 'Vendido' }

export default function PublicProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [selectedImage, setSelectedImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    getPublicProduct(id).then(({ data, error: loadError }) => {
      if (!mounted) return
      if (loadError) setError('Este producto no está disponible o ya no existe.')
      else {
        setProduct(data)
        setSelectedImage(data.mainImageUrl || '')
      }
      setLoading(false)
    })
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="public-detail-state"><div className="spinner" /><p>Cargando producto…</p></div>
  if (error || !product) return <div className="public-detail-state"><span>CT</span><h1>Producto no disponible</h1><p>{error}</p><Link className="button button-primary" to="/catalogo">Volver al catálogo</Link></div>

  const whatsappUrl = getWhatsAppUrl(product)

  return (
    <div className="public-catalog-page">
      <PublicHeader />
      <main className="public-detail">
        <Link className="back-to-catalog" to="/catalogo"><i className="bi bi-arrow-left" aria-hidden="true" /> Volver al catálogo</Link>
        <div className="public-detail-layout">
          <section className="public-gallery">
            <div className="public-main-image">{selectedImage ? <img src={selectedImage} alt={product.title} /> : <div><span>{product.code.slice(0, 3)}</span><small>Sin fotografía</small></div>}<span className={`public-status public-status-${product.status}`}><i className={`bi ${product.status === 'available' ? 'bi-check-circle-fill' : 'bi-clock-fill'}`} aria-hidden="true" /> {STATUS_LABELS[product.status]}</span></div>
            {product.product_images?.length > 1 && <div className="public-thumbnails">{product.product_images.map((image, index) => <button key={image.id} className={selectedImage === image.signedUrl ? 'active' : ''} type="button" onClick={() => setSelectedImage(image.signedUrl)}><img src={image.signedUrl} alt={`${product.title}, fotografía ${index + 1}`} /></button>)}</div>}
          </section>
          <section className="public-product-info">
            <StoreBrands storeName={product.stores?.name || ''} />
            <h1>{product.title}</h1>
            <strong className="public-detail-price">{formatPublicPrice(product.price)}</strong>
            <div className="public-detail-features">
              <div><small><i className="bi bi-info-circle" aria-hidden="true" /> Estado</small><strong className={`detail-status-${product.status}`}>{STATUS_LABELS[product.status]}</strong></div>
              {product.sizes?.name && <div><small><i className="bi bi-rulers" aria-hidden="true" /> Talla</small><strong>{product.sizes.name}</strong></div>}
              {product.categories?.name && <div><small><i className="bi bi-tag" aria-hidden="true" /> Categoría</small><strong>{product.categories.name}</strong></div>}
              <div className="public-detail-feature-location"><small><i className="bi bi-geo-alt" aria-hidden="true" /> Sucursal</small><strong>{product.branches?.name || product.stores?.name}</strong>{product.branches?.name && <span>{product.stores?.name}</span>}</div>
            </div>
            {product.description && <div className="public-description"><h2>Detalles</h2><p>{product.description}</p></div>}
            <div className="public-code"><span>Código del producto</span><strong>{product.code}</strong></div>
            {whatsappUrl ? <a className="whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer"><span><i className="bi bi-whatsapp" aria-hidden="true" /></span><span><strong>Solicitar por WhatsApp</strong><small>Consulta disponibilidad con la tienda</small></span></a> : <div className="whatsapp-missing"><i className="bi bi-exclamation-circle" aria-hidden="true" /> Esta tienda aún no ha configurado su número de WhatsApp.</div>}
            <p className="availability-note">La solicitud no reserva automáticamente la pieza. La tienda confirmará su disponibilidad por WhatsApp.</p>
          </section>
        </div>
      </main>
      <footer className="public-footer"><StoreBrands compact /><p>Compra con confianza directamente en nuestras tiendas.</p></footer>
    </div>
  )
}
