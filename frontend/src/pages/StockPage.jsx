import { useState, useEffect } from 'react'
import { inventoryApi } from '../api/client'

const MOVE_EMPTY = { productId: '', type: 'INBOUND', quantity: 1, fromLocationId: '', toLocationId: '', reason: '' }

export default function StockPage() {
  const [levels,    setLevels]    = useState([])
  const [products,  setProducts]  = useState([])
  const [locations, setLocations] = useState([])
  const [move,      setMove]      = useState(MOVE_EMPTY)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [filter,    setFilter]    = useState('all')

  const load = () => {
    inventoryApi.getAllLevels().then(r => setLevels(r.data))
    inventoryApi.getProducts().then(r => setProducts(r.data))
    inventoryApi.getLocations().then(r => setLocations(r.data))
  }
  useEffect(() => { load() }, [])

  const submitMove = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await inventoryApi.recordMovement({ ...move, quantity: Number(move.quantity) })
      setSuccess('Movement recorded successfully')
      setMove(MOVE_EMPTY); load()
      setTimeout(() => setSuccess(''), 3000)
    } catch(err) { setError(err.response?.data?.message || 'Error recording movement') }
  }

  const typeColor = t => ({ INBOUND: '#22c55e', OUTBOUND: '#ef4444', TRANSFER: '#f59e0b' }[t])

  const filtered = filter === 'all' ? levels
    : filter === 'low'  ? levels.filter(l => l.lowStock)
    : levels.filter(l => l.outOfStock)

  const inp = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: '100%' }
  const th  = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
  const td  = { padding: '11px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Stock Levels</h1>

      {/* Record movement panel */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Record Stock Movement</h2>
        <form onSubmit={submitMove} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Product *</label>
            <select style={inp} value={move.productId} onChange={e => setMove(m => ({...m, productId: e.target.value}))} required>
              <option value="">Select product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Type *</label>
            <select style={inp} value={move.type} onChange={e => setMove(m => ({...m, type: e.target.value}))}>
              <option value="INBOUND">INBOUND — receive stock</option>
              <option value="OUTBOUND">OUTBOUND — dispatch stock</option>
              <option value="TRANSFER">TRANSFER — move between locations</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Quantity *</label>
            <input style={inp} type="number" min="1" value={move.quantity} onChange={e => setMove(m => ({...m, quantity: e.target.value}))} required />
          </div>
          {(move.type === 'OUTBOUND' || move.type === 'TRANSFER') && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>From Location *</label>
              <select style={inp} value={move.fromLocationId} onChange={e => setMove(m => ({...m, fromLocationId: e.target.value}))} required>
                <option value="">Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
          {(move.type === 'INBOUND' || move.type === 'TRANSFER') && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>To Location *</label>
              <select style={inp} value={move.toLocationId} onChange={e => setMove(m => ({...m, toLocationId: e.target.value}))} required>
                <option value="">Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Reason</label>
            <input style={inp} value={move.reason} onChange={e => setMove(m => ({...m, reason: e.target.value}))} placeholder="Optional note" />
          </div>
          {error   && <div style={{ gridColumn: 'span 3', color: 'var(--danger)', fontSize: 12, background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
          {success && <div style={{ gridColumn: 'span 3', color: '#16a34a', fontSize: 12, background: '#f0fdf4', padding: '8px 12px', borderRadius: 6 }}>{success}</div>}
          <div style={{ gridColumn: 'span 3' }}>
            <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Record Movement</button>
          </div>
        </form>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['all', 'All Levels'], ['low', '⚠ Low Stock'], ['out', '✕ Out of Stock']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: '7px 14px', borderRadius: 20, border: '1px solid var(--border)',
            background: filter === k ? 'var(--primary)' : '#fff',
            color: filter === k ? '#fff' : '#374151',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['Product','SKU','Location','Zone','Qty','Min','Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={td}><div style={{ fontWeight: 500 }}>{s.productName}</div></td>
                <td style={{...td, fontFamily: 'monospace', fontSize: 12}}>{s.productSku}</td>
                <td style={td}>{s.locationName}</td>
                <td style={td}><span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{s.zone}</span></td>
                <td style={{...td, fontWeight: 700, fontSize: 15, color: s.outOfStock ? '#ef4444' : s.lowStock ? '#f59e0b' : '#374151'}}>{s.quantity}</td>
                <td style={{...td, color: '#9ca3af'}}>{s.minQuantity || '—'}</td>
                <td style={td}>{s.outOfStock
                  ? <span style={{ background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Out of stock</span>
                  : s.lowStock
                    ? <span style={{ background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Low stock</span>
                    : <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>OK</span>
                }</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No records found</div>}
      </div>
    </div>
  )
}
