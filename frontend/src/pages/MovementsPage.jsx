import { useState, useEffect } from 'react'
import { inventoryApi } from '../api/client'

export default function MovementsPage() {
  const [movements, setMovements] = useState([])

  useEffect(() => {
    inventoryApi.getRecentMovements().then(r => setMovements(r.data))
  }, [])

  const typeColor = t => ({ INBOUND: '#22c55e', OUTBOUND: '#ef4444', TRANSFER: '#f59e0b' }[t])
  const th = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
  const td = { padding: '11px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Stock Movements</h1>
      <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 13 }}>Last 20 movements across all products</p>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['Product','Type','Qty','From','To','Reason','Performed By','Date'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id}>
                <td style={td}><div style={{ fontWeight: 500 }}>{m.productName}</div><div style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{m.productSku}</div></td>
                <td style={td}><span style={{ background: typeColor(m.type) + '20', color: typeColor(m.type), padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{m.type}</span></td>
                <td style={{...td, fontWeight: 700}}>{m.quantity}</td>
                <td style={{...td, color: '#6b7280'}}>{m.fromLocation || '—'}</td>
                <td style={{...td, color: '#6b7280'}}>{m.toLocation   || '—'}</td>
                <td style={{...td, color: '#6b7280'}}>{m.reason || '—'}</td>
                <td style={{...td, fontFamily: 'monospace', fontSize: 11, color: '#9ca3af'}}>{m.performedBy?.slice(0,8)}…</td>
                <td style={{...td, color: '#6b7280', fontSize: 12}}>{m.timestamp ? new Date(m.timestamp).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No movements recorded yet</div>}
      </div>
    </div>
  )
}
