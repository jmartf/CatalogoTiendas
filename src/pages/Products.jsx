import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { listCatalog } from '../services/catalogs.js'
import { deleteProduct, listProducts, setProductActive, updateProductStatus } from '../services/products.js'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'available', label: 'Disponibles' },
  { value: 'reserved', label: 'Reservados' },
  { value: 'sold', label: 'Vendidos' },
]

function messageFor(error) {
  if (error?.code === '42501') return 'No tienes permiso para consultar o modificar estos productos.'
  return error?.message || 'No fue posible completar la operación.'
}

export default function Products() {
  const { profile } = useAuth()
  const [products, setProducts] = useState([])
  const [stores, setStores] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [storeId, setStoreId] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [changingId, setChangingId] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await listProducts({ search: debouncedSearch, status, storeId, showInactive })
    if (loadError) setError(messageFor(loadError))
    else setProducts(data || [])
    setLoading(false)
  }, [debouncedSearch, status, storeId, showInactive])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    listCatalog('stores').then(({ data }) => setStores((data || []).filter((store) => store.active)))
  }, [])

  async function changeStatus(product, nextStatus) {
    setChangingId(product.id)
    setError('')
    const { data, error: updateError } = await updateProductStatus(product.id, nextStatus)
    if (updateError) setError(messageFor(updateError))
    else setProducts((current) => current.map((item) => item.id === product.id ? data : item))
    setChangingId('')
  }

  async function toggleActive(product) {
    setChangingId(product.id)
    setError('')
    const { error: updateError } = await setProductActive(product.id, !product.active)
    if (updateError) setError(messageFor(updateError))
    else setProducts((current) => current.filter((item) => item.id !== product.id))
    setChangingId('')
  }

  async function removeProduct(product) {
    if (!window.confirm(`¿Eliminar definitivamente "${product.title}" (${product.code})? También se eliminarán todas sus fotografías. Esta acción no se puede deshacer.`)) return
    setChangingId(product.id)
    setError('')
    const { error: deleteError } = await deleteProduct(product.id)
    if (deleteError) setError(messageFor(deleteError))
    else setProducts((current) => current.filter((item) => item.id !== product.id))
    setChangingId('')
  }

  return (
    <section className="products-page">
      <header className="products-heading">
        <div><p className="eyebrow">Inventario</p><h1>Productos</h1><p>Cada registro representa una pieza individual de ropa.</p></div>
        <Link className="button button-primary" to="/productos/nuevo"><i className="bi bi-plus-lg" aria-hidden="true" /> Nuevo producto</Link>
      </header>

      <div className="product-filters">
        <label className="search-field field-with-icon"><span className="sr-only">Buscar producto</span><i className="bi bi-search" aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título o código…" /></label>
        <label><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span className="sr-only">Filtrar por tienda</span><select value={storeId} onChange={(event) => setStoreId(event.target.value)}><option value="">Todas las tiendas</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
        <label className="toggle-field"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /><span>Ver desactivados</span></label>
      </div>

      {error && <div className="notice notice-error product-notice" role="alert">{error}<button type="button" onClick={loadProducts}>Reintentar</button></div>}

      {loading ? <div className="product-loading"><div className="spinner" /><p>Cargando productos…</p></div> : products.length ? (
        <div className="products-grid">{products.map((product) => <ProductCard key={product.id} product={product} changing={changingId === product.id} canDelete={profile.role === 'admin'} onStatusChange={changeStatus} onToggleActive={toggleActive} onDelete={removeProduct} />)}</div>
      ) : (
        <div className="products-empty"><span><i className="bi bi-bag" aria-hidden="true" /></span><h2>{showInactive ? 'No hay productos desactivados' : 'Aún no hay productos'}</h2><p>{search || status || storeId ? 'Prueba cambiando los filtros de búsqueda.' : 'Registra la primera pieza para comenzar el inventario.'}</p>{!showInactive && !search && !status && !storeId && <Link className="button button-primary" to="/productos/nuevo"><i className="bi bi-plus-lg" aria-hidden="true" /> Crear primer producto</Link>}</div>
      )}
    </section>
  )
}
