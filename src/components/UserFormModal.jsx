import { useEffect, useMemo, useRef, useState } from 'react'

export default function UserFormModal({ user, currentUserId, stores, branches, saving, error, onClose, onSave }) {
  const dialogRef = useRef(null)
  const editing = Boolean(user)
  const isSelf = user?.id === currentUserId
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role || 'employee')
  const [active, setActive] = useState(user?.active ?? true)
  const [storeIds, setStoreIds] = useState(user?.storeIds || [])
  const [branchIds, setBranchIds] = useState(user?.branchIds || [])

  useEffect(() => { dialogRef.current?.showModal() }, [])

  const branchesByStore = useMemo(
    () => stores.map((store) => ({ store, branches: branches.filter((branch) => branch.store_id === store.id) })),
    [stores, branches],
  )

  function toggleStore(storeId) {
    const selected = storeIds.includes(storeId)
    setStoreIds(selected ? storeIds.filter((id) => id !== storeId) : [...storeIds, storeId])
    if (!selected) {
      const branchIdsForStore = branches.filter((branch) => branch.store_id === storeId).map((branch) => branch.id)
      setBranchIds((current) => current.filter((id) => !branchIdsForStore.includes(id)))
    }
  }

  function toggleBranch(branchId) {
    setBranchIds(branchIds.includes(branchId) ? branchIds.filter((id) => id !== branchId) : [...branchIds, branchId])
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave({
      id: user?.id,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      active,
      storeIds: role === 'employee' ? storeIds : [],
      branchIds: role === 'employee' ? branchIds : [],
    })
  }

  return (
    <dialog className="user-dialog" ref={dialogRef} onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}>
      <form className="user-form" onSubmit={handleSubmit}>
        <header><div><p className="eyebrow">{editing ? 'Editar cuenta' : 'Nueva cuenta'}</p><h2>{editing ? user.fullName : 'Crear usuario'}</h2></div><button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Cerrar"><i className="bi bi-x-lg" aria-hidden="true" /></button></header>
        {error && <div className="notice notice-error" role="alert">{error}</div>}

        <div className="user-form-grid">
          <label className="form-field"><span>Nombre completo <em>*</em></span><input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} minLength="2" maxLength="120" required disabled={saving} /></label>
          <label className="form-field"><span>Correo electrónico <em>*</em></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={saving} /></label>
          <label className="form-field"><span>{editing ? 'Nueva contraseña' : 'Contraseña temporal'} {!editing && <em>*</em>}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" required={!editing} placeholder={editing ? 'Dejar vacía para conservarla' : 'Mínimo 8 caracteres'} autoComplete="new-password" disabled={saving} /></label>
          <label className="form-field"><span>Rol <em>*</em></span><select value={role} onChange={(event) => setRole(event.target.value)} disabled={saving || isSelf}><option value="employee">Empleado</option><option value="admin">Administrador</option></select>{isSelf && <small>No puedes quitarte tu propio rol administrador.</small>}</label>
        </div>

        <label className="account-toggle"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={saving || isSelf} /><span><strong>Usuario activo</strong><small>Puede iniciar sesión y utilizar los permisos asignados.</small></span></label>

        {role === 'employee' && (
          <section className="permissions-section">
            <div><h3>Tiendas y sucursales autorizadas</h3><p>Seleccionar una tienda concede acceso a todas sus sucursales. Para acceso limitado, selecciona sucursales individuales.</p></div>
            <div className="permission-groups">
              {branchesByStore.map(({ store, branches: storeBranches }) => {
                const wholeStore = storeIds.includes(store.id)
                return (
                  <div className="permission-group" key={store.id}>
                    <label className="permission-store"><input type="checkbox" checked={wholeStore} onChange={() => toggleStore(store.id)} disabled={saving} /><span><strong>{store.name}</strong><small>Toda la tienda</small></span></label>
                    {storeBranches.length > 0 && <div className="permission-branches">{storeBranches.map((branch) => <label key={branch.id}><input type="checkbox" checked={wholeStore || branchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} disabled={saving || wholeStore} /><span>{branch.name}</span></label>)}</div>}
                  </div>
                )
              })}
              {!stores.length && <p className="muted-copy">No existen tiendas disponibles. Créelas primero desde Catálogos.</p>}
            </div>
          </section>
        )}

        <footer><button className="button button-ghost" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="button button-primary" type="submit" disabled={saving}><i className={`bi ${editing ? 'bi-check-lg' : 'bi-person-plus'}`} aria-hidden="true" /> {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}</button></footer>
      </form>
    </dialog>
  )
}
