import { useEffect, useRef, useState } from 'react'
import { CATALOG_TYPES } from '../services/catalogs.js'

export default function CatalogFormModal({ type, item, stores, saving, error, onClose, onSave }) {
  const dialogRef = useRef(null)
  const isEditing = Boolean(item)
  const isStore = type === 'stores'
  const isBranch = type === 'branches'
  const hasSortOrder = !isStore && !isBranch
  const [name, setName] = useState(item?.name || '')
  const [codePrefix, setCodePrefix] = useState(item?.code_prefix || '')
  const [storeId, setStoreId] = useState(item?.store_id || stores[0]?.id || '')
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0)
  const [whatsappPhone, setWhatsappPhone] = useState(item?.whatsapp_phone || '')

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    const values = { name: name.trim() }
    if (isStore || isBranch) values.code_prefix = codePrefix.trim().toUpperCase()
    if (isBranch) values.store_id = storeId
    if (isStore || isBranch) values.whatsapp_phone = whatsappPhone || null
    if (hasSortOrder) values.sort_order = Number(sortOrder) || 0
    onSave(values)
  }

  return (
    <dialog className="catalog-dialog" ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}>
      <form className="catalog-form" onSubmit={handleSubmit}>
        <header>
          <div>
            <p className="eyebrow">{isEditing ? 'Editar registro' : 'Nuevo registro'}</p>
            <h2>{isEditing ? `Editar ${CATALOG_TYPES[type].singular}` : `Nueva ${CATALOG_TYPES[type].singular}`}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Cerrar"><i className="bi bi-x-lg" aria-hidden="true" /></button>
        </header>

        {error && <div className="notice notice-error" role="alert">{error}</div>}

        <label>
          Nombre
          <input autoFocus type="text" value={name} onChange={(event) => setName(event.target.value)} minLength="1" maxLength="120" required disabled={saving} />
        </label>

        {(isStore || isBranch) && (
          <label>
            Prefijo del código
            <input type="text" value={codePrefix} onChange={(event) => setCodePrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} minLength="2" maxLength="8" pattern="[A-Z0-9]{2,8}" placeholder={isBranch ? 'JAZ' : 'JUM'} required disabled={saving} />
            <small>Entre 2 y 8 letras o números, único entre tiendas y sucursales. {isBranch ? 'Ejemplo: JAZ-00001.' : 'Se usa cuando el producto no tiene sucursal.'}</small>
          </label>
        )}

        {isBranch && (
          <label>
            Tienda
            <select value={storeId} onChange={(event) => setStoreId(event.target.value)} required disabled={saving || isEditing}>
              <option value="">Selecciona una tienda</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}{store.active ? '' : ' (inactiva)'}</option>)}
            </select>
            {isEditing && <small>La tienda de una sucursal no se cambia para proteger su historial.</small>}
          </label>
        )}

        {(isStore || isBranch) && (
          <label>
            WhatsApp {isBranch && <small>(opcional)</small>}
            <input type="tel" inputMode="numeric" value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value.replace(/\D/g, '').slice(0, 15))} minLength="8" maxLength="15" placeholder="50255555555" disabled={saving} />
            <small>Incluye código de país, solo números y sin el signo +. {isBranch ? 'Si queda vacío, se usará el WhatsApp de la tienda.' : 'Ejemplo Guatemala: 502 seguido del número.'}</small>
          </label>
        )}

        {hasSortOrder && (
          <label>
            Orden
            <input type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} min="0" step="1" disabled={saving} />
            <small>Los números menores aparecen primero en los combobox.</small>
          </label>
        )}

        <footer>
          <button className="button button-ghost" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="button button-primary" type="submit" disabled={saving}><i className="bi bi-check-lg" aria-hidden="true" /> {saving ? 'Guardando…' : 'Guardar'}</button>
        </footer>
      </form>
    </dialog>
  )
}
