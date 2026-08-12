import { publicSupabase } from './supabase.js'

const PUBLIC_PRODUCT_SELECT = `
  id, code, title, price, description, status, created_at,
  stores(id, name, whatsapp_phone),
  branches(id, name, whatsapp_phone),
  categories(id, name),
  product_names(id, name),
  sizes(id, name),
  product_images(id, storage_path, is_primary, sort_order)
`

async function attachSignedImages(result) {
  if (result.error || !result.data) return result
  const products = Array.isArray(result.data) ? result.data : [result.data]
  const paths = products.flatMap((product) => product.product_images || []).map((image) => image.storage_path)
  if (!paths.length) return result

  const { data, error } = await publicSupabase.storage.from('product-images').createSignedUrls(paths, 1800)
  if (error) return { data: null, error }
  const urlByPath = new Map((data || []).map((item) => [item.path, item.signedUrl]))
  products.forEach((product) => {
    product.product_images = (product.product_images || [])
      .map((image) => ({ ...image, signedUrl: urlByPath.get(image.storage_path) || '' }))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    product.mainImageUrl = product.product_images.find((image) => image.is_primary)?.signedUrl || product.product_images[0]?.signedUrl || ''
  })
  return result
}

export async function listPublicProducts({ search = '', storeId = '', categoryId = '' } = {}) {
  let query = publicSupabase
    .from('products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('active', true)
    .in('status', ['available', 'reserved'])
    .order('created_at', { ascending: false })

  const safeSearch = search.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s-]/g, '')
  if (safeSearch) query = query.or(`title.ilike.%${safeSearch}%,code.ilike.%${safeSearch}%`)
  if (storeId) query = query.eq('store_id', storeId)
  if (categoryId) query = query.eq('category_id', categoryId)
  return attachSignedImages(await query)
}

export async function getPublicProduct(id) {
  return attachSignedImages(await publicSupabase
    .from('products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('id', id)
    .eq('active', true)
    .in('status', ['available', 'reserved'])
    .single())
}

export async function listPublicFilters() {
  const [stores, categories] = await Promise.all([
    publicSupabase.from('stores').select('id, name').eq('active', true).order('name'),
    publicSupabase.from('categories').select('id, name').eq('active', true).order('sort_order').order('name'),
  ])
  return { stores, categories }
}

export function formatPublicPrice(price) {
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 }).format(Number(price))
}

export function getWhatsAppUrl(product) {
  const phone = product.branches?.whatsapp_phone || product.stores?.whatsapp_phone
  if (!phone) return ''
  const location = product.branches?.name ? `${product.stores?.name} - ${product.branches.name}` : product.stores?.name
  const message = [
    'Hola, me interesa este producto:',
    '',
    product.title,
    `Código: ${product.code}`,
    `Precio: ${formatPublicPrice(product.price)}`,
    `Ubicación: ${location}`,
    '',
    '¿Continúa disponible?',
  ].join('\n')
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
