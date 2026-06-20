import { useState, useEffect } from 'react'
import { inventoryApi, reportingApi } from './client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'

const MOVE_COLOR = { INBOUND: 'var(--ok)', OUTBOUND: 'var(--crit)', TRANSFER: 'var(--warn)' }

function StatCard({ label, value, tone = 'ink', icon }) {
  const color = {
    ink: 'var(--ink)', ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)', accent: 'var(--accent)',
  }[tone]
  return (
    <div className="card" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: color }} />
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-2)',
        textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {label}
        <span style={{ opacity: .55, fontSize: 13 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 600, color, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
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
      const map = {}
      r.data.forEach(({ day, type, total }) => {
        if (!map[day]) map[day] = { day }
        map[day][type] = total
      })
      setTrend(Object.values(map).slice(-10))
    }).catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700, marginBottom: 4 }}>
            Operations Overview
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            Live snapshot across all warehouses · refreshed on load
          </p>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'right' }}>
          LAST SYNC<br/>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(168px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Products"        value={summary?.totalProducts}      tone="ink"    icon="▤" />
        <StatCard label="Locations"       value={summary?.totalLocations}     tone="ink"    icon="◫" />
        <StatCard label="Low Stock"       value={summary?.lowStockCount}      tone="warn"   icon="⚠" />
        <StatCard label="Out of Stock"    value={summary?.outOfStockCount}    tone="crit"   icon="✕" />
        <StatCard label="Overstock"       value={summary?.overstockCount}     tone="accent" icon="↑" />
        <StatCard label="Moves (24h)"     value={summary?.movementsLast24h}   tone="ok"     icon="⇄" />
        <StatCard label="Reservations"    value={summary?.activeReservations} tone="ink"    icon="◉" />
        <StatCard label="Expiring Soon"   value={summary?.expiringSoonCount}  tone="crit"   icon="◷" />
      </div>

      {trend.length > 0 && (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Movement trend — last 14 days
          </h2>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={trend}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="var(--steel)" />
              <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} stroke="var(--steel)" />
              <Tooltip
                contentStyle={{ fontFamily: 'Inter', fontSize: 12, border: '1px solid var(--line)', borderRadius: 6 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="INBOUND"  fill={MOVE_COLOR.INBOUND}  radius={[2,2,0,0]} />
              <Bar dataKey="OUTBOUND" fill={MOVE_COLOR.OUTBOUND} radius={[2,2,0,0]} />
              <Bar dataKey="TRANSFER" fill={MOVE_COLOR.TRANSFER} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        <div className="card" style={{ padding: '18px 20px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: 'var(--warn)' }}>⚠</span> Low Stock Alerts
          </h2>
          {lowStock.length === 0
            ? <div style={{ color: 'var(--text-2)', fontSize: 13 }}>No low stock items.</div>
            : lowStock.slice(0, 8).map(s => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '9px 0',
                borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.productName}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12 }}>{s.locationName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontWeight: 700, color: s.outOfStock ? 'var(--crit)' : 'var(--warn)' }}>
                    {s.quantity}
                  </div>
                  <div className="mono" style={{ color: 'var(--text-2)', fontSize: 10.5 }}>
                    min {s.minQuantity} · resv {s.reservedQuantity}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, marginBottom: 14 }}>
            Recent Movements
          </h2>
          {movements.length === 0
            ? <div style={{ color: 'var(--text-2)', fontSize: 13 }}>No movements yet.</div>
            : movements.slice(0, 8).map(m => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '9px 0',
                borderBottom: '1px solid var(--border)', fontSize: 13,
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{m.productName}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
                    {m.fromLocation}{m.fromLocation && m.toLocation ? ' → ' : ''}{m.toLocation}
                  </div>
                  {m.reasonCode && <div className="mono" style={{ color: 'var(--steel)', fontSize: 10.5 }}>{m.reasonCode}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="status-pill" style={{
                    background: `color-mix(in srgb, ${MOVE_COLOR[m.type]} 14%, white)`,
                    color: MOVE_COLOR[m.type],
                  }}>
                    {m.type}
                  </span>
                  <div className="mono" style={{ color: 'var(--text-2)', fontSize: 12, marginTop: 3 }}>× {m.quantity}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
