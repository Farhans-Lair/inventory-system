import { useState, useEffect } from 'react'
import { inventoryApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const EMPTY = { sku: '', name: '', description: '', category: '', unit: 'pcs' }

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [form, setForm]         = useState(EMPTY)
  const [editing, setEditing]   = useState(null)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const { isAdmin }             = useAuth()

  const load = () => inventoryApi.getProducts().then(r => setProducts(r.data))
  useEffect(() => { load() }, [])

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      if (editing) { await inventoryApi.updateProduct(editing, form) }
      else         { await inventoryApi.createProduct(form) }
      setForm(EMPTY); setEditing(null); load()
      setSuccess(editing ? 'Product updated.' : 'Product added.')
      setTimeout(() => setSuccess(''), 3000)
    } catch(err) { setError(err.response?.data?.message || 'Error saving product') }
  }

  const deactivate = async id => {
    if (!confirm('Deactivate this product? Stock levels will be preserved.')) return
    try { await inventoryApi.deactivateProduct(id); load() }
    catch(err) { alert(err.response?.data?.message || 'Error deactivating product') }
  }

  const activate = async id => {
    try { await inventoryApi.activateProduct(id); load() }
    catch(err) { alert(err.response?.data?.message || 'Error activating product') }
  }

  const startEdit = p => {
    setEditing(p.id)
    setForm({ sku: p.sku, name: p.name, description: p.description || '', category: p.category || '', unit: p.unit })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const inp = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: '100%' }
  const th  = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
  const td  = { padding: '11px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Products</h1>

      {/* Add / Edit form — admin only */}
      {isAdmin && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: `1px solid ${editing ? '#a5b4fc' : 'var(--border)'}`, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: editing ? 'var(--primary)' : 'inherit' }}>
              {editing ? '✏ Editing product' : 'Add product'}
            </h2>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(EMPTY) }}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
                ✕ Cancel
              </button>
            )}
          </div>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>SKU *</label>
              <input style={{ ...inp, background: editing ? '#f9fafb' : '#fff' }}
                value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} required disabled={!!editing} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Name *</label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Category</label>
              <input style={inp} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Unit *</label>
              <input style={inp} value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} required />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Description</label>
              <input style={inp} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>
            {error   && <div style={{ gridColumn: 'span 3', color: 'var(--danger)', fontSize: 12, background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
            {success && <div style={{ gridColumn: 'span 3', color: '#16a34a', fontSize: 12, background: '#f0fdf4', padding: '8px 12px', borderRadius: 6 }}>{success}</div>}
            <div>
              <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                {editing ? 'Update product' : 'Add product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['SKU', 'Name', 'Category', 'Unit', 'Total stock', 'Status', ...(isAdmin ? ['Actions'] : [])].map(h =>
                <th key={h} style={th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ background: editing === p.id ? '#fafafe' : p.active ? '#fff' : '#fafafa' }}>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{p.sku}</td>
                <td style={td}>
                  <div style={{ fontWeight: 500, color: p.active ? '#111827' : '#9ca3af' }}>{p.name}</div>
                  {p.description && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 1 }}>{p.description}</div>}
                </td>
                <td style={{ ...td, color: '#6b7280' }}>{p.category || '—'}</td>
                <td style={{ ...td, color: '#6b7280' }}>{p.unit}</td>
                <td style={{ ...td, fontWeight: 700, color: p.totalQuantity === 0 ? '#ef4444' : '#374151', fontSize: 15 }}>
                  {p.totalQuantity}
                </td>
                <td style={td}>
                  <span style={{
                    background: p.active ? '#dcfce7' : '#fee2e2',
                    color:      p.active ? '#16a34a' : '#dc2626',
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600
                  }}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => startEdit(p)} style={{
                        background: 'none', border: '1px solid var(--border)',
                        borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12
                      }}>Edit</button>

                      {p.active ? (
                        <button onClick={() => deactivate(p.id)} style={{
                          background: 'none', border: '1px solid #fecaca',
                          borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#ef4444'
                        }}>Deactivate</button>
                      ) : (
                        <button onClick={() => activate(p.id)} style={{
                          background: '#f0fdf4', border: '1px solid #86efac',
                          borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#16a34a',
                          fontWeight: 600
                        }}>✓ Activate</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No products yet. Add your first product above.
          </div>
        )}
      </div>
    </div>
  )
}
