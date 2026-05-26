import { useState, useEffect } from 'react'
import { inventoryApi } from '../api/client'

const typeColor = t => ({ INBOUND: '#22c55e', OUTBOUND: '#ef4444', TRANSFER: '#f59e0b' }[t] || '#6b7280')

export default function MovementsPage() {
  const [movements, setMovements] = useState([])
  const [filter,    setFilter]    = useState('ALL')

  useEffect(() => {
    inventoryApi.getRecentMovements().then(r => setMovements(r.data))
  }, [])

  const filtered = filter === 'ALL' ? movements : movements.filter(m => m.type === filter)

  const th = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
  const td = { padding: '11px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Stock Movements</h1>
      <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 13 }}>Last 20 movements across all products</p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['ALL','INBOUND','OUTBOUND','TRANSFER'].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: filter === t ? (typeColor(t) === '#6b7280' ? 'var(--primary)' : typeColor(t)) : '#f3f4f6',
            color:      filter === t ? '#fff' : '#374151',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['Product','Type','Qty','From','To','Code','Reason','By','Date'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{m.productName}</div>
                  <div style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{m.productSku}</div>
                </td>
                <td style={td}>
                  <span style={{ background: typeColor(m.type) + '20', color: typeColor(m.type), padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{m.type}</span>
                </td>
                <td style={{ ...td, fontWeight: 700 }}>{m.quantity}</td>
                <td style={{ ...td, color: '#6b7280' }}>{m.fromLocation || '—'}</td>
                <td style={{ ...td, color: '#6b7280' }}>{m.toLocation   || '—'}</td>
                <td style={td}>
                  {m.reasonCode
                    ? <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{m.reasonCode}</span>
                    : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td style={{ ...td, color: '#6b7280' }}>{m.reason || '—'}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>{m.performedBy?.slice(0, 20)}</td>
                <td style={{ ...td, color: '#6b7280', fontSize: 12 }}>{m.timestamp ? new Date(m.timestamp).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No movements found</div>
        )}
      </div>
    </div>
  )
}
