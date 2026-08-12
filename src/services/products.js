import { supabase } from './supabase.js'

const PRODUCT_SELECT = `
  id, code, title, product_name_id, store_id, branch_id, category_id, size_id,
  price, description, status, created_by, created_at, updated_at, sold_at, active,
  stores(id, name, code_prefix),
  branches(id, name),
  categories(id, name),
  product_names(id, name),
  sizes(id, name),
  product_images(id, storage_path, is_primary, sort_order)
`

async function attachImageUrls(result) {
  if (result.error || !result.data) return result
  const products = Array.isArray(result.data) ? result.data : [result.data]
  const paths = products.flatMap((product) => product.product_images || []).map((image) => image.storage_path)
  if (!paths.length) return result

  const { data: signed, error } = await supabase.storage.from('product-images').createSignedUrls(paths, 3600)
  if (error) return result
  const urlByPath = new Map((signed || []).map((item) => [item.path, item.signedUrl]))

  products.forEach((product) => {
    product.product_images = (product.product_images || [])
      .map((image) => ({ ...image, signedUrl: urlByPath.get(image.storage_path) || '' }))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    product.mainImageUrl = product.product_images.find((image) => image.is_primary)?.signedUrl || product.product_images[0]?.signedUrl || ''
  })
  return result
}

export async function listProducts({ search = '', status = '', storeId = '', showInactive = false } = {}) {
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('active', showInactive ? false : true)
    .order('created_at', { ascending: false })

  if (search.trim()) {
    const safeSearch = search.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s-]/g, '')
    if (safeSearch) query = query.or(`title.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%`)
  }
  if (status) query = query.eq('status', status)
  if (storeId) query = query.eq('store_id', storeId)

  return attachImageUrls(await query)
}

export async function getProduct(id) {
  return attachImageUrls(await supabase.from('products').select(PRODUCT_SELECT).eq('id', id).single())
}

export async function createProduct(values) {
  return attachImageUrls(await supabase.from('products').insert(values).select(PRODUCT_SELECT).single())
}

export async function updateProduct(id, values) {
  return attachImageUrls(await supabase.from('products').update(values).eq('id', id).select(PRODUCT_SELECT).single())
}

export async function updateProductStatus(id, status) {
  return updateProduct(id, { status })
}

export async function setProductActive(id, active) {
  return updateProduct(id, { active })
}

export async function deleteProduct(id) {
  const { data, error } = await supabase.functions.invoke('admin-delete', { body: { action: 'product', id } })
  if (error) return { data: null, error }
  if (data?.error) return { data: null, error: new Error(data.error) }
  return { data, error: null }
}
