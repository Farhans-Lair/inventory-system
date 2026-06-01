import { useState, useEffect } from 'react'
import { supplierApi } from './client'

const card = { background:'#fff', borderRadius:10, padding:'20px 24px', border:'1px solid var(--border)', marginBottom:20 }
const btn = (color='#4f46e5') => ({ padding:'6px 14px', background:color, color:'#fff', border:'none', borderRadius:6, fontSize:13, cursor:'pointer' })
const inp = { padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, width:'100%', boxSizing:'border-box' }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [form, setForm] = useState({ name:'', contactPerson:'', email:'', phone:'', address:'' })
  const [show, setShow] = useState(false)

  const load = () => supplierApi.getSuppliers().then(r => setSuppliers(r.data))
  useEffect(() => { load() }, [])

  const save = async e => {
    e.preventDefault()
    await supplierApi.createSupplier(form)
    setShow(false); setForm({ name:'', contactPerson:'', email:'', phone:'', address:'' }); load()
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:600}}>Suppliers</h1>
        <button style={btn()} onClick={()=>setShow(true)}>+ Add Supplier</button>
      </div>

      {show && (
        <div style={{...card,border:'1px solid #c7d2fe'}}>
          <h2 style={{fontSize:15,fontWeight:600,marginBottom:14}}>New Supplier</h2>
          <form onSubmit={save} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[['name','Company name'],['contactPerson','Contact person'],['email','Email'],['phone','Phone'],['address','Address']].map(([k,lbl])=>(
              <div key={k} style={{gridColumn:k==='address'?'span 2':'auto'}}>
                <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>{lbl}</label>
                <input style={inp} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==='name'} />
              </div>
            ))}
            <div style={{gridColumn:'span 2',display:'flex',gap:8}}>
              <button type="submit" style={btn()}>Save</button>
              <button type="button" style={btn('#6b7280')} onClick={()=>setShow(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={card}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
            {['Name','Contact','Email','Phone','Status',''].map(h=><th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:500,color:'#6b7280'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {suppliers.map(s=>(
              <tr key={s.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                <td style={{padding:'8px 12px',fontWeight:500}}>{s.name}</td>
                <td style={{padding:'8px 12px',color:'#6b7280'}}>{s.contactPerson}</td>
                <td style={{padding:'8px 12px',color:'#6b7280'}}>{s.email}</td>
                <td style={{padding:'8px 12px',color:'#6b7280'}}>{s.phone}</td>
                <td style={{padding:'8px 12px'}}>
                  <span style={{background:s.active?'#dcfce7':'#f3f4f6',color:s.active?'#166534':'#6b7280',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>
                    {s.active?'Active':'Inactive'}
                  </span>
                </td>
                <td style={{padding:'8px 12px'}}>
                  <button style={btn(s.active?'#ef4444':'#22c55e')} onClick={()=>supplierApi.toggleSupplier(s.id).then(load)}>
                    {s.active?'Deactivate':'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
