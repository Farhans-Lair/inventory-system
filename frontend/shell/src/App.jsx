import { Routes, Route, Navigate }   from 'react-router-dom'
import { Suspense, lazy, Component }  from 'react'
import { useAuth }                    from './context/AuthContext'
import LoginPage                      from './pages/LoginPage'
import SignupPage                     from './pages/SignupPage'
import ForgotPasswordPage             from './pages/ForgotPasswordPage'
import Layout                         from './components/Layout'
import ProtectedRoute                 from './components/ProtectedRoute'

// ── dashboardMfe remote ────────────────────────────────────────────────────
const DashboardPage   = lazy(() => import('dashboardMfe/DashboardPage'))

// ── productsMfe remote ─────────────────────────────────────────────────────
const ProductsPage    = lazy(() => import('productsMfe/ProductsPage'))
const LocationsPage   = lazy(() => import('productsMfe/LocationsPage'))
const BatchLotsPage   = lazy(() => import('productsMfe/BatchLotsPage'))
const CycleCountsPage = lazy(() => import('productsMfe/CycleCountsPage'))
const UomPage         = lazy(() => import('productsMfe/UomPage'))

// ── stockMfe remote ────────────────────────────────────────────────────────
const StockPage       = lazy(() => import('stockMfe/StockPage'))
const MovementsPage   = lazy(() => import('stockMfe/MovementsPage'))

// ── supplierMfe remote ─────────────────────────────────────────────────────
const SuppliersPage      = lazy(() => import('supplierMfe/SuppliersPage'))
const PurchaseOrdersPage = lazy(() => import('supplierMfe/PurchaseOrdersPage'))

// ── reportingMfe remote ────────────────────────────────────────────────────
const ReportsPage  = lazy(() => import('reportingMfe/ReportsPage'))
const UsersPage    = lazy(() => import('reportingMfe/UsersPage'))

// ── Loading fallback ───────────────────────────────────────────────────────
function Loading() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  height:'60vh', color:'#9ca3af', fontSize:14 }}>
      Loading…
    </div>
  )
}

// ── MFE Error Boundary ─────────────────────────────────────────────────────
// Catches errors thrown by a failed Module Federation remote (e.g. when
// remoteEntry.js returns a 404 or the fetched script throws a SyntaxError).
// Without this, ONE failed MFE crashes the entire React tree → blank page.
class MfeErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[MFE Error]', this.props.name, error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: 12,
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 16 }}>
            {this.props.name || 'This page'} failed to load
          </div>
          <div style={{ color: '#6b7280', fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
            The module could not be fetched. Please refresh the page. If the problem
            persists, the service may be temporarily unavailable.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', background: '#4f46e5', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Protected layout with per-page error isolation ─────────────────────────
function AppLayout({ children, adminOnly = false, mfeName }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>
        <MfeErrorBoundary name={mfeName}>
          <Suspense fallback={<Loading />}>
            {children}
          </Suspense>
        </MfeErrorBoundary>
      </Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* ── Public ──────────────────────────────────────────────────────── */}
      <Route path="/login"           element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup"          element={user ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />

      {/* ── Protected — each page isolated in its own ErrorBoundary ──────── */}
      <Route path="/"                element={<AppLayout mfeName="Dashboard"><DashboardPage /></AppLayout>} />
      <Route path="/products"        element={<AppLayout mfeName="Products"><ProductsPage /></AppLayout>} />
      <Route path="/locations"       element={<AppLayout mfeName="Locations"><LocationsPage /></AppLayout>} />
      <Route path="/stock"           element={<AppLayout mfeName="Stock Levels"><StockPage /></AppLayout>} />
      <Route path="/movements"       element={<AppLayout mfeName="Movements"><MovementsPage /></AppLayout>} />
      <Route path="/batch-lots"      element={<AppLayout mfeName="Batch / Lots"><BatchLotsPage /></AppLayout>} />
      <Route path="/cycle-counts"    element={<AppLayout mfeName="Cycle Counts"><CycleCountsPage /></AppLayout>} />
      <Route path="/uom"             element={<AppLayout mfeName="UoM Rules"><UomPage /></AppLayout>} />
      <Route path="/suppliers"       element={<AppLayout mfeName="Suppliers"><SuppliersPage /></AppLayout>} />
      <Route path="/purchase-orders" element={<AppLayout mfeName="Purchase Orders"><PurchaseOrdersPage /></AppLayout>} />
      <Route path="/reports"         element={<AppLayout mfeName="Reports"><ReportsPage /></AppLayout>} />
      <Route path="/users"           element={<AppLayout adminOnly mfeName="Users"><UsersPage /></AppLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
