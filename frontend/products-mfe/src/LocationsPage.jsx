import { useState, useEffect } from 'react'
import { inventoryApi } from './client'
import { useAuth } from './authContext'

const EMPTY = { name: '', zone: '', description: '', capacity: '' }

export default function LocationsPage() {
  const [locations, setLocations] = useState([])
  const [form, setForm]           = useState(EMPTY)
  const [error, setError]         = useState('')
  const { isAdmin }               = useAuth() || {}

  const load = () => inventoryApi.getLocations().then(r => setLocations(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const submit = async e => {
    e.preventDefault(); setError('')
    try {
      await inventoryApi.createLocation({ ...form, capacity: form.capacity ? Number(form.capacity) : null })
      setForm(EMPTY); load()
    } catch(err) { setError(err.response?.data?.message || 'Error saving location') }
  }

  const inp = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: '100%' }
  const th  = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
  const td  = { padding: '11px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Warehouse Locations</h1>

      {isAdmin && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Add Location</h2>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Name *</label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Zone-A Shelf-01" required /></div>
            <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Zone *</label>
              <input style={inp} value={form.zone} onChange={e => setForm(f => ({...f, zone: e.target.value}))} placeholder="A" required /></div>
            <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Capacity</label>
              <input style={inp} type="number" value={form.capacity} onChange={e => setForm(f => ({...f, capacity: e.target.value}))} placeholder="500" /></div>
            <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Description</label>
              <input style={inp} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            {error && <div style={{ gridColumn: 'span 4', color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
            <div>
              <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Add Location</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['Name','Zone','Description','Capacity','Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {locations.map(l => (
              <tr key={l.id}>
                <td style={{...td, fontWeight: 500}}>{l.name}</td>
                <td style={td}><span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{l.zone}</span></td>
                <td style={{...td, color: '#6b7280'}}>{l.description || '—'}</td>
                <td style={td}>{l.capacity ? l.capacity.toLocaleString() + ' units' : '—'}</td>
                <td style={td}><span style={{ background: l.active ? '#dcfce7' : '#f3f4f6', color: l.active ? '#16a34a' : '#9ca3af', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{l.active ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {locations.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No locations yet</div>}
      </div>
    </div>
  )
}
