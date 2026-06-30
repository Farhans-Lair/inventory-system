import { useState, useEffect } from 'react'
import { supplierApi } from './client'

const card = { background:'#fff', borderRadius:10, padding:'20px 24px', border:'1px solid var(--border)', marginBottom:20 }
const btn = (c='#4f46e5') => ({ padding:'6px 14px', background:c, color:'#fff', border:'none', borderRadius:6, fontSize:13, cursor:'pointer' })
const inp = { padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, width:'100%', boxSizing:'border-box' }
const statusColor = s => ({ DRAFT:'#e5e7eb', SENT:'#bfdbfe', CONFIRMED:'#bbf7d0', PARTIALLY_RECEIVED:'#fde68a', RECEIVED:'#d1fae5', CANCELLED:'#fee2e2' }[s] || '#e5e7eb')
const statusText  = s => ({ DRAFT:'#374151', SENT:'#1e40af', CONFIRMED:'#166534', PARTIALLY_RECEIVED:'#92400e', RECEIVED:'#065f46', CANCELLED:'#991b1b' }[s] || '#374151')

export default function PurchaseOrdersPage() {
  const [pos,       setPos]       = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [show,      setShow]      = useState(false)
  const [form,      setForm]      = useState({ supplierId:'', notes:'', expectedDeliveryDate:'', lines:[{productSku:'',productName:'',productId:'',orderedQuantity:1,unitPrice:''}] })
  const [grnPo,     setGrnPo]     = useState(null)
  const [grnForm,   setGrnForm]   = useState({ productId:'', receivedQuantity:1, locationId:'', batchNumber:'', notes:'' })
  const [grnHistory,setGrnHistory]= useState([])

  const load = () => supplierApi.getPurchaseOrders().then(r=>setPos(r.data)).catch(() => {})
  useEffect(()=>{ load(); supplierApi.getSuppliers().then(r=>setSuppliers(r.data)).catch(()=>{}) },[])

  const save = async e => {
    e.preventDefault()
    await supplierApi.createPo({ ...form, createdBy:'current-user' })
    setShow(false); load()
  }

  const addLine = () => setForm({...form, lines:[...form.lines,{productSku:'',productName:'',productId:'',orderedQuantity:1,unitPrice:''}]})
  const updateLine = (i,k,v) => { const l=[...form.lines]; l[i]={...l[i],[k]:v}; setForm({...form,lines:l}) }

  // ── Receive Goods (GRN) ───────────────────────────────────────────────
  // Each GRN entry posts a single line's received quantity and records it
  // against inventory-service as real stock, instead of the old "Received"
  // button which only flipped a status flag with no effect on actual stock.
  const openGrn = po => {
    setGrnPo(po)
    const firstOpenLine = po.lines?.find(l => l.receivedQuantity < l.orderedQuantity)
    setGrnForm({
      productId: firstOpenLine?.productId || '',
      receivedQuantity: Math.max(1, (firstOpenLine?.orderedQuantity || 1) - (firstOpenLine?.receivedQuantity || 0)),
      locationId: '', batchNumber: '', notes: '',
    })
    supplierApi.getGrns(po.id).then(r => setGrnHistory(r.data)).catch(() => setGrnHistory([]))
  }
  const closeGrn = () => { setGrnPo(null); setGrnHistory([]) }

  const saveGrn = async e => {
    e.preventDefault()
    await supplierApi.receiveGoods(grnPo.id, { ...grnForm, receivedBy: 'current-user' })
    const refreshed = await supplierApi.getPurchaseOrders()
    setPos(refreshed.data)
    const updatedPo = refreshed.data.find(p => p.id === grnPo.id)
    if (updatedPo && updatedPo.status !== 'RECEIVED') {
      openGrn(updatedPo)   // keep modal open, pre-fill the next open line, refresh GRN history
    } else {
      closeGrn()
    }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:600}}>Purchase Orders</h1>
        <button style={btn()} onClick={()=>setShow(true)}>+ New PO</button>
      </div>

      {show && (
        <div style={{...card,border:'1px solid #c7d2fe'}}>
          <h2 style={{fontSize:15,fontWeight:600,marginBottom:14}}>New Purchase Order</h2>
          <form onSubmit={save}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
              <div><label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Supplier</label>
                <select style={inp} value={form.supplierId} onChange={e=>setForm({...form,supplierId:e.target.value})} required>
                  <option value="">Select supplier</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Expected delivery</label>
                <input type="date" style={inp} value={form.expectedDeliveryDate} onChange={e=>setForm({...form,expectedDeliveryDate:e.target.value})} />
              </div>
              <div><label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Notes</label>
                <input style={inp} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
              </div>
            </div>
            <h3 style={{fontSize:13,fontWeight:600,marginBottom:8}}>Line items</h3>
            {form.lines.map((l,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 2fr 80px 100px',gap:8,marginBottom:8}}>
                <input placeholder="SKU" style={inp} value={l.productSku} onChange={e=>updateLine(i,'productSku',e.target.value)} />
                <input placeholder="Product name" style={inp} value={l.productName} onChange={e=>updateLine(i,'productName',e.target.value)} />
                <input type="number" min="1" placeholder="Qty" style={inp} value={l.orderedQuantity} onChange={e=>updateLine(i,'orderedQuantity',parseInt(e.target.value))} />
                <input type="number" placeholder="Unit price" style={inp} value={l.unitPrice} onChange={e=>updateLine(i,'unitPrice',e.target.value)} />
              </div>
            ))}
            <button type="button" style={{...btn('#6b7280'),marginBottom:14}} onClick={addLine}>+ Add line</button>
            <div style={{display:'flex',gap:8}}>
              <button type="submit" style={btn()}>Create PO</button>
              <button type="button" style={btn('#6b7280')} onClick={()=>setShow(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={card}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
            {['PO #','Supplier','Status','Expected','Lines','Actions'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:500,color:'#6b7280'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {pos.map(po=>(
              <tr key={po.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                <td style={{padding:'8px 12px',fontWeight:600,color:'#4f46e5'}}>{po.poNumber}</td>
                <td style={{padding:'8px 12px'}}>{po.supplierName}</td>
                <td style={{padding:'8px 12px'}}><span style={{background:statusColor(po.status),color:statusText(po.status),padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>{po.status}</span></td>
                <td style={{padding:'8px 12px',color:'#6b7280'}}>{po.expectedDeliveryDate}</td>
                <td style={{padding:'8px 12px',color:'#6b7280'}}>{po.lines?.length || 0} items</td>
                <td style={{padding:'8px 12px',display:'flex',gap:4,flexWrap:'wrap'}}>
                  {po.status==='DRAFT'    && <button style={btn('#0891b2')} onClick={()=>supplierApi.updatePoStatus(po.id,'SENT').then(load).catch(()=>{})}>Mark Sent</button>}
                  {po.status==='SENT'     && <button style={btn('#059669')} onClick={()=>supplierApi.updatePoStatus(po.id,'CONFIRMED').then(load).catch(()=>{})}>Confirm</button>}
                  {(po.status==='CONFIRMED' || po.status==='SENT' || po.status==='PARTIALLY_RECEIVED')
                    && <button style={btn('#f59e0b')} onClick={()=>openGrn(po)}>Receive Goods</button>}
                  {(po.status==='PARTIALLY_RECEIVED' || po.status==='RECEIVED')
                    && <button style={btn('#6b7280')} onClick={()=>openGrn(po)}>View Receipts</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {grnPo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div style={{background:'#fff',borderRadius:10,padding:24,width:520,maxHeight:'85vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <h2 style={{fontSize:15,fontWeight:600}}>Receive Goods — {grnPo.poNumber}</h2>
              <button style={btn('#6b7280')} onClick={closeGrn}>Close</button>
            </div>

            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,marginBottom:16}}>
              <thead><tr style={{background:'#f9fafb'}}>
                {['SKU','Ordered','Received','Status'].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left',color:'#6b7280',fontWeight:500}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {grnPo.lines?.map(l=>(
                  <tr key={l.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                    <td style={{padding:'6px 8px',fontWeight:600}}>{l.productSku}</td>
                    <td style={{padding:'6px 8px'}}>{l.orderedQuantity}</td>
                    <td style={{padding:'6px 8px'}}>{l.receivedQuantity}</td>
                    <td style={{padding:'6px 8px'}}>
                      {l.receivedQuantity >= l.orderedQuantity
                        ? <span style={{color:'#059669',fontWeight:600}}>Complete</span>
                        : <span style={{color:'#d97706'}}>{l.orderedQuantity - l.receivedQuantity} remaining</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {grnPo.status !== 'RECEIVED' ? (
              <form onSubmit={saveGrn}>
                <h3 style={{fontSize:13,fontWeight:600,marginBottom:8}}>Record a receipt</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr',gap:10,marginBottom:14}}>
                  <div>
                    <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Product</label>
                    <select style={inp} value={grnForm.productId}
                      onChange={e=>setGrnForm({...grnForm,productId:e.target.value})} required>
                      <option value="">Select line item</option>
                      {grnPo.lines?.filter(l=>l.receivedQuantity < l.orderedQuantity).map(l=>
                        <option key={l.productId} value={l.productId}>
                          {l.productSku} — {l.orderedQuantity - l.receivedQuantity} remaining
                        </option>)}
                    </select>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div>
                      <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Quantity received</label>
                      <input type="number" min="1" style={inp} value={grnForm.receivedQuantity}
                        onChange={e=>setGrnForm({...grnForm,receivedQuantity:parseInt(e.target.value)||1})} required />
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Location ID</label>
                      <input style={inp} placeholder="e.g. warehouse location id" value={grnForm.locationId}
                        onChange={e=>setGrnForm({...grnForm,locationId:e.target.value})} required />
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div>
                      <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Batch / lot number (optional)</label>
                      <input style={inp} value={grnForm.batchNumber}
                        onChange={e=>setGrnForm({...grnForm,batchNumber:e.target.value})} />
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Notes (optional)</label>
                      <input style={inp} value={grnForm.notes}
                        onChange={e=>setGrnForm({...grnForm,notes:e.target.value})} />
                    </div>
                  </div>
                </div>
                <button type="submit" style={btn()}>Record receipt &amp; update stock</button>
              </form>
            ) : (
              <p style={{fontSize:13,color:'#059669',fontWeight:600}}>All lines fully received.</p>
            )}

            {grnHistory.length > 0 && (
              <div style={{marginTop:20}}>
                <h3 style={{fontSize:13,fontWeight:600,marginBottom:8}}>Receipt history</h3>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{background:'#f9fafb'}}>
                    {['Product','Qty','Location','Batch','Received'].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'left',color:'#6b7280',fontWeight:500}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {grnHistory.map(g=>(
                      <tr key={g.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                        <td style={{padding:'6px 8px'}}>{g.productId}</td>
                        <td style={{padding:'6px 8px'}}>{g.receivedQuantity}</td>
                        <td style={{padding:'6px 8px'}}>{g.locationId}</td>
                        <td style={{padding:'6px 8px'}}>{g.batchNumber || '—'}</td>
                        <td style={{padding:'6px 8px',color:'#6b7280'}}>{g.receivedAt?.slice(0,16).replace('T',' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
