import { useState, useEffect } from 'react'
import { inventoryApi } from './client'

const inp = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' }
const btn = (bg = 'var(--primary)') => ({ padding: '7px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 })
const card = { background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: '20px 24px', marginBottom: 20 }

export default function UomPage() {
  const [conversions, setConversions] = useState([])
  const [form, setForm] = useState({ fromUnit: '', toUnit: '', factor: '', description: '' })
  const [conv, setConv] = useState({ from: '', to: '', qty: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const load = () => inventoryApi.getUomConversions().then(r => setConversions(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const save = async e => {
    e.preventDefault(); setError('')
    try {
      await inventoryApi.createUomConversion({ ...form, factor: parseFloat(form.factor) })
      setForm({ fromUnit: '', toUnit: '', factor: '', description: '' }); load()
    } catch (err) { setError(err.response?.data?.message || 'Error saving conversion') }
  }

  const doConvert = async e => {
    e.preventDefault(); setResult(null); setError('')
    try {
      const r = await inventoryApi.convertUom(conv.from, conv.to, parseFloat(conv.qty))
      setResult(r.data)
    } catch (err) { setError(err.response?.data?.message || 'No conversion rule found') }
  }

  const th = { padding: '9px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }
  const td = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Unit of Measure Conversions</h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>Define how many units of one measure equal another</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
        {/* Add conversion */}
        <div style={card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Add conversion rule</h2>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', color: '#991b1b', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <form onSubmit={save} style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 3 }}>From unit *</label>
                <input style={inp} placeholder="e.g. box" value={form.fromUnit} onChange={e => setForm(f => ({...f, fromUnit: e.target.value}))} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 3 }}>To unit *</label>
                <input style={inp} placeholder="e.g. pcs" value={form.toUnit} onChange={e => setForm(f => ({...f, toUnit: e.target.value}))} required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 3 }}>Factor * (1 {form.fromUnit || 'fromUnit'} = ? {form.toUnit || 'toUnit'})</label>
              <input style={inp} type="number" min="0.0001" step="any" placeholder="e.g. 24" value={form.factor} onChange={e => setForm(f => ({...f, factor: e.target.value}))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 3 }}>Description</label>
              <input style={inp} placeholder="e.g. 1 box = 24 pieces" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            </div>
            <button type="submit" style={btn()}>Add rule</button>
          </form>
        </div>

        {/* Quick converter */}
        <div style={card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Quick converter</h2>
          <form onSubmit={doConvert} style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 3 }}>From</label>
                <input style={inp} placeholder="box" value={conv.from} onChange={e => setConv(c => ({...c, from: e.target.value}))} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 3 }}>To</label>
                <input style={inp} placeholder="pcs" value={conv.to} onChange={e => setConv(c => ({...c, to: e.target.value}))} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 3 }}>Quantity</label>
                <input style={inp} type="number" min="0" step="any" placeholder="5" value={conv.qty} onChange={e => setConv(c => ({...c, qty: e.target.value}))} required />
              </div>
            </div>
            <button type="submit" style={btn('#059669')}>Convert →</button>
          </form>
          {result && (
            <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#166534' }}>
                {conv.qty} {conv.from} = <span style={{ color: '#059669' }}>{result.convertedQuantity?.toFixed(4)}</span> {conv.to}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Factor: 1 {result.fromUnit} = {result.factor} {result.toUnit}</div>
            </div>
          )}
        </div>
      </div>

      {/* Conversions table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>All conversion rules ({conversions.length})</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['From', 'To', 'Factor', 'Description', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {conversions.map(c => (
              <tr key={c.id}>
                <td style={{ ...td, fontWeight: 600 }}>{c.fromUnit}</td>
                <td style={{ ...td, fontWeight: 600 }}>{c.toUnit}</td>
                <td style={td}><span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>1 : {c.factor}</span></td>
                <td style={{ ...td, color: '#6b7280' }}>{c.description || '—'}</td>
                <td style={td}>
                  <button onClick={() => inventoryApi.deleteUomConversion(c.id).then(load)}
                    style={{ ...btn('#ef4444'), padding: '4px 10px', fontSize: 12 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {conversions.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No conversion rules yet</div>}
      </div>
    </div>
  )
}
