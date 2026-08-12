import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getProfile, signOut as requestSignOut } from '../services/auth.js'
import { isSupabaseConfigured, supabase } from '../services/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const loadProfile = useCallback(async (nextSession) => {
    if (!nextSession?.user) {
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setAuthError('')
    const { data, error } = await getProfile(nextSession.user.id)

    if (error || !data) {
      setAuthError('Tu cuenta no tiene un perfil habilitado. Contacta a un administrador.')
      await requestSignOut()
      setSession(null)
      setProfile(null)
    } else if (!data.active) {
      setAuthError('Tu cuenta está desactivada. Contacta a un administrador.')
      await requestSignOut()
      setSession(null)
      setProfile(null)
    } else {
      setSession(nextSession)
      setProfile(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return undefined
    }

    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) loadProfile(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession)
        return
      }
      window.setTimeout(() => loadProfile(nextSession), 0)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    setLoading(true)
    await requestSignOut()
    setSession(null)
    setProfile(null)
    setLoading(false)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(''), [])

  const value = useMemo(
    () => ({ session, profile, loading, authError, clearAuthError, signOut }),
    [session, profile, loading, authError, clearAuthError, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return context
}
