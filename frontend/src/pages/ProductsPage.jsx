import { useState, useEffect, useRef } from 'react'
import { inventoryApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  sku: '', name: '', description: '', category: '', unit: 'pcs',
  costPrice: '', sellingPrice: '', imageUrl: '', hasExpiryTracking: false
}

export default function ProductsPage() {
  const [products,  setProducts]  = useState([])
  const [form,      setForm]      = useState(EMPTY)
  const [editing,   setEditing]   = useState(null)
  const [expanded,  setExpanded]  = useState(null)  // product id with open variants panel
  const [variants,  setVariants]  = useState({})    // productId -> variant[]
  const [barcode,   setBarcode]   = useState(null)  // { productId, imageBase64, type }
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [varForm,   setVarForm]   = useState({ sku:'', name:'', attributes:'', costPriceOverride:'', sellingPriceOverride:'' })
  const fileRef = useRef()
  const { isAdmin, canWrite } = useAuth()

  const load = () => inventoryApi.getProducts().then(r => setProducts(r.data))
  useEffect(() => { load() }, [])

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      const payload = {
        ...form,
        costPrice:    form.costPrice    ? parseFloat(form.costPrice)    : null,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
      }
      if (editing) await inventoryApi.updateProduct(editing, payload)
      else         await inventoryApi.createProduct(payload)
      setForm(EMPTY); setEditing(null); load()
      setSuccess(editing ? 'Product updated.' : 'Product created.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { setError(err.response?.data?.message || 'Error saving product') }
  }

  const startEdit = p => {
    setEditing(p.id)
    setForm({ sku: p.sku, name: p.name, description: p.description || '',
      category: p.category || '', unit: p.unit,
      costPrice: p.costPrice ?? '', sellingPrice: p.sellingPrice ?? '',
      imageUrl: p.imageUrl || '', hasExpiryTracking: p.hasExpiryTracking || false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uploadImage = async (productId, file) => {
    try { await inventoryApi.uploadProductImage(productId, file); load() }
    catch (err) { alert(err.response?.data?.message || 'Upload failed') }
  }

  const showBarcode = async (productId, type) => {
    try {
      const r = await inventoryApi.getBarcode(productId, type)
      setBarcode({ productId, ...r.data })
    } catch (err) { alert('Barcode generation failed') }
  }

  const exportCsv = async () => {
    const res = await inventoryApi.exportProductsCsv()
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href=url; a.download='products.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const toggleVariants = async id => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!variants[id]) {
      const r = await inventoryApi.getVariants(id)
      setVariants(v => ({...v, [id]: r.data}))
    }
  }

  const addVariant = async (productId, e) => {
    e.preventDefault()
    try {
      await inventoryApi.createVariant(productId, {
        ...varForm,
        costPriceOverride:    varForm.costPriceOverride    ? parseFloat(varForm.costPriceOverride)    : null,
        sellingPriceOverride: varForm.sellingPriceOverride ? parseFloat(varForm.sellingPriceOverride) : null,
      })
      setVarForm({ sku:'', name:'', attributes:'', costPriceOverride:'', sellingPriceOverride:'' })
      const r = await inventoryApi.getVariants(productId)
      setVariants(v => ({...v, [productId]: r.data}))
    } catch (err) { alert(err.response?.data?.message || 'Error adding variant') }
  }

  const inp = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
  const th  = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
  const td  = { padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }
  const lbl = { fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Products</h1>
        <button onClick={exportCsv} style={{ padding: '7px 16px', background: '#f3f4f6', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>↓ Export CSV</button>
      </div>

      {/* Barcode modal */}
      {barcode && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, maxWidth:380, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontWeight:600 }}>{barcode.type} — {barcode.sku}</div>
              <button onClick={() => setBarcode(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9ca3af' }}>✕</button>
            </div>
            <img src={`data:image/png;base64,${barcode.imageBase64}`} alt="barcode"
              style={{ width:'100%', imageRendering:'pixelated', border:'1px solid #e5e7eb', borderRadius:6 }} />
            <div style={{ marginTop:10, fontSize:12, color:'#6b7280', textAlign:'center' }}>{barcode.barcodeValue}</div>
            <a href={`data:image/png;base64,${barcode.imageBase64}`} download={`${barcode.sku}-${barcode.type}.png`}
              style={{ display:'block', marginTop:12, textAlign:'center', color:'var(--primary)', fontSize:13 }}>
              ↓ Download PNG
            </a>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {canWrite && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: `1px solid ${editing ? '#a5b4fc' : 'var(--border)'}`, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: editing ? 'var(--primary)' : 'inherit' }}>
              {editing ? '✏ Editing product' : 'Add product'}
            </h2>
            {editing && <button onClick={() => { setEditing(null); setForm(EMPTY) }} style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:13 }}>✕ Cancel</button>}
          </div>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>SKU *</label>
              <input style={{ ...inp, background: editing ? '#f9fafb' : '#fff' }} value={form.sku} onChange={e => setForm(f => ({...f, sku:e.target.value}))} required disabled={!!editing} /></div>
            <div><label style={lbl}>Name *</label>
              <input style={inp} value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} required /></div>
            <div><label style={lbl}>Category</label>
              <input style={inp} value={form.category} onChange={e => setForm(f => ({...f, category:e.target.value}))} /></div>
            <div><label style={lbl}>Unit *</label>
              <select style={inp} value={form.unit} onChange={e => setForm(f => ({...f, unit:e.target.value}))}>
                {['pcs','kg','g','liters','ml','boxes','pallets','rolls','meters','pairs'].map(u => <option key={u} value={u}>{u}</option>)}
              </select></div>
            <div><label style={lbl}>Cost price</label>
              <input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={form.costPrice} onChange={e => setForm(f => ({...f, costPrice:e.target.value}))} /></div>
            <div><label style={lbl}>Selling price</label>
              <input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={form.sellingPrice} onChange={e => setForm(f => ({...f, sellingPrice:e.target.value}))} /></div>
            <div style={{ gridColumn:'span 2' }}><label style={lbl}>Description</label>
              <input style={inp} value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} /></div>
            <div><label style={lbl}>Image URL (or upload below)</label>
              <input style={inp} placeholder="https://…" value={form.imageUrl} onChange={e => setForm(f => ({...f, imageUrl:e.target.value}))} /></div>
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:18 }}>
              <input type="checkbox" id="expiry" checked={form.hasExpiryTracking} onChange={e => setForm(f => ({...f, hasExpiryTracking:e.target.checked}))} />
              <label htmlFor="expiry" style={{ fontSize:13, cursor:'pointer' }}>Track expiry / batch lots</label>
            </div>
            {error   && <div style={{ gridColumn:'span 3', color:'var(--danger)', fontSize:12, background:'#fef2f2', padding:'8px 12px', borderRadius:6 }}>{error}</div>}
            {success && <div style={{ gridColumn:'span 3', color:'#16a34a', fontSize:12, background:'#f0fdf4', padding:'8px 12px', borderRadius:6 }}>{success}</div>}
            <div><button type="submit" style={{ background:'var(--primary)', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontWeight:600, cursor:'pointer', fontSize:13 }}>
              {editing ? 'Update' : 'Add product'}
            </button></div>
          </form>
        </div>
      )}

      {/* Products table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['SKU','Name','Category','Unit','Cost','Sell','Stock','Expiry','Status',...(canWrite?['Actions']:[])].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {products.map(p => [
              <tr key={p.id} style={{ background: editing===p.id?'#fafafe':p.active?'#fff':'#fafafa' }}>
                <td style={{ ...td, fontFamily:'monospace', fontSize:12, color:'#6b7280' }}>{p.sku}</td>
                <td style={td}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width:28, height:28, objectFit:'cover', borderRadius:4, border:'1px solid #e5e7eb' }} onError={e=>e.target.style.display='none'} />}
                    <div>
                      <div style={{ fontWeight:500, color:p.active?'#111827':'#9ca3af' }}>{p.name}</div>
                      {p.description && <div style={{ color:'#9ca3af', fontSize:11 }}>{p.description}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ ...td, color:'#6b7280' }}>{p.category||'—'}</td>
                <td style={{ ...td, color:'#6b7280' }}>{p.unit}</td>
                <td style={{ ...td, color:'#6b7280', fontSize:12 }}>{p.costPrice!=null?`₹${p.costPrice}`:'—'}</td>
                <td style={{ ...td, color:'#6b7280', fontSize:12 }}>{p.sellingPrice!=null?`₹${p.sellingPrice}`:'—'}</td>
                <td style={{ ...td, fontWeight:700, color:p.totalQuantity===0?'#ef4444':'#374151' }}>{p.totalQuantity}</td>
                <td style={td}>{p.hasExpiryTracking?<span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>Tracked</span>:<span style={{ color:'#d1d5db', fontSize:12 }}>—</span>}</td>
                <td style={td}><span style={{ background:p.active?'#dcfce7':'#fee2e2', color:p.active?'#16a34a':'#dc2626', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{p.active?'Active':'Inactive'}</span></td>
                {canWrite && (
                  <td style={{ ...td, whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      <button onClick={() => startEdit(p)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:11 }}>Edit</button>
                      <button onClick={() => showBarcode(p.id, 'CODE128')} style={{ background:'none', border:'1px solid #e0e7ff', color:'#4f46e5', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:11 }}>Barcode</button>
                      <button onClick={() => showBarcode(p.id, 'QR')} style={{ background:'none', border:'1px solid #e0e7ff', color:'#4f46e5', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:11 }}>QR</button>
                      <label style={{ background:'none', border:'1px solid #bbf7d0', color:'#059669', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:11 }}>
                        Upload img <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { if(e.target.files[0]) uploadImage(p.id, e.target.files[0]); e.target.value='' }} />
                      </label>
                      <button onClick={() => toggleVariants(p.id)} style={{ background:'none', border:'1px solid #d1d5db', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:11 }}>Variants {expanded===p.id?'▲':'▼'}</button>
                      {isAdmin && (p.active
                        ? <button onClick={() => inventoryApi.deactivateProduct(p.id).then(load)} style={{ background:'none', border:'1px solid #fecaca', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#ef4444' }}>Deactivate</button>
                        : <button onClick={() => inventoryApi.activateProduct(p.id).then(load)}   style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:5, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#16a34a', fontWeight:600 }}>Activate</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>,
              // Variants panel
              expanded === p.id && (
                <tr key={`var-${p.id}`}>
                  <td colSpan={canWrite ? 10 : 9} style={{ background:'#f8fafc', padding:'16px 20px', borderBottom:'1px solid #e5e7eb' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:'var(--primary)' }}>Variants for {p.name}</div>
                    {/* Variant form */}
                    <form onSubmit={e => addVariant(p.id, e)} style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:14 }}>
                      <input style={{ ...inp, fontSize:12 }} placeholder="Variant SKU *" value={varForm.sku} onChange={e => setVarForm(f=>({...f,sku:e.target.value}))} required />
                      <input style={{ ...inp, fontSize:12 }} placeholder="Name e.g. Red/XL" value={varForm.name} onChange={e => setVarForm(f=>({...f,name:e.target.value}))} required />
                      <input style={{ ...inp, fontSize:12 }} placeholder="attrs: color=Red|size=XL" value={varForm.attributes} onChange={e => setVarForm(f=>({...f,attributes:e.target.value}))} />
                      <input style={{ ...inp, fontSize:12 }} type="number" min="0" step="0.01" placeholder="Cost override" value={varForm.costPriceOverride} onChange={e => setVarForm(f=>({...f,costPriceOverride:e.target.value}))} />
                      <button type="submit" style={{ background:'var(--primary)', color:'#fff', border:'none', borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:600 }}>+ Add</button>
                    </form>
                    {/* Variant list */}
                    {(variants[p.id] || []).length === 0
                      ? <div style={{ color:'#9ca3af', fontSize:12 }}>No variants yet</div>
                      : (variants[p.id] || []).map(v => (
                        <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 10px', background:'#fff', borderRadius:6, border:'1px solid #e5e7eb', marginBottom:6 }}>
                          <span style={{ fontFamily:'monospace', fontSize:11, color:'#6b7280' }}>{v.sku}</span>
                          <span style={{ fontWeight:500, fontSize:13 }}>{v.name}</span>
                          {v.attributesMap && Object.entries(v.attributesMap).map(([k,val]) => (
                            <span key={k} style={{ background:'#f3f4f6', padding:'1px 6px', borderRadius:10, fontSize:11, color:'#374151' }}>{k}: {val}</span>
                          ))}
                          {v.costPriceOverride && <span style={{ fontSize:11, color:'#6b7280' }}>Cost: ₹{v.costPriceOverride}</span>}
                          <span style={{ marginLeft:'auto', background:v.active?'#dcfce7':'#fee2e2', color:v.active?'#16a34a':'#dc2626', padding:'1px 8px', borderRadius:20, fontSize:10, fontWeight:600 }}>{v.active?'Active':'Inactive'}</span>
                          <button onClick={() => inventoryApi.toggleVariant(p.id, v.id).then(async () => { const r=await inventoryApi.getVariants(p.id); setVariants(vv=>({...vv,[p.id]:r.data})) })} style={{ background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'2px 8px', fontSize:11, cursor:'pointer' }}>Toggle</button>
                        </div>
                      ))
                    }
                  </td>
                </tr>
              )
            ])}
          </tbody>
        </table>
        {products.length === 0 && <div style={{ padding:32, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No products yet.</div>}
      </div>
    </div>
  )
}
