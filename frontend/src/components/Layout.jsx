import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/',         label: 'Dashboard',      icon: '⊞' },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { path: '/products',    label: 'Products',     icon: '☰' },
      { path: '/locations',   label: 'Locations',    icon: '◫' },
      { path: '/stock',       label: 'Stock Levels', icon: '≡' },
      { path: '/movements',   label: 'Movements',    icon: '⇄' },
      { path: '/batch-lots',  label: 'Batch / Lots', icon: '⏱' },
      { path: '/cycle-counts',label: 'Cycle Counts', icon: '↺' },
    ]
  },
  {
    label: 'Procurement',
    items: [
      { path: '/suppliers',       label: 'Suppliers',        icon: '🏭' },
      { path: '/purchase-orders', label: 'Purchase Orders',  icon: '📋' },
    ]
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports', label: 'Reports', icon: '📊' },
    ]
  },
  {
    label: 'Admin',
    adminOnly: true,
    items: [
      { path: '/users', label: 'Users', icon: '👤' },
    ]
  },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location   = useLocation()
  const navigate   = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f9fafb' }}>
      {/* Sidebar */}
      <nav style={{
        width:220, background:'#fff', borderRight:'1px solid #e5e7eb',
        display:'flex', flexDirection:'column', padding:'0 0 16px'
      }}>
        <div style={{ padding:'20px 16px 12px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>📦 InventoryMS</div>
          <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>v2.0</div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {navGroups.map(group => {
            if (group.adminOnly && !isAdmin) return null
            return (
              <div key={group.label} style={{ marginBottom:4 }}>
                <div style={{ padding:'8px 16px 4px', fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:1 }}>
                  {group.label}
                </div>
                {group.items.map(item => {
                  const active = location.pathname === item.path
                  return (
                    <Link key={item.path} to={item.path} style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'8px 16px', fontSize:13,
                      color: active ? '#4f46e5' : '#374151',
                      background: active ? '#eef2ff' : 'transparent',
                      borderRight: active ? '2px solid #4f46e5' : '2px solid transparent',
                      textDecoration:'none', fontWeight: active ? 600 : 400,
                    }}>
                      <span style={{ fontSize:14, opacity:.7 }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ borderTop:'1px solid #f3f4f6', padding:'12px 16px' }}>
          <div style={{ fontSize:12, fontWeight:500, color:'#374151', marginBottom:2 }}>
            {user?.fullName || user?.email}
          </div>
          <div style={{ fontSize:11, color:'#9ca3af', marginBottom:8 }}>
            {user?.role?.replace('_',' ')}
          </div>
          <button onClick={handleLogout} style={{
            width:'100%', padding:'6px', background:'transparent',
            border:'1px solid #e5e7eb', borderRadius:6, fontSize:12,
            color:'#6b7280', cursor:'pointer'
          }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
        {children}
      </main>
    </div>
  )
}
