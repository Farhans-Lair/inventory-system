import { useState, useEffect } from 'react'
import { inventoryApi, reportingApi } from './client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const card = { background:'#fff', borderRadius:10, padding:'20px 24px', border:'1px solid var(--border)' }
const typeColor = t => ({ INBOUND:'#22c55e', OUTBOUND:'#ef4444', TRANSFER:'#f59e0b' }[t] || '#6b7280')

function StatCard({ label, value, color='#4f46e5', icon }) {
  return (
    <div style={{ ...card, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <div style={{ color:'#6b7280', fontSize:12, fontWeight:500, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:700, color }}>{value ?? '—'}</div>
      </div>
      <div style={{ fontSize:32, opacity:.2 }}>{icon}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [summary,   setSummary]   = useState(null)
  const [lowStock,  setLowStock]  = useState([])
  const [movements, setMovements] = useState([])
  const [trend,     setTrend]     = useState([])

  useEffect(() => {
    inventoryApi.getSummary().then(r => setSummary(r.data)).catch(() => {})
    inventoryApi.getLowStock().then(r => setLowStock(r.data)).catch(() => {})
    inventoryApi.getRecentMovements().then(r => setMovements(r.data)).catch(() => {})
    reportingApi.getTrend(14).then(r => {
      // Pivot: [{day, INBOUND:n, OUTBOUND:n, TRANSFER:n}]
      const map = {}
      r.data.forEach(({day,type,total}) => {
        if (!map[day]) map[day] = { day }
        map[day][type] = total
      })
      setTrend(Object.values(map).slice(-10))
    }).catch(() => {})
  }, [])

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:600, marginBottom:6 }}>Dashboard</h1>
      <p style={{ color:'#6b7280', marginBottom:24, fontSize:13 }}>Real-time inventory overview</p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:24 }}>
        <StatCard label="Products"         value={summary?.totalProducts}    color="#4f46e5" icon="☰" />
        <StatCard label="Locations"        value={summary?.totalLocations}   color="#0891b2" icon="◫" />
        <StatCard label="Low Stock"        value={summary?.lowStockCount}    color="#f59e0b" icon="⚠" />
        <StatCard label="Out of Stock"     value={summary?.outOfStockCount}  color="#ef4444" icon="✕" />
        <StatCard label="Overstock"        value={summary?.overstockCount}   color="#8b5cf6" icon="↑" />
        <StatCard label="Movements (24h)"  value={summary?.movementsLast24h} color="#059669" icon="⇄" />
        <StatCard label="Reservations"     value={summary?.activeReservations} color="#0ea5e9" icon="🔒" />
        <StatCard label="Expiring Soon"    value={summary?.expiringSoonCount} color="#dc2626" icon="⏱" />
      </div>

      {/* Trend chart */}
      {trend.length > 0 && (
        <div style={{ ...card, marginBottom:20 }}>
          <h2 style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>Movement trend (last 14 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend}>
              <XAxis dataKey="day" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="INBOUND"  fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="OUTBOUND" fill="#ef4444" radius={[3,3,0,0]} />
              <Bar dataKey="TRANSFER" fill="#f59e0b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Low stock */}
        <div style={card}>
          <h2 style={{ fontSize:15, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'#f59e0b' }}>⚠</span> Low Stock Alerts
          </h2>
          {lowStock.length === 0
            ? <div style={{ color:'#6b7280', fontSize:13 }}>No low stock items 🎉</div>
            : lowStock.slice(0,8).map(s => (
              <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{s.productName}</div>
                  <div style={{ color:'#6b7280', fontSize:12 }}>{s.locationName}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:600, color: s.outOfStock ? '#ef4444' : '#f59e0b' }}>{s.quantity}</div>
                  <div style={{ color:'#9ca3af', fontSize:11 }}>min: {s.minQuantity} | reserved: {s.reservedQuantity}</div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Recent movements */}
        <div style={card}>
          <h2 style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>Recent Movements</h2>
          {movements.length === 0
            ? <div style={{ color:'#6b7280', fontSize:13 }}>No movements yet</div>
            : movements.slice(0,8).map(m => (
              <div key={m.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f3f4f6', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:500 }}>{m.productName}</div>
                  <div style={{ color:'#6b7280', fontSize:12 }}>{m.fromLocation}{m.fromLocation && m.toLocation ? ' → ' : ''}{m.toLocation}</div>
                  {m.reasonCode && <div style={{ color:'#9ca3af', fontSize:11 }}>{m.reasonCode}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ background:typeColor(m.type)+'20', color:typeColor(m.type), padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>{m.type}</span>
                  <div style={{ color:'#6b7280', fontSize:12, marginTop:2 }}>× {m.quantity}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
