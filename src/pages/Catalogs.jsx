import { useCallback, useEffect, useMemo, useState } from 'react'
import CatalogFormModal from '../components/CatalogFormModal.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { CATALOG_TYPES, createCatalogItem, deleteCatalogItem, listCatalog, setCatalogItemActive, updateCatalogItem } from '../services/catalogs.js'

const TYPE_ORDER = ['stores', 'branches', 'product_names', 'categories', 'sizes']

function getErrorMessage(error) {
  if (error?.code === '23505') return 'Ya existe un registro con ese nombre o prefijo.'
  if (error?.code === '23503') return 'No se puede eliminar porque este registro está siendo utilizado. Desactívalo para conservar el historial o elimina primero los productos, sucursales o asignaciones relacionadas.'
  if (error?.code === '42501') return 'Supabase rechazó la operación por permisos. Verifica que el perfil sea administrador activo.'
  return error?.message || 'No fue posible completar la operación.'
}

export default function Catalogs() {
  const [type, setType] = useState('stores')
  const [items, setItems] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formItem, setFormItem] = useState(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingId, setChangingId] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setPageError('')
    const requests = [listCatalog(type)]
    if (type === 'branches') requests.push(listCatalog('stores'))
    const [itemsResult, storesResult] = await Promise.all(requests)

    if (itemsResult.error) setPageError(getErrorMessage(itemsResult.error))
    else setItems(itemsResult.data || [])

    if (storesResult?.error) setPageError(getErrorMessage(storesResult.error))
    else if (storesResult) setStores(storesResult.data || [])
    setLoading(false)
  }, [type])

  useEffect(() => { loadData() }, [loadData])

  const visibleItems = useMemo(
    () => showInactive ? items : items.filter((item) => item.active),
    [items, showInactive],
  )

  function changeType(nextType) {
    setType(nextType)
    setShowInactive(false)
    setFormOpen(false)
  }

  function openForm(item) {
    setFormItem(item)
    setFormError('')
    setFormOpen(true)
  }

  async function handleSave(values) {
    setSaving(true)
    setFormError('')
    const result = formItem
      ? await updateCatalogItem(type, formItem.id, values)
      : await createCatalogItem(type, values)

    if (result.error) {
      setFormError(getErrorMessage(result.error))
      setSaving(false)
      return
    }

    setFormOpen(false)
    setSaving(false)
    await loadData()
  }

  async function toggleActive(item) {
    setChangingId(item.id)
    setPageError('')
    const { error } = await setCatalogItemActive(type, item.id, !item.active)
    if (error) setPageError(getErrorMessage(error))
    else setItems((current) => current.map((row) => row.id === item.id ? { ...row, active: !row.active } : row))
    setChangingId('')
  }

  async function removeItem(item) {
    const warning = type === 'stores' ? ' También se eliminarán definitivamente todas sus sucursales, productos, fotografías y asignaciones.' : ''
    const confirmed = window.confirm(`¿Eliminar definitivamente "${item.name}"?${warning} Esta acción no se puede deshacer.`)
    if (!confirmed) return
    setChangingId(item.id)
    setPageError('')
    const { error } = await deleteCatalogItem(type, item.id)
    if (error) setPageError(getErrorMessage(error))
    else setItems((current) => current.filter((row) => row.id !== item.id))
    setChangingId('')
  }

  return (
    <section className="catalogs-page">
      <header className="catalogs-heading">
        <div><p className="eyebrow">Administración</p><h1>Catálogos</h1><p>Gestiona las opciones que utilizarán los empleados al registrar productos.</p></div>
        <button className="button button-primary" type="button" onClick={() => openForm(null)} disabled={type === 'branches' && stores.length === 0}><i className="bi bi-plus-lg" aria-hidden="true" /> Nueva {CATALOG_TYPES[type].singular}</button>
      </header>

      <div className="catalog-tabs" role="tablist" aria-label="Tipos de catálogo">
        {TYPE_ORDER.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={type === key} className={type === key ? 'active' : ''} onClick={() => changeType(key)}>{CATALOG_TYPES[key].label}</button>
        ))}
      </div>

      <div className="catalog-panel">
        <div className="catalog-toolbar">
          <div><h2>{CATALOG_TYPES[type].label}</h2><p>{items.filter((item) => item.active).length} activos · {items.filter((item) => !item.active).length} inactivos</p></div>
          <label className="toggle-field"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /><span>Mostrar inactivos</span></label>
        </div>

        {pageError && <div className="notice notice-error catalog-notice" role="alert">{pageError}<button type="button" onClick={loadData}>Reintentar</button></div>}
        {loading ? <LoadingScreen message={`Cargando ${CATALOG_TYPES[type].label.toLowerCase()}…`} /> : (
          visibleItems.length ? (
            <div className="catalog-list">
              {visibleItems.map((item) => (
                <article className={`catalog-row ${item.active ? '' : 'inactive'}`} key={item.id}>
                  <div className="catalog-main">
                    <span className="catalog-monogram">{item.name.slice(0, 2).toUpperCase()}</span>
                    <div><strong>{item.name}</strong><small>{type === 'stores' ? `Prefijo general: ${item.code_prefix}${item.whatsapp_phone ? ` · WhatsApp: +${item.whatsapp_phone}` : ' · Sin WhatsApp'}` : type === 'branches' ? `${item.stores?.name || 'Sin tienda'} · Prefijo: ${item.code_prefix || 'sin configurar'}${item.whatsapp_phone ? ` · WhatsApp: +${item.whatsapp_phone}` : ' · WhatsApp de tienda'}` : `Orden: ${item.sort_order}`}</small></div>
                  </div>
                  <span className={`record-status ${item.active ? 'active' : ''}`}>{item.active ? 'Activo' : 'Inactivo'}</span>
                  <div className="row-actions">
                    <button type="button" onClick={() => openForm(item)}><i className="bi bi-pencil" aria-hidden="true" /> Editar</button>
                    <button type="button" className={item.active ? 'danger-action' : 'success-action'} onClick={() => toggleActive(item)} disabled={changingId === item.id}><i className={`bi ${item.active ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" /> {changingId === item.id ? 'Guardando…' : item.active ? 'Desactivar' : 'Activar'}</button>
                    <button type="button" className="delete-action" onClick={() => removeItem(item)} disabled={changingId === item.id}><i className="bi bi-trash3" aria-hidden="true" /> Eliminar</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="empty-state"><span><i className="bi bi-folder-plus" aria-hidden="true" /></span><h3>No hay registros {showInactive ? '' : 'activos'}</h3><p>{type === 'branches' && stores.length === 0 ? 'Primero crea una tienda para poder asignarle sucursales.' : 'Crea el primero para comenzar a alimentar los combobox de productos.'}</p><button className="button button-primary" type="button" onClick={() => openForm(null)} disabled={type === 'branches' && stores.length === 0}><i className="bi bi-plus-lg" aria-hidden="true" /> Crear {CATALOG_TYPES[type].singular}</button></div>
        )}
      </div>

      {formOpen && <CatalogFormModal type={type} item={formItem} stores={stores} saving={saving} error={formError} onClose={() => setFormOpen(false)} onSave={handleSave} />}
    </section>
  )
}
