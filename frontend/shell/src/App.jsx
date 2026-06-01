import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy }          from 'react'
import { useAuth }                 from './context/AuthContext'
import LoginPage                  from './pages/LoginPage'
import SignupPage                  from './pages/SignupPage'
import ForgotPasswordPage          from './pages/ForgotPasswordPage'
import Layout                      from './components/Layout'
import ProtectedRoute              from './components/ProtectedRoute'

/**
 * Each lazy import resolves at runtime from a separately-deployed MFE remote.
 * The remote name (e.g. "dashboardMfe") matches the key in vite.config.js.
 * The path after "/" is the exposed module key defined in the remote's vite.config.js.
 *
 * If a remote is unreachable the ErrorBoundary (not shown here for brevity)
 * can catch and show a fallback — but during development all remotes must be
 * running for their routes to work.
 */

// ── dashboardMfe remote ────────────────────────────────────────────────────
const DashboardPage  = lazy(() => import('dashboardMfe/DashboardPage'))

// ── productsMfe remote ─────────────────────────────────────────────────────
const ProductsPage   = lazy(() => import('productsMfe/ProductsPage'))
const LocationsPage  = lazy(() => import('productsMfe/LocationsPage'))
const BatchLotsPage  = lazy(() => import('productsMfe/BatchLotsPage'))
const CycleCountsPage= lazy(() => import('productsMfe/CycleCountsPage'))
const UomPage        = lazy(() => import('productsMfe/UomPage'))

// ── stockMfe remote ────────────────────────────────────────────────────────
const StockPage      = lazy(() => import('stockMfe/StockPage'))
const MovementsPage  = lazy(() => import('stockMfe/MovementsPage'))

// ── supplierMfe remote ─────────────────────────────────────────────────────
const SuppliersPage      = lazy(() => import('supplierMfe/SuppliersPage'))
const PurchaseOrdersPage = lazy(() => import('supplierMfe/PurchaseOrdersPage'))

// ── reportingMfe remote ────────────────────────────────────────────────────
const ReportsPage    = lazy(() => import('reportingMfe/ReportsPage'))
const UsersPage      = lazy(() => import('reportingMfe/UsersPage'))

function Loading() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  height:'60vh', color:'#9ca3af', fontSize:14 }}>
      Loading…
    </div>
  )
}

function AppLayout({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>
        <Suspense fallback={<Loading />}>
          {children}
        </Suspense>
      </Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/login"           element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup"          element={user ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />

      {/* ── Protected — pages loaded from MFE remotes ──────────────────── */}
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
