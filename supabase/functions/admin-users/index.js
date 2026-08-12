import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function cleanIds(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))]
}

async function syncPermissions(admin, userId, role, storeIds, branchIds) {
  const { error: storeDeleteError } = await admin.from('user_store_permissions').delete().eq('user_id', userId)
  if (storeDeleteError) throw storeDeleteError
  const { error: branchDeleteError } = await admin.from('user_branch_permissions').delete().eq('user_id', userId)
  if (branchDeleteError) throw branchDeleteError

  if (role === 'admin') return

  if (storeIds.length) {
    const { error } = await admin.from('user_store_permissions').insert(storeIds.map((storeId) => ({ user_id: userId, store_id: storeId })))
    if (error) throw error
  }
  if (branchIds.length) {
    const { error } = await admin.from('user_branch_permissions').insert(branchIds.map((branchId) => ({ user_id: userId, branch_id: branchId })))
    if (error) throw error
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
    return json({ error: 'La función no está configurada correctamente.' }, 500)
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Sesión inválida.' }, 401)

  const { data: caller } = await userClient.from('profiles').select('role, active').eq('id', authData.user.id).single()
  if (!caller?.active || caller.role !== 'admin') return json({ error: 'No tienes permisos para administrar usuarios.' }, 403)

  if (request.method === 'GET') {
    const [{ data: authUsers, error: usersError }, { data: profiles, error: profilesError }, { data: storePermissions }, { data: branchPermissions }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from('profiles').select('id, full_name, role, active, created_at, updated_at'),
      admin.from('user_store_permissions').select('user_id, store_id'),
      admin.from('user_branch_permissions').select('user_id, branch_id'),
    ])

    if (usersError || profilesError) return json({ error: 'No se pudo cargar la lista de usuarios.' }, 500)

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))
    const users = authUsers.users.map((authUser) => {
      const profile = profileMap.get(authUser.id)
      return {
        id: authUser.id,
        email: authUser.email || '',
        fullName: profile?.full_name || authUser.email?.split('@')[0] || 'Usuario',
        role: profile?.role || 'employee',
        active: profile?.active === true,
        createdAt: profile?.created_at || authUser.created_at,
        storeIds: (storePermissions || []).filter((permission) => permission.user_id === authUser.id).map((permission) => permission.store_id),
        branchIds: (branchPermissions || []).filter((permission) => permission.user_id === authUser.id).map((permission) => permission.branch_id),
      }
    })

    return json({ users })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }

  if (request.method === 'DELETE') {
    const userId = String(payload.id || '')
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'Usuario inválido.' }, 422)
    if (userId === authData.user.id) return json({ error: 'No puedes eliminar tu propia cuenta.' }, 422)

    const { data: targetProfile } = await admin.from('profiles').select('role, active').eq('id', userId).single()
    if (targetProfile?.role === 'admin' && targetProfile.active) {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true)
      if ((count || 0) <= 1) return json({ error: 'Debe permanecer al menos un administrador activo.' }, 422)
    }

    const { error: reassignError } = await admin.from('products').update({ created_by: authData.user.id }).eq('created_by', userId)
    if (reassignError) return json({ error: 'No se pudieron reasignar los productos de este usuario.' }, 500)
    const { error: imageReassignError } = await admin.from('product_images').update({ uploaded_by: authData.user.id }).eq('uploaded_by', userId)
    if (imageReassignError) return json({ error: 'No se pudieron reasignar las fotografías de este usuario.' }, 500)

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) return json({ error: `No se pudo eliminar el usuario: ${deleteError.message}` }, 400)
    return json({ deleted: true })
  }

  const fullName = String(payload.fullName || '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const role = payload.role === 'admin' ? 'admin' : 'employee'
  const active = payload.active !== false
  const storeIds = cleanIds(payload.storeIds)
  const branchIds = cleanIds(payload.branchIds)

  if (fullName.length < 2 || !email.includes('@')) return json({ error: 'Nombre o correo inválidos.' }, 422)

  if (request.method === 'POST') {
    if (password.length < 8) return json({ error: 'La contraseña temporal debe tener al menos 8 caracteres.' }, 422)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createError) return json({ error: createError.message }, 400)

    try {
      const { error: profileError } = await admin.from('profiles').update({ full_name: fullName, role, active }).eq('id', created.user.id)
      if (profileError) throw profileError
      await syncPermissions(admin, created.user.id, role, storeIds, branchIds)
    } catch {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'No se pudo completar el perfil y sus permisos.' }, 500)
    }

    return json({ user: { id: created.user.id } }, 201)
  }

  const userId = String(payload.id || '')
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'Usuario inválido.' }, 422)
  if (userId === authData.user.id && (!active || role !== 'admin')) {
    return json({ error: 'No puedes desactivar tu propia cuenta ni quitarte el rol administrador.' }, 422)
  }

  const { data: currentProfile } = await admin.from('profiles').select('role, active').eq('id', userId).single()
  if (currentProfile?.role === 'admin' && currentProfile.active && (!active || role !== 'admin')) {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true)
    if ((count || 0) <= 1) return json({ error: 'Debe permanecer al menos un administrador activo.' }, 422)
  }

  const authChanges = { email, user_metadata: { full_name: fullName } }
  if (password) {
    if (password.length < 8) return json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, 422)
    authChanges.password = password
  }
  const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, authChanges)
  if (updateAuthError) return json({ error: updateAuthError.message }, 400)

  const { error: profileError } = await admin.from('profiles').update({ full_name: fullName, role, active }).eq('id', userId)
  if (profileError) return json({ error: 'No se pudo actualizar el perfil.' }, 500)

  try {
    await syncPermissions(admin, userId, role, storeIds, branchIds)
  } catch {
    return json({ error: 'El perfil se actualizó, pero no fue posible guardar sus permisos. Inténtalo nuevamente.' }, 500)
  }

  return json({ user: { id: userId } })
})
