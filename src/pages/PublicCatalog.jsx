import { useCallback, useEffect, useState } from 'react'
import PublicProductCard from '../components/PublicProductCard.jsx'
import PublicHeader, { StoreBrands } from '../components/PublicHeader.jsx'
import { listPublicFilters, listPublicProducts } from '../services/publicCatalog.js'

export default function PublicCatalog() {
  const [products, setProducts] = useState([])
  const [stores, setStores] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [storeId, setStoreId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    listPublicFilters().then(({ stores: storeResult, categories: categoryResult }) => {
      setStores(storeResult.data || [])
      setCategories(categoryResult.data || [])
    })
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await listPublicProducts({ search: debouncedSearch, storeId, categoryId })
    if (loadError) setError('No fue posible cargar el catálogo. Inténtalo nuevamente.')
    else setProducts(data || [])
    setLoading(false)
  }, [debouncedSearch, storeId, categoryId])

  useEffect(() => { loadProducts() }, [loadProducts])

  return (
    <div className="public-catalog-page">
      <PublicHeader />
      <main>
        <section className="public-hero">
          <div className="public-hero-copy"><p className="eyebrow"><i className="bi bi-bag-heart" aria-hidden="true" /> Catálogo en línea</p><h1>Tu próxima prenda está aquí.</h1><p>Explora y consulta por WhatsApp.</p></div>
        </section>
        <section className="public-controls" aria-label="Filtros del catálogo">
          <label className="public-search field-with-icon"><span className="sr-only">Buscar</span><i className="bi bi-search" aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar prendas…" /></label>
          <label><span className="sr-only">Tienda</span><select value={storeId} onChange={(event) => setStoreId(event.target.value)}><option value="">Todas las tiendas</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
          <label><span className="sr-only">Categoría</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </section>
        <div className="public-result-count">{loading ? 'Buscando piezas…' : `${products.length} ${products.length === 1 ? 'pieza' : 'piezas'}`}</div>
        {error && <div className="notice notice-error public-error">{error}<button type="button" onClick={loadProducts}>Reintentar</button></div>}
        {loading ? <div className="public-loading"><div className="spinner" /></div> : products.length ? <section className="public-grid">{products.map((product) => <PublicProductCard key={product.id} product={product} />)}</section> : <section className="public-empty"><span>CT</span><h2>No encontramos prendas</h2><p>Prueba cambiando los filtros o vuelve pronto para descubrir novedades.</p></section>}
      </main>
      <footer className="public-footer"><StoreBrands compact /><p>La disponibilidad final se confirma directamente con cada tienda.</p></footer>
    </div>
  )
}
