import { supabase } from './supabase.js'

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getProfile(userId) {
  return supabase.from('profiles').select('id, full_name, role, active, created_at, updated_at').eq('id', userId).single()
}
