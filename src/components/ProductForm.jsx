import SelectField from './SelectField.jsx'

const STATUS_OPTIONS = [
  { id: 'available', name: 'Disponible', active: true },
  { id: 'reserved', name: 'Reservado', active: true },
  { id: 'sold', name: 'Vendido', active: true },
]

function availableOptions(items, selectedId) {
  return items.filter((item) => item.active || item.id === selectedId)
}

export default function ProductForm({ values, catalogs, editing, saving, error, children, onChange, onSubmit, onCancel }) {
  const branches = catalogs.branches.filter((branch) => branch.store_id === values.store_id && (branch.active || branch.id === values.branch_id))

  function update(field) {
    return (event) => {
      const nextValue = event.target.value
      if (field === 'store_id') onChange({ ...values, store_id: nextValue, branch_id: '' })
      else onChange({ ...values, [field]: nextValue })
    }
  }

  return (
    <form className="product-form" onSubmit={onSubmit}>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <section className="form-section">
        <div className="form-section-heading"><span>01</span><div><h2>Información principal</h2><p>Los datos esenciales para identificar la prenda.</p></div></div>
        <div className="form-grid">
          {editing && <label className="form-field"><span>Código</span><input value={values.code} readOnly disabled /><small>Generado automáticamente por PostgreSQL.</small></label>}
          <SelectField label="Nombre del producto" value={values.product_name_id} onChange={update('product_name_id')} options={availableOptions(catalogs.product_names, values.product_name_id)} placeholder="Seleccionar prenda" required disabled={saving} hint="El administrador gestiona estas opciones desde Catálogos." />
          <SelectField label="Estado" value={values.status} onChange={update('status')} options={STATUS_OPTIONS} allowEmpty={false} required disabled={saving} />
          <label className="form-field"><span>Precio <em aria-hidden="true">*</em></span><div className="price-input"><span>₡</span><input type="number" value={values.price} onChange={update('price')} min="0" step="0.01" inputMode="decimal" placeholder="0.00" required disabled={saving} /></div></label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-heading"><span>02</span><div><h2>Ubicación y clasificación</h2><p>Selecciona opciones administradas desde los catálogos.</p></div></div>
        <div className="form-grid">
          <SelectField label="Tienda" value={values.store_id} onChange={update('store_id')} options={availableOptions(catalogs.stores, values.store_id)} required disabled={saving} />
          <SelectField label="Sucursal" value={values.branch_id} onChange={update('branch_id')} options={branches} placeholder="Sin sucursal" disabled={saving || !values.store_id} hint="Opcional si la pieza pertenece a la tienda completa." />
          <SelectField label="Categoría" value={values.category_id} onChange={update('category_id')} options={availableOptions(catalogs.categories, values.category_id)} required disabled={saving} />
          <SelectField label="Talla" value={values.size_id} onChange={update('size_id')} options={availableOptions(catalogs.sizes, values.size_id)} placeholder="Sin talla" disabled={saving} />
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-heading"><span>03</span><div><h2>Descripción</h2><p>Agrega detalles útiles sobre la pieza.</p></div></div>
        <label className="form-field"><span>Descripción</span><textarea value={values.description} onChange={update('description')} rows="4" maxLength="2000" placeholder="Material, condición, estilo u otros detalles…" disabled={saving} /></label>
      </section>

      {children}

      <footer className="product-form-footer"><button className="button button-ghost" type="button" onClick={onCancel} disabled={saving}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}><i className="bi bi-check-lg" aria-hidden="true" /> {saving ? 'Guardando producto…' : editing ? 'Guardar cambios' : 'Guardar producto'}</button></footer>
    </form>
  )
}
