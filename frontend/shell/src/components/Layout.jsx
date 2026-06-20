import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'

const navGroups = [
  { label: 'Overview', items: [
    { path: '/', label: 'Dashboard', icon: '◰' },
  ]},
  { label: 'Inventory', items: [
    { path: '/products',     label: 'Products',     icon: '▤' },
    { path: '/locations',    label: 'Locations',     icon: '◫' },
    { path: '/stock',        label: 'Stock Levels',  icon: '▥' },
    { path: '/movements',    label: 'Movements',     icon: '⇄' },
    { path: '/batch-lots',   label: 'Batch / Lots',  icon: '◷' },
    { path: '/cycle-counts', label: 'Cycle Counts',  icon: '↺' },
    { path: '/uom',          label: 'UoM Rules',     icon: '⇌' },
  ]},
  { label: 'Procurement', items: [
    { path: '/suppliers',       label: 'Suppliers',       icon: '⌂' },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: '▦' },
  ]},
  { label: 'Analytics', items: [
    { path: '/reports', label: 'Reports', icon: '▮' },
  ]},
  { label: 'Admin', adminOnly: true, items: [
    { path: '/users', label: 'Users', icon: '◉' },
  ]},
]

const ROLE_LABEL = {
  ADMIN: 'Administrator',
  WAREHOUSE_MANAGER: 'Warehouse Manager',
  STAKEHOLDER: 'Stakeholder',
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'ADMIN'
  const initial = (user?.fullName || user?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Sidebar — industrial deep-green, stamped active state ──────── */}
      <nav style={{
        width: 232, background: 'var(--deep)', color: '#fff',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--line-deep)' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
            display: 'flex', alignItems: 'center', gap: 8, color: '#fff',
          }}>
            <span style={{
              width: 26, height: 26, background: 'var(--accent)', borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700,
            }}>IM</span>
            InventoryMS
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--steel)',
            marginTop: 6, letterSpacing: '.5px',
          }}>
            BUILD 2.0 · OPERATIONAL
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0' }}>
          {navGroups.map(group => {
            if (group.adminOnly && !isAdmin) return null
            return (
              <div key={group.label} style={{ marginBottom: 6 }}>
                <div style={{
                  padding: '6px 20px', fontSize: 10, fontWeight: 600,
                  color: 'var(--steel)', textTransform: 'uppercase', letterSpacing: '1.2px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {group.label}
                </div>
                {group.items.map(item => {
                  const active = location.pathname === item.path
                  return (
                    <Link key={item.path} to={item.path} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 20px', fontSize: 13, fontWeight: active ? 600 : 450,
                      color: active ? '#fff' : '#C9D4CC',
                      background: active ? 'var(--deep-2)' : 'transparent',
                      borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                      position: 'relative',
                    }}>
                      <span style={{ fontSize: 14, width: 16, textAlign: 'center', opacity: active ? 1 : .65 }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--line-deep)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#fff',
              flexShrink: 0,
            }}>{initial}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.fullName || user?.email}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '.3px' }}>
                {ROLE_LABEL[user?.role] || user?.role}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{
            width: '100%', background: 'transparent', borderColor: 'var(--line-deep)',
            color: '#C9D4CC',
          }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Main column ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Manifest strip — signature element, like warehouse digital signage */}
        <div style={{
          background: 'var(--ink)', color: '#fff', padding: '7px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.4px',
        }}>
          <span style={{ color: 'var(--steel)' }}>
            SESSION&nbsp;
            <span style={{ color: '#fff' }}>{user?.email}</span>
          </span>
          <span style={{ color: 'var(--steel)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <main style={{ flex: 1, overflow: 'auto', padding: '32px 36px', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
