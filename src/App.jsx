import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import AdminRoute from './routes/AdminRoute.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

const Catalogs = lazy(() => import('./pages/Catalogs.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const ProductFormPage = lazy(() => import('./pages/ProductFormPage.jsx'))
const Products = lazy(() => import('./pages/Products.jsx'))
const PublicCatalog = lazy(() => import('./pages/PublicCatalog.jsx'))
const PublicProductDetail = lazy(() => import('./pages/PublicProductDetail.jsx'))
const Users = lazy(() => import('./pages/Users.jsx'))

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/catalogo" element={<PublicCatalog />} />
        <Route path="/catalogo/:id" element={<PublicProductDetail />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/productos" element={<Products />} />
            <Route path="/productos/nuevo" element={<ProductFormPage />} />
            <Route path="/productos/:id/editar" element={<ProductFormPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/administracion" element={<Navigate to="/administracion/catalogos" replace />} />
              <Route path="/administracion/catalogos" element={<Catalogs />} />
              <Route path="/administracion/usuarios" element={<Users />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
