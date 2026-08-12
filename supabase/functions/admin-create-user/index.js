import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

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
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Sesión inválida.' }, 401)

  const { data: caller } = await userClient
    .from('profiles')
    .select('role, active')
    .eq('id', authData.user.id)
    .single()

  if (!caller?.active || caller.role !== 'admin') {
    return json({ error: 'No tienes permisos para crear usuarios.' }, 403)
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }

  const fullName = String(payload.fullName || '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const role = payload.role === 'admin' ? 'admin' : 'employee'

  if (fullName.length < 2 || !email.includes('@') || password.length < 8) {
    return json({ error: 'Nombre, correo o contraseña temporal inválidos.' }, 422)
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError) return json({ error: createError.message }, 400)

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ full_name: fullName, role, active: payload.active !== false })
    .eq('id', created.user.id)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id)
    return json({ error: 'No se pudo completar el perfil del usuario.' }, 500)
  }

  return json({ user: { id: created.user.id, email, fullName, role } }, 201)
})
