import { supabase } from './supabase.js'

const BUCKET = 'product-images'

async function addSignedUrls(images) {
  if (!images.length) return []
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(images.map((image) => image.storage_path), 3600)
  if (error) throw error
  const urlByPath = new Map((data || []).map((item) => [item.path, item.signedUrl]))
  return images.map((image) => ({ ...image, signedUrl: urlByPath.get(image.storage_path) || '' }))
}

export async function listProductImages(productId) {
  const { data, error } = await supabase
    .from('product_images')
    .select('id, product_id, storage_path, is_primary, sort_order, uploaded_by, created_at')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('sort_order')
  if (error) return { data: null, error }
  try {
    return { data: await addSignedUrls(data || []), error: null }
  } catch (signError) {
    return { data: null, error: signError }
  }
}

export async function uploadProductImages(productId, files, existingCount = 0) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { data: null, error: authError || new Error('Sesión inválida.') }

  const created = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const path = `${productId}/${crypto.randomUUID()}.webp`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: 'image/webp',
      upsert: false,
    })
    if (uploadError) return { data: created, error: uploadError }

    const { data: metadata, error: metadataError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        storage_path: path,
        is_primary: existingCount === 0 && index === 0,
        sort_order: existingCount + index,
        uploaded_by: authData.user.id,
      })
      .select('id, product_id, storage_path, is_primary, sort_order, uploaded_by, created_at')
      .single()

    if (metadataError) {
      await supabase.storage.from(BUCKET).remove([path])
      return { data: created, error: metadataError }
    }
    created.push(metadata)
  }

  try {
    return { data: await addSignedUrls(created), error: null }
  } catch (signError) {
    return { data: created, error: signError }
  }
}

export async function setPrimaryProductImage(productId, imageId) {
  const { error: clearError } = await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId)
  if (clearError) return { error: clearError }
  return supabase.from('product_images').update({ is_primary: true }).eq('id', imageId).eq('product_id', productId)
}

export async function deleteProductImage(image, remainingImages) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([image.storage_path])
  if (storageError) return { error: storageError }
  const { error: deleteError } = await supabase.from('product_images').delete().eq('id', image.id)
  if (deleteError) return { error: deleteError }

  if (image.is_primary && remainingImages.length) {
    return setPrimaryProductImage(image.product_id, remainingImages[0].id)
  }
  return { error: null }
}
