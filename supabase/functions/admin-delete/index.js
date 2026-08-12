import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) return json({ error: 'La función no está configurada correctamente.' }, 500)

  let payload
  try { payload = await request.json() } catch { return json({ error: 'Solicitud inválida.' }, 400) }
  const id = String(payload.id || '')
  const action = payload.action === 'store' ? 'store' : payload.action === 'product' ? 'product' : ''
  if (!action || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Solicitud inválida.' }, 422)

  const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Sesión inválida.' }, 401)

  const functionName = action === 'store' ? 'admin_delete_store' : 'admin_delete_product'
  const argument = action === 'store' ? { target_store_id: id } : { target_product_id: id }
  const { data: paths, error: deleteError } = await userClient.rpc(functionName, argument)
  if (deleteError) return json({ error: deleteError.message }, deleteError.code === '42501' ? 403 : 400)

  if (paths?.length) {
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: storageError } = await admin.storage.from('product-images').remove(paths)
    if (storageError) return json({ deleted: true, warning: 'El registro se eliminó, pero algunas imágenes no pudieron limpiarse.' })
  }
  return json({ deleted: true })
})
