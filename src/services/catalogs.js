import { supabase } from './supabase.js'

export const CATALOG_TYPES = {
  stores: { table: 'stores', label: 'Tiendas', singular: 'tienda' },
  branches: { table: 'branches', label: 'Sucursales', singular: 'sucursal' },
  categories: { table: 'categories', label: 'Categorías', singular: 'categoría' },
  product_names: { table: 'product_names', label: 'Nombres de producto', singular: 'nombre de producto' },
  sizes: { table: 'sizes', label: 'Tallas', singular: 'talla' },
}

function getCatalog(type) {
  const catalog = CATALOG_TYPES[type]
  if (!catalog) throw new Error('Catálogo no permitido.')
  return catalog
}

export async function listCatalog(type) {
  const { table } = getCatalog(type)
  let query = supabase.from(table).select(type === 'branches' ? '*, stores(id, name)' : '*')

  if (type === 'branches') query = query.order('name').order('created_at')
  else if (type === 'stores') query = query.order('name')
  else query = query.order('sort_order').order('name')

  return query
}

export async function createCatalogItem(type, values) {
  const { table } = getCatalog(type)
  return supabase.from(table).insert(values).select(type === 'branches' ? '*, stores(id, name)' : '*').single()
}

export async function updateCatalogItem(type, id, values) {
  const { table } = getCatalog(type)
  return supabase.from(table).update(values).eq('id', id).select(type === 'branches' ? '*, stores(id, name)' : '*').single()
}

export async function setCatalogItemActive(type, id, active) {
  return updateCatalogItem(type, id, { active })
}

export async function deleteCatalogItem(type, id) {
  if (type === 'stores') {
    const { data, error } = await supabase.functions.invoke('admin-delete', { body: { action: 'store', id } })
    if (error) return { data: null, error }
    if (data?.error) return { data: null, error: new Error(data.error) }
    return { data, error: null }
  }
  const { table } = getCatalog(type)
  return supabase.from(table).delete().eq('id', id)
}
