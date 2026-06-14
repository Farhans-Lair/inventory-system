import { useState, useEffect } from 'react'
import { inventoryApi } from './client'
import { useAuth } from './authContext'

const REASON_CODES = ['', 'SOLD', 'RETURNED', 'DAMAGED', 'EXPIRED', 'ADJUSTMENT', 'SAMPLE', 'WRITE_OFF']
const MOVE_EMPTY  = { productId: '', type: 'INBOUND', quantity: 1, fromLocationId: '', toLocationId: '', reason: '', reasonCode: '' }

const inp  = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', background: '#fff' }
const th   = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
const td   = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }

export default function StockPage() {
  const [levels,    setLevels]    = useState([])
  const [products,  setProducts]  = useState([])
  const [locations, setLocations] = useState([])
  const [move,      setMove]      = useState(MOVE_EMPTY)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [filter,    setFilter]    = useState('all')
  const [showForm,  setShowForm]  = useState(false)
  const { canWrite } = useAuth() || {}

  const load = () => {
    inventoryApi.getAllLevels().then(r => setLevels(r.data)).catch(() => {})
    inventoryApi.getProducts().then(r => setProducts(r.data)).catch(() => {})
    inventoryApi.getLocations().then(r => setLocations(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const submitMove = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await inventoryApi.recordMovement({ ...move, quantity: Number(move.quantity) })
      setSuccess('Movement recorded successfully')
      setMove(MOVE_EMPTY); setShowForm(false); load()
      setTimeout(() => setSuccess(''), 3000)
    } catch(err) { setError(err.response?.data?.message || 'Error recording movement') }
  }

  const filtered = levels.filter(l =>
    filter === 'all'      ? true :
    filter === 'low'      ? l.lowStock :
    filter === 'out'      ? l.outOfStock :
    filter === 'over'     ? l.overstock :
    filter === 'reserved' ? l.reservedQuantity > 0 : true
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Stock Levels</h1>
        {canWrite && (
          <button onClick={() => { setShowForm(s => !s); setError(''); setSuccess('') }}
            style={{ padding: '8px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? '✕ Close' : '+ Record Movement'}
          </button>
        )}
      </div>
      <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 13 }}>Live stock levels across all locations</p>

      {/* Movement form */}
      {showForm && canWrite && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #c7d2fe', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Record Stock Movement</h2>
          {error   && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#166534', fontSize: 13, marginBottom: 12 }}>{success}</div>}
          <form onSubmit={submitMove}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Product *</label>
                <select style={inp} value={move.productId} onChange={e => setMove(m => ({...m, productId: e.target.value}))} required>
                  <option value="">Select product</option>
                  {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Type *</label>
                <select style={inp} value={move.type} onChange={e => setMove(m => ({...m, type: e.target.value}))}>
                  <option value="INBOUND">Inbound</option>
                  <option value="OUTBOUND">Outbound</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Quantity *</label>
                <input style={inp} type="number" min="1" value={move.quantity} onChange={e => setMove(m => ({...m, quantity: e.target.value}))} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Reason Code</label>
                <select style={inp} value={move.reasonCode} onChange={e => setMove(m => ({...m, reasonCode: e.target.value}))}>
                  {REASON_CODES.map(c => <option key={c} value={c}>{c || '— None —'}</option>)}
                </select>
              </div>
              {(move.type === 'OUTBOUND' || move.type === 'TRANSFER') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>From Location *</label>
                  <select style={inp} value={move.fromLocationId} onChange={e => setMove(m => ({...m, fromLocationId: e.target.value}))} required>
                    <option value="">Select location</option>
                    {locations.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              {(move.type === 'INBOUND' || move.type === 'TRANSFER') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>To Location *</label>
                  <select style={inp} value={move.toLocationId} onChange={e => setMove(m => ({...m, toLocationId: e.target.value}))} required>
                    <option value="">Select location</option>
                    {locations.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Notes</label>
                <input style={inp} value={move.reason} onChange={e => setMove(m => ({...m, reason: e.target.value}))} placeholder="Optional note" />
              </div>
            </div>
            <button type="submit" style={{ padding: '9px 22px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Record Movement
            </button>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['all',      'All'],
          ['low',      'Low Stock'],
          ['out',      'Out of Stock'],
          ['over',     'Overstock'],
          ['reserved', 'Has Reservations'],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: filter === v ? 'var(--primary)' : '#f3f4f6',
            color:      filter === v ? '#fff'           : '#374151',
          }}>{l}</button>
        ))}
      </div>

      {/* Levels table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['Product','SKU','Location','Zone','Stock','Reserved','Available','Min','Max','Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td style={td}><div style={{ fontWeight: 500 }}>{l.productName}</div></td>
                <td style={{ ...td, color: '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}>{l.productSku}</td>
                <td style={td}>{l.locationName}</td>
                <td style={td}><span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{l.zone || '—'}</span></td>
                <td style={{ ...td, fontWeight: 700 }}>{l.quantity}</td>
                <td style={{ ...td, color: l.reservedQuantity > 0 ? '#0891b2' : '#9ca3af' }}>{l.reservedQuantity ?? 0}</td>
                <td style={{ ...td, fontWeight: 600, color: (l.availableQuantity ?? l.quantity) === 0 ? '#ef4444' : '#059669' }}>{l.availableQuantity ?? l.quantity}</td>
                <td style={{ ...td, color: '#9ca3af' }}>{l.minQuantity}</td>
                <td style={{ ...td, color: '#9ca3af' }}>{l.maxQuantity || '—'}</td>
                <td style={td}>
                  {l.outOfStock && <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginRight: 4 }}>Out</span>}
                  {l.lowStock   && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginRight: 4 }}>Low</span>}
                  {l.overstock  && <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginRight: 4 }}>Over</span>}
                  {!l.outOfStock && !l.lowStock && !l.overstock && <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No stock levels match this filter</div>}
      </div>
    </div>
  )
}
