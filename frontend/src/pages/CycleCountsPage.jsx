import { useState, useEffect } from 'react'
import { inventoryApi } from '../api/client'

const card = { background:'#fff', borderRadius:10, padding:'20px 24px', border:'1px solid var(--border)', marginBottom:20 }
const btn = (c='#4f46e5') => ({ padding:'6px 14px', background:c, color:'#fff', border:'none', borderRadius:6, fontSize:13, cursor:'pointer' })
const inp = { padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, width:'100%', boxSizing:'border-box' }

export default function CycleCountsPage() {
  const [pending,       setPending]       = useState([])
  const [discrepancies, setDiscrepancies] = useState([])
  const [submitting,    setSubmitting]    = useState({})  // id -> countedQuantity

  const load = () => {
    inventoryApi.getPendingCounts().then(r=>setPending(r.data)).catch(()=>{})
    inventoryApi.getDiscrepancies().then(r=>setDiscrepancies(r.data)).catch(()=>{})
  }
  useEffect(()=>{ load() }, [])

  const submit = async (id, qty) => {
    await inventoryApi.submitCycleCount(id, { countedQuantity: parseInt(qty), notes: '' })
    setSubmitting(s=>({...s,[id]:undefined})); load()
  }

  const reconcile = async id => {
    await inventoryApi.reconcileCycleCount(id); load()
  }

  return (
    <div>
      <h1 style={{fontSize:22,fontWeight:600,marginBottom:6}}>Cycle Counts</h1>
      <p style={{color:'#6b7280',fontSize:13,marginBottom:24}}>Physical stock verification and reconciliation</p>

      <div style={card}>
        <h2 style={{fontSize:15,fontWeight:600,marginBottom:14}}>Pending counts ({pending.length})</h2>
        {pending.length===0 ? <div style={{color:'#6b7280',fontSize:13}}>No pending counts</div> : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
              {['Product','Location','System Qty','Counted By','Action'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:500,color:'#6b7280'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {pending.map(c=>(
                <tr key={c.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                  <td style={{padding:'8px 12px',fontWeight:500}}>{c.productName}</td>
                  <td style={{padding:'8px 12px',color:'#6b7280'}}>{c.locationName}</td>
                  <td style={{padding:'8px 12px'}}>{c.systemQuantity}</td>
                  <td style={{padding:'8px 12px',color:'#6b7280'}}>{c.countedBy}</td>
                  <td style={{padding:'8px 12px',display:'flex',gap:6}}>
                    <input type="number" min="0" placeholder="Count" style={{...inp,width:80}}
                      value={submitting[c.id]??''} onChange={e=>setSubmitting(s=>({...s,[c.id]:e.target.value}))} />
                    <button style={btn()} onClick={()=>submit(c.id,submitting[c.id])}>Submit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={card}>
        <h2 style={{fontSize:15,fontWeight:600,marginBottom:14,color:'#f59e0b'}}>⚠ Discrepancies ({discrepancies.length})</h2>
        {discrepancies.length===0 ? <div style={{color:'#6b7280',fontSize:13}}>No discrepancies</div> : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
              {['Product','Location','System','Counted','Variance','Action'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:500,color:'#6b7280'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {discrepancies.map(c=>(
                <tr key={c.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                  <td style={{padding:'8px 12px',fontWeight:500}}>{c.productName}</td>
                  <td style={{padding:'8px 12px',color:'#6b7280'}}>{c.locationName}</td>
                  <td style={{padding:'8px 12px'}}>{c.systemQuantity}</td>
                  <td style={{padding:'8px 12px'}}>{c.countedQuantity}</td>
                  <td style={{padding:'8px 12px',color:c.variance<0?'#ef4444':'#f59e0b',fontWeight:600}}>{c.variance>0?'+':''}{c.variance}</td>
                  <td style={{padding:'8px 12px'}}>
                    <button style={btn('#059669')} onClick={()=>reconcile(c.id)}>Reconcile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
