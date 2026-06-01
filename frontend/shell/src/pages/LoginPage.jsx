import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const s = {
  wrap:  { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' },
  box:   { background:'#fff', padding:'40px', borderRadius:'12px', border:'1px solid #e5e7eb', width:'100%', maxWidth:'380px' },
  title: { fontSize:'22px', fontWeight:700, marginBottom:'8px' },
  sub:   { color:'#6b7280', fontSize:'13px', marginBottom:'24px' },
  label: { display:'block', fontSize:'13px', fontWeight:500, color:'#374151', marginBottom:'4px' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', marginBottom:'14px' },
  btn:   { width:'100%', padding:'11px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' },
  err:   { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'10px 14px', color:'#991b1b', fontSize:'13px', marginBottom:'14px' },
}

export default function LoginPage() {
  const [step,     setStep]     = useState(1)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [otp,      setOtp]      = useState('')
  const [devOtp,   setDevOtp]   = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function step1(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await authApi.initiateLogin({ email, password })
      setDevOtp(r.data.devOtp || ''); setStep(2)
    } catch(err) { setError(err.response?.data?.message || 'Login failed') }
    finally { setLoading(false) }
  }

  async function step2(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await authApi.verifyLogin({ email, otp })
      // r.data contains { userId, email, fullName, role } — tokens are in HttpOnly cookies
      login(r.data)
      navigate('/')
    } catch(err) { setError(err.response?.data?.message || 'Verification failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.title}>Sign in</div>
        <div style={s.sub}>{step===1 ? 'Enter your credentials' : 'Enter the code sent to your email'}</div>
        {error && <div style={s.err}>{error}</div>}
        {devOtp && <div style={{...s.err, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e'}}>Dev OTP: <strong>{devOtp}</strong></div>}

        {step===1 && (
          <form onSubmit={step1}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <button style={s.btn} disabled={loading}>{loading ? 'Sending code…' : 'Continue'}</button>
            <div style={{textAlign:'right',marginTop:10,fontSize:13}}>
              <Link to="/forgot-password" style={{color:'#4f46e5'}}>Forgot password?</Link>
            </div>
          </form>
        )}
        {step===2 && (
          <form onSubmit={step2}>
            <label style={s.label}>Verification code</label>
            <input style={s.input} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit code" required />
            <button style={s.btn} disabled={loading}>{loading ? 'Verifying…' : 'Sign in'}</button>
            <button type="button" style={{...s.btn, background:'transparent', color:'#6b7280', border:'1px solid #d1d5db', marginTop:8}} onClick={()=>setStep(1)}>← Back</button>
          </form>
        )}
        <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'#6b7280'}}>
          No account? <Link to="/signup" style={{color:'#4f46e5'}}>Sign up</Link>
        </div>
      </div>
    </div>
  )
}
