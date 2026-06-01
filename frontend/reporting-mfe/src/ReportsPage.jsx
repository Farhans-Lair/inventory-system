import { useState, useEffect } from 'react'
import { reportingApi } from './client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const card = { background:'#fff', borderRadius:10, padding:'20px 24px', border:'1px solid var(--border)', marginBottom:20 }

export default function ReportsPage() {
  const [valuation, setValuation] = useState([])
  const [trend,     setTrend]     = useState([])
  const [days,      setDays]      = useState(30)

  useEffect(() => {
    reportingApi.getValuation().then(r => setValuation(r.data)).catch(()=>{})
  }, [])

  useEffect(() => {
    reportingApi.getTrend(days).then(r => {
      const map = {}
      r.data.forEach(({day,type,total}) => { if (!map[day]) map[day]={day}; map[day][type]=total })
      setTrend(Object.values(map))
    }).catch(()=>{})
  }, [days])

  const downloadCsv = async () => {
    const res = await reportingApi.exportValuation()
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href=url; a.download='valuation.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalCost = valuation.reduce((s,r)=>s+(r.totalCostValue||0),0)
  const totalSell = valuation.reduce((s,r)=>s+(r.totalSellingValue||0),0)

  return (
    <div>
      <h1 style={{fontSize:22,fontWeight:600,marginBottom:6}}>Reports</h1>
      <p style={{color:'#6b7280',fontSize:13,marginBottom:24}}>Inventory valuation and movement analytics</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:24}}>
        <div style={card}><div style={{color:'#6b7280',fontSize:12,textTransform:'uppercase',letterSpacing:.5}}>Total Cost Value</div><div style={{fontSize:24,fontWeight:700,color:'#4f46e5'}}>₹{totalCost.toLocaleString()}</div></div>
        <div style={card}><div style={{color:'#6b7280',fontSize:12,textTransform:'uppercase',letterSpacing:.5}}>Total Selling Value</div><div style={{fontSize:24,fontWeight:700,color:'#059669'}}>₹{totalSell.toLocaleString()}</div></div>
      </div>

      {/* Movement trend */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:600}}>Movement trend</h2>
          <select value={days} onChange={e=>setDays(Number(e.target.value))} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #d1d5db',fontSize:13}}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trend}>
            <XAxis dataKey="day" tick={{fontSize:10}} interval="preserveStartEnd" />
            <YAxis tick={{fontSize:11}} />
            <Tooltip />
            <Legend />
            <Bar dataKey="INBOUND"  fill="#22c55e" radius={[3,3,0,0]} />
            <Bar dataKey="OUTBOUND" fill="#ef4444" radius={[3,3,0,0]} />
            <Bar dataKey="TRANSFER" fill="#f59e0b" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Valuation table */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:600}}>Stock valuation</h2>
          <button onClick={downloadCsv} style={{padding:'6px 14px',background:'#4f46e5',color:'#fff',border:'none',borderRadius:6,fontSize:13,cursor:'pointer'}}>Export CSV</button>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
              {['SKU','Name','Category','Qty','Cost/unit','Total Cost','Sell/unit','Total Sell'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:500,color:'#6b7280'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {valuation.map(r=>(
                <tr key={r.productId} style={{borderBottom:'1px solid #f3f4f6'}}>
                  <td style={{padding:'8px 12px',color:'#6b7280'}}>{r.sku}</td>
                  <td style={{padding:'8px 12px',fontWeight:500}}>{r.name}</td>
                  <td style={{padding:'8px 12px',color:'#6b7280'}}>{r.category}</td>
                  <td style={{padding:'8px 12px'}}>{r.totalQuantity}</td>
                  <td style={{padding:'8px 12px'}}>₹{r.costPrice}</td>
                  <td style={{padding:'8px 12px',color:'#4f46e5',fontWeight:500}}>₹{r.totalCostValue}</td>
                  <td style={{padding:'8px 12px'}}>₹{r.sellingPrice}</td>
                  <td style={{padding:'8px 12px',color:'#059669',fontWeight:500}}>₹{r.totalSellingValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
