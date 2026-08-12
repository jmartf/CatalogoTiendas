import { useCallback, useEffect, useMemo, useState } from 'react'
import UserFormModal from '../components/UserFormModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { listCatalog } from '../services/catalogs.js'
import { createUser, deleteUser, listUsers, updateUser } from '../services/users.js'

function assignmentsFor(user, stores, branches) {
  if (user.role === 'admin') return 'Todas las tiendas'
  const names = [
    ...stores.filter((store) => user.storeIds.includes(store.id)).map((store) => `${store.name} · completa`),
    ...branches.filter((branch) => user.branchIds.includes(branch.id)).map((branch) => `${branch.stores?.name || 'Tienda'} · ${branch.name}`),
  ]
  return names.length ? names.join(', ') : 'Sin ubicaciones asignadas'
}

export default function Users() {
  const { session } = useAuth()
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState([])
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formUser, setFormUser] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingId, setChangingId] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setPageError('')
    const [usersResult, storesResult, branchesResult] = await Promise.all([listUsers(), listCatalog('stores'), listCatalog('branches')])
    if (usersResult.error) setPageError(usersResult.error.message)
    else setUsers(usersResult.data.users || [])
    if (storesResult.error || branchesResult.error) setPageError('No fue posible cargar las ubicaciones disponibles.')
    else {
      setStores(storesResult.data || [])
      setBranches(branchesResult.data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => user.fullName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
  }, [users, search])

  function openForm(user = null) {
    setFormUser(user)
    setFormError('')
    setFormOpen(true)
  }

  async function saveUser(values) {
    setSaving(true)
    setFormError('')
    const result = values.id ? await updateUser(values) : await createUser(values)
    if (result.error) {
      setFormError(result.error.message)
      setSaving(false)
      return
    }
    setFormOpen(false)
    setSaving(false)
    await loadData()
  }

  async function toggleActive(user) {
    setChangingId(user.id)
    setPageError('')
    const result = await updateUser({ ...user, password: '', active: !user.active })
    if (result.error) setPageError(result.error.message)
    else setUsers((current) => current.map((item) => item.id === user.id ? { ...item, active: !item.active } : item))
    setChangingId('')
  }

  async function removeUser(user) {
    if (!window.confirm(`¿Eliminar definitivamente a "${user.fullName}"? También perderá su acceso al sistema. Esta acción no se puede deshacer.`)) return
    setChangingId(user.id)
    setPageError('')
    const result = await deleteUser(user.id)
    if (result.error) setPageError(result.error.message)
    else setUsers((current) => current.filter((item) => item.id !== user.id))
    setChangingId('')
  }

  return (
    <section className="users-page">
      <header className="users-heading"><div><p className="eyebrow">Administración</p><h1>Usuarios</h1><p>Crea empleados y controla exactamente dónde pueden trabajar.</p></div><button className="button button-primary" type="button" onClick={() => openForm()}><i className="bi bi-person-plus" aria-hidden="true" /> Nuevo usuario</button></header>

      <div className="users-toolbar"><label className="search-field"><span className="sr-only">Buscar usuario</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o correo…" /></label><span>{users.length} usuarios</span></div>
      {pageError && <div className="notice notice-error product-notice" role="alert">{pageError}<button type="button" onClick={loadData}>Reintentar</button></div>}

      {loading ? <div className="product-loading"><div className="spinner" /><p>Cargando usuarios…</p></div> : filteredUsers.length ? (
        <div className="users-list">{filteredUsers.map((user) => {
          const isSelf = user.id === session.user.id
          return (
            <article className={`user-row ${user.active ? '' : 'inactive'}`} key={user.id}>
              <span className="user-avatar">{user.fullName.slice(0, 1).toUpperCase()}</span>
              <div className="user-identity"><strong>{user.fullName}{isSelf && <small> Tú</small>}</strong><span>{user.email}</span></div>
              <span className={`role-badge role-${user.role}`}>{user.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
              <div className="user-assignments"><small>Acceso</small><span>{assignmentsFor(user, stores, branches)}</span></div>
              <span className={`record-status ${user.active ? 'active' : ''}`}>{user.active ? 'Activo' : 'Inactivo'}</span>
              <div className="row-actions"><button type="button" onClick={() => openForm(user)}><i className="bi bi-pencil" aria-hidden="true" /> Editar</button><button type="button" className={user.active ? 'danger-action' : 'success-action'} onClick={() => toggleActive(user)} disabled={isSelf || changingId === user.id}><i className={`bi ${user.active ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" /> {changingId === user.id ? 'Guardando…' : user.active ? 'Desactivar' : 'Activar'}</button><button type="button" className="delete-action" onClick={() => removeUser(user)} disabled={isSelf || changingId === user.id}><i className="bi bi-trash3" aria-hidden="true" /> Eliminar</button></div>
            </article>
          )
        })}</div>
      ) : <div className="products-empty"><span>US</span><h2>No encontramos usuarios</h2><p>Prueba con otro nombre o correo.</p></div>}

      {formOpen && <UserFormModal user={formUser} currentUserId={session.user.id} stores={stores} branches={branches} saving={saving} error={formError} onClose={() => setFormOpen(false)} onSave={saveUser} />}
    </section>
  )
}
