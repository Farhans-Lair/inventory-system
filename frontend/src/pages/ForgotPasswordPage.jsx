import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/client'

const s = {
  wrap:  { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' },
  box:   { background:'#fff', padding:'40px', borderRadius:'12px', border:'1px solid #e5e7eb', width:'100%', maxWidth:'380px' },
  title: { fontSize:'22px', fontWeight:700, marginBottom:'8px', color:'#111827' },
  sub:   { color:'#6b7280', fontSize:'13px', marginBottom:'24px' },
  label: { display:'block', fontSize:'13px', fontWeight:500, color:'#374151', marginBottom:'4px' },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', marginBottom:'14px' },
  btn:   { width:'100%', padding:'11px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' },
  err:   { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'10px 14px', color:'#991b1b', fontSize:'13px', marginBottom:'14px' },
  ok:    { background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 14px', color:'#166534', fontSize:'13px', marginBottom:'14px' },
}

export default function ForgotPasswordPage() {
  const [step, setStep]         = useState(1)  // 1=email, 2=otp+new pass
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [newPass, setNewPass]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const navigate = useNavigate()

  async function sendOtp(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setStep(2); setSuccess('A reset code has been sent to ' + email)
    } catch(err) { setError(err.response?.data?.message || 'Could not send reset code') }
    finally { setLoading(false) }
  }

  async function resetPass(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authApi.resetPassword({ email, otp, newPassword: newPass })
      setSuccess('Password reset successfully!'); setTimeout(() => navigate('/login'), 1500)
    } catch(err) { setError(err.response?.data?.message || 'Reset failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.title}>Reset your password</div>
        <div style={s.sub}>{step === 1 ? "Enter your email to receive a reset code" : "Enter the code sent to your email"}</div>
        {error   && <div style={s.err}>{error}</div>}
        {success && <div style={s.ok}>{success}</div>}

        {step === 1 && (
          <form onSubmit={sendOtp}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <button style={s.btn} disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={resetPass}>
            <label style={s.label}>Verification code</label>
            <input style={s.input} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit code" required />
            <label style={s.label}>New password</label>
            <input style={s.input} type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} minLength={6} required />
            <button style={s.btn} disabled={loading}>{loading ? 'Resetting…' : 'Reset password'}</button>
          </form>
        )}
        <div style={{ marginTop:'16px', textAlign:'center', fontSize:'13px', color:'#6b7280' }}>
          <Link to="/login" style={{ color:'#4f46e5' }}>Back to login</Link>
        </div>
      </div>
    </div>
  )
}
