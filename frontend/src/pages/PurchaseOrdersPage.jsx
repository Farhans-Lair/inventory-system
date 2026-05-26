import { useState, useEffect } from 'react'
import { supplierApi } from '../api/client'

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

  const load = () => supplierApi.getPurchaseOrders().then(r=>setPos(r.data))
  useEffect(()=>{ load(); supplierApi.getSuppliers().then(r=>setSuppliers(r.data)) },[])

  const save = async e => {
    e.preventDefault()
    await supplierApi.createPo({ ...form, createdBy:'current-user' })
    setShow(false); load()
  }

  const addLine = () => setForm({...form, lines:[...form.lines,{productSku:'',productName:'',productId:'',orderedQuantity:1,unitPrice:''}]})
  const updateLine = (i,k,v) => { const l=[...form.lines]; l[i]={...l[i],[k]:v}; setForm({...form,lines:l}) }

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
                  {po.status==='DRAFT'    && <button style={btn('#0891b2')} onClick={()=>supplierApi.updatePoStatus(po.id,'SENT').then(load)}>Mark Sent</button>}
                  {po.status==='SENT'     && <button style={btn('#059669')} onClick={()=>supplierApi.updatePoStatus(po.id,'CONFIRMED').then(load)}>Confirm</button>}
                  {po.status!=='RECEIVED' && po.status!=='CANCELLED' && <button style={btn('#f59e0b')} onClick={()=>supplierApi.updatePoStatus(po.id,'RECEIVED').then(load)}>Received</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
