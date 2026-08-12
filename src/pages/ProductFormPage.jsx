import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen.jsx'
import ProductForm from '../components/ProductForm.jsx'
import ProductImages from '../components/ProductImages.jsx'
import { listCatalog } from '../services/catalogs.js'
import { createProduct, getProduct, updateProduct } from '../services/products.js'
import { uploadProductImages } from '../services/productImages.js'
import { useAuth } from '../context/AuthContext.jsx'

const EMPTY_PRODUCT = {
  code: '', product_name_id: '', store_id: '', branch_id: '', category_id: '', size_id: '',
  price: '', description: '', status: 'available',
}

function getErrorMessage(error) {
  if (error?.code === '23505') return 'El código generado ya existe. Inténtalo nuevamente.'
  if (error?.code === '23503') return 'Una de las opciones seleccionadas ya no existe.'
  if (error?.code === '42501') return 'No tienes permiso para guardar un producto en esta ubicación.'
  return error?.message || 'No fue posible guardar el producto.'
}

export default function ProductFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [values, setValues] = useState(EMPTY_PRODUCT)
  const [catalogs, setCatalogs] = useState({ stores: [], branches: [], product_names: [], categories: [], sizes: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(location.state?.imageError || '')
  const [images, setImages] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      const keys = ['stores', 'branches', 'product_names', 'categories', 'sizes']
      const results = await Promise.all(keys.map((key) => listCatalog(key)))
      const failed = results.find((result) => result.error)

      if (failed) {
        if (mounted) { setError(getErrorMessage(failed.error)); setLoading(false) }
        return
      }

      const nextCatalogs = Object.fromEntries(keys.map((key, index) => [key, results[index].data || []]))
      let nextValues = { ...EMPTY_PRODUCT }

      if (editing) {
        const { data, error: productError } = await getProduct(id)
        if (productError) {
          if (mounted) { setError(getErrorMessage(productError)); setLoading(false) }
          return
        }
        nextValues = {
          code: data.code,
          product_name_id: data.product_name_id,
          store_id: data.store_id,
          branch_id: data.branch_id || '',
          category_id: data.category_id,
          size_id: data.size_id || '',
          price: data.price,
          description: data.description || '',
          status: data.status,
        }
        if (mounted) setImages(data.product_images || [])
      } else {
        nextValues.store_id = nextCatalogs.stores.find((item) => item.active)?.id || ''
        nextValues.product_name_id = nextCatalogs.product_names.find((item) => item.active)?.id || ''
        nextValues.category_id = nextCatalogs.categories.find((item) => item.active)?.id || ''
      }

      if (mounted) {
        setCatalogs(nextCatalogs)
        setValues(nextValues)
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [editing, id])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      product_name_id: values.product_name_id,
      store_id: values.store_id,
      branch_id: values.branch_id || null,
      category_id: values.category_id,
      size_id: values.size_id || null,
      price: Number(values.price),
      description: values.description.trim() || null,
      status: values.status,
    }
    const { data: savedProduct, error: saveError } = editing ? await updateProduct(id, payload) : await createProduct(payload)

    if (saveError) {
      setError(getErrorMessage(saveError))
      setSaving(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (pendingFiles.length) {
      const uploadResult = await uploadProductImages(savedProduct.id, pendingFiles, images.length)
      if (uploadResult.error) {
        const uploadedCount = uploadResult.data?.length || 0
        setPendingFiles((current) => current.slice(uploadedCount))
        setSaving(false)
        if (!editing) {
          navigate(`/productos/${savedProduct.id}/editar`, {
            replace: true,
            state: { imageError: 'El producto se guardó, pero algunas fotografías no pudieron subirse. Selecciónalas nuevamente.' },
          })
        } else {
          setError('El producto se guardó, pero algunas fotografías no pudieron subirse. Inténtalo nuevamente.')
          const refreshed = await getProduct(savedProduct.id)
          if (refreshed.data) setImages(refreshed.data.product_images || [])
        }
        return
      }
    }

    navigate('/productos', { replace: true })
  }

  if (loading) return <LoadingScreen message={editing ? 'Cargando producto…' : 'Preparando formulario…'} />

  return (
    <section className="product-form-page">
      <header className="form-page-heading"><button type="button" onClick={() => navigate('/productos')} aria-label="Volver a productos">←</button><div><p className="eyebrow">Inventario</p><h1>{editing ? 'Editar producto' : 'Nuevo producto'}</h1><p>{editing ? `Actualiza la información de ${values.code}.` : 'Registra una pieza. El código se generará al guardar.'}</p></div></header>
      {!error && !catalogs.stores.some((item) => item.active) && <div className="notice notice-warning form-requirement">{profile.role === 'employee' ? 'No tienes una tienda o sucursal activa asignada. Solicita al administrador que revise tus permisos.' : 'Necesitas al menos una tienda activa antes de crear productos.'}</div>}
      {!error && catalogs.stores.some((item) => item.active) && (!catalogs.product_names.some((item) => item.active) || !catalogs.categories.some((item) => item.active)) && <div className="notice notice-warning form-requirement">Necesitas al menos un nombre de producto y una categoría activos antes de crear productos.</div>}
      <ProductForm values={values} catalogs={catalogs} editing={editing} saving={saving} error={error} onChange={setValues} onSubmit={handleSubmit} onCancel={() => navigate('/productos')}>
        <ProductImages productId={id || ''} images={images} pendingFiles={pendingFiles} onImagesChange={setImages} onPendingChange={setPendingFiles} disabled={saving} />
      </ProductForm>
    </section>
  )
}
