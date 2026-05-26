import { useState, useEffect } from 'react'
import { inventoryApi } from '../api/client'

const card = { background:'#fff', borderRadius:10, padding:'20px 24px', border:'1px solid var(--border)', marginBottom:20 }
const btn = (c='#4f46e5') => ({ padding:'6px 14px', background:c, color:'#fff', border:'none', borderRadius:6, fontSize:13, cursor:'pointer' })

export default function BatchLotsPage() {
  const [expiring, setExpiring] = useState([])
  const [expired,  setExpired]  = useState([])
  const [days,     setDays]     = useState(30)

  const load = () => {
    inventoryApi.getExpiringSoon(days).then(r=>setExpiring(r.data)).catch(()=>{})
    inventoryApi.getExpired().then(r=>setExpired(r.data)).catch(()=>{})
  }
  useEffect(()=>{ load() }, [days])

  const row = (b, isExp) => (
    <tr key={b.id} style={{borderBottom:'1px solid #f3f4f6'}}>
      <td style={{padding:'8px 12px',fontWeight:500}}>{b.productName}</td>
      <td style={{padding:'8px 12px',color:'#6b7280'}}>{b.lotNumber}</td>
      <td style={{padding:'8px 12px',color:'#6b7280'}}>{b.locationName}</td>
      <td style={{padding:'8px 12px'}}>{b.quantity}</td>
      <td style={{padding:'8px 12px',color:'#6b7280'}}>{b.manufactureDate}</td>
      <td style={{padding:'8px 12px',color:isExp?'#ef4444':'#f59e0b',fontWeight:500}}>{b.expiryDate}</td>
    </tr>
  )

  const thead = (
    <thead><tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
      {['Product','Lot#','Location','Qty','Mfg Date','Expiry'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:500,color:'#6b7280'}}>{h}</th>)}
    </tr></thead>
  )

  return (
    <div>
      <h1 style={{fontSize:22,fontWeight:600,marginBottom:6}}>Batch & Lot Tracking</h1>
      <p style={{color:'#6b7280',fontSize:13,marginBottom:24}}>Monitor expiry dates and batch numbers</p>

      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:600,color:'#f59e0b'}}>⏱ Expiring within {days} days ({expiring.length})</h2>
          <select value={days} onChange={e=>setDays(Number(e.target.value))} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #d1d5db',fontSize:13}}>
            {[7,14,30,60,90].map(d=><option key={d} value={d}>{d} days</option>)}
          </select>
        </div>
        {expiring.length===0 ? <div style={{color:'#6b7280',fontSize:13}}>No items expiring in this window</div> : (
          <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>{thead}<tbody>{expiring.map(b=>row(b,false))}</tbody></table></div>
        )}
      </div>

      <div style={card}>
        <h2 style={{fontSize:15,fontWeight:600,color:'#ef4444',marginBottom:14}}>✕ Already expired ({expired.length})</h2>
        {expired.length===0 ? <div style={{color:'#6b7280',fontSize:13}}>No expired batches with remaining stock</div> : (
          <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>{thead}<tbody>{expired.map(b=>row(b,true))}</tbody></table></div>
        )}
      </div>
    </div>
  )
}
