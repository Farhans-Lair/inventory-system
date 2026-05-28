import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage           from './pages/LoginPage'
import SignupPage          from './pages/SignupPage'
import ForgotPasswordPage  from './pages/ForgotPasswordPage'
import DashboardPage       from './pages/DashboardPage'
import ProductsPage        from './pages/ProductsPage'
import LocationsPage       from './pages/LocationsPage'
import StockPage           from './pages/StockPage'
import MovementsPage       from './pages/MovementsPage'
import UsersPage           from './pages/UsersPage'
import SuppliersPage       from './pages/SuppliersPage'
import PurchaseOrdersPage  from './pages/PurchaseOrdersPage'
import ReportsPage         from './pages/ReportsPage'
import BatchLotsPage       from './pages/BatchLotsPage'
import CycleCountsPage     from './pages/CycleCountsPage'
import UomPage             from './pages/UomPage'
import Layout              from './components/Layout'
import ProtectedRoute      from './components/ProtectedRoute'

function AppLayout({ children, adminOnly = false }) {
  return <ProtectedRoute adminOnly={adminOnly}><Layout>{children}</Layout></ProtectedRoute>
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup"          element={user ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />

      {/* Protected */}
      <Route path="/"                element={<AppLayout><DashboardPage /></AppLayout>} />
      <Route path="/products"        element={<AppLayout><ProductsPage /></AppLayout>} />
      <Route path="/locations"       element={<AppLayout><LocationsPage /></AppLayout>} />
      <Route path="/stock"           element={<AppLayout><StockPage /></AppLayout>} />
      <Route path="/movements"       element={<AppLayout><MovementsPage /></AppLayout>} />
      <Route path="/batch-lots"      element={<AppLayout><BatchLotsPage /></AppLayout>} />
      <Route path="/cycle-counts"    element={<AppLayout><CycleCountsPage /></AppLayout>} />
      <Route path="/uom"             element={<AppLayout><UomPage /></AppLayout>} />
      <Route path="/suppliers"       element={<AppLayout><SuppliersPage /></AppLayout>} />
      <Route path="/purchase-orders" element={<AppLayout><PurchaseOrdersPage /></AppLayout>} />
      <Route path="/reports"         element={<AppLayout><ReportsPage /></AppLayout>} />
      <Route path="/users"           element={<AppLayout adminOnly><UsersPage /></AppLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
