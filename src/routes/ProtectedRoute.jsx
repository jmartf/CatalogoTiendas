import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen message="Verificando tu sesión…" />
  if (!session || !profile) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
