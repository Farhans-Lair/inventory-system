import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'

const ROLES = [
  { value: 'ADMIN',             label: 'Admin',             desc: 'Full system access' },
  { value: 'WAREHOUSE_MANAGER', label: 'Warehouse Manager', desc: 'Manage stock & movements' },
  { value: 'STAKEHOLDER',       label: 'Stakeholder',       desc: 'View reports & dashboards' },
]

export default function SignupPage() {
  const [step,  setStep]  = useState(1)
  const [form,  setForm]  = useState({ fullName:'', email:'', password:'', confirmPassword:'', role:'WAREHOUSE_MANAGER' })
  const [otp,   setOtp]   = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)
  const navigate          = useNavigate()

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const btn = { background:'var(--primary)', color:'#fff', border:'none', borderRadius:'var(--radius)', padding:'11px', fontWeight:600, cursor:busy?'not-allowed':'pointer', fontSize:14, width:'100%', opacity:busy?.7:1 }

  const submitDetails = async e => {
    e.preventDefault(); setError(''); setBusy(true)
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); setBusy(false); return }
    try {
      const { data } = await authApi.initiateSignup({
        email:form.email, fullName:form.fullName, password:form.password, role:form.role,
      })
      setEmail(data.email); setStep(2)
    } catch(err) { setError(err.response?.data?.message || 'Signup failed.') }
    finally { setBusy(false) }
  }

  const submitOtp = async e => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      await authApi.verifySignup({ email, otp })
      // Account created — send user to login page to sign in
      navigate('/login', { state: { registered: true } })
    } catch(err) { setError(err.response?.data?.message || 'Invalid or expired code.') }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f6fa', padding:'20px 0' }}>
      <div style={{ width:440, background:'#fff', borderRadius:12, padding:'36px 32px', boxShadow:'0 1px 12px rgba(0,0,0,.08)' }}>
        <div style={{ marginBottom:24, textAlign:'center' }}>
          <div style={{ fontSize:26, fontWeight:700, color:'#1e1b4b', letterSpacing:-.5 }}>Inventory MS</div>
          <div style={{ color:'#6b7280', marginTop:4, fontSize:13 }}>{step===1 ? 'Create your account' : 'Verify your email'}</div>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {['Your details','Enter OTP'].map((label,i) => (
            <div key={i} style={{ flex:1, textAlign:'center' }}>
              <div style={{ height:4, borderRadius:4, background:i+1<=step?'var(--primary)':'#e5e7eb', marginBottom:6 }} />
              <div style={{ fontSize:11, color:i+1<=step?'var(--primary)':'#9ca3af', fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>

        {step===1 && (
          <form onSubmit={submitDetails} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', marginBottom:5, fontWeight:500, fontSize:13 }}>Full name</label>
              <input style={inp} value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))} placeholder="Jane Smith" required />
            </div>
            <div>
              <label style={{ display:'block', marginBottom:5, fontWeight:500, fontSize:13 }}>Email address</label>
              <input style={inp} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="jane@company.com" required />
            </div>
            <div>
              <label style={{ display:'block', marginBottom:5, fontWeight:500, fontSize:13 }}>Password</label>
              <input style={inp} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min. 6 characters" required minLength={6} />
            </div>
            <div>
              <label style={{ display:'block', marginBottom:5, fontWeight:500, fontSize:13 }}>Confirm password</label>
              <input style={inp} type="password" value={form.confirmPassword} onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))} placeholder="Repeat password" required />
            </div>
            <div>
              <label style={{ display:'block', marginBottom:8, fontWeight:500, fontSize:13 }}>Role</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ROLES.map(r => (
                  <label key={r.value} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:`1px solid ${form.role===r.value?'var(--primary)':'var(--border)'}`, borderRadius:8, cursor:'pointer', background:form.role===r.value?'#f5f3ff':'#fff' }}>
                    <input type="radio" name="role" value={r.value} checked={form.role===r.value} onChange={()=>setForm(f=>({...f,role:r.value}))} style={{ accentColor:'var(--primary)' }} />
                    <div>
                      <div style={{ fontWeight:500, fontSize:13, color:'#111827' }}>{r.label}</div>
                      <div style={{ fontSize:12, color:'#6b7280' }}>{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {error && <div style={{ color:'var(--danger)', fontSize:13, background:'#fef2f2', padding:'8px 12px', borderRadius:6 }}>{error}</div>}
            <button type="submit" disabled={busy} style={btn}>{busy ? 'Sending code…' : 'Continue →'}</button>
          </form>
        )}

        {step===2 && (
          <form onSubmit={submitOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:13, color:'#15803d', marginBottom:2 }}>A 6-digit code was sent to</div>
              <div style={{ fontWeight:700, color:'#15803d', fontSize:14 }}>{email}</div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:6 }}>Check your inbox (and spam folder).</div>
            </div>
            <div>
              <label style={{ display:'block', marginBottom:5, fontWeight:500, fontSize:13 }}>Enter 6-digit code</label>
              <input
                style={{ ...inp, textAlign:'center', fontSize:28, fontWeight:700, letterSpacing:12, padding:'14px' }}
                value={otp}
                onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="000000" maxLength={6} required autoFocus
              />
            </div>
            {error && <div style={{ color:'var(--danger)', fontSize:13, background:'#fef2f2', padding:'8px 12px', borderRadius:6 }}>{error}</div>}
            <button type="submit" disabled={busy||otp.length<6} style={{...btn,opacity:(busy||otp.length<6)?.5:1}}>
              {busy ? 'Verifying…' : 'Create account'}
            </button>
            <button type="button" onClick={()=>{setStep(1);setError('');setOtp('')}}
              style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:13, textDecoration:'underline' }}>
              ← Back to details
            </button>
          </form>
        )}

        <div style={{ marginTop:20, textAlign:'center', fontSize:13, color:'#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--primary)', fontWeight:500 }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
