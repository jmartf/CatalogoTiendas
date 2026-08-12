import { supabase } from './supabase.js'

async function invokeAdminUsers(options = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', options)
  if (error) {
    let message = error.message || 'No fue posible comunicarse con la función administrativa.'
    try {
      const response = error.context
      if (response && typeof response.json === 'function') {
        const body = await response.json()
        if (body?.error) message = body.error
      }
    } catch {
      // Se conserva el mensaje original cuando la respuesta no contiene JSON.
    }
    return { data: null, error: new Error(message) }
  }
  if (data?.error) return { data: null, error: new Error(data.error) }
  return { data, error: null }
}

export function listUsers() {
  return invokeAdminUsers({ method: 'GET' })
}

export function createUser(values) {
  return invokeAdminUsers({ method: 'POST', body: values })
}

export function updateUser(values) {
  return invokeAdminUsers({ method: 'PATCH', body: values })
}

export function deleteUser(id) {
  return invokeAdminUsers({ method: 'DELETE', body: { id } })
}
