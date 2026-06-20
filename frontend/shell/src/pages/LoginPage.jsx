import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

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
  const location  = useLocation()

  const justRegistered = location.state?.registered === true

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
      login(r.data)
      navigate('/')
    } catch(err) { setError(err.response?.data?.message || 'Verification failed') }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '11px 13px', border: '1px solid var(--line)',
    borderRadius: 'var(--radius)', fontSize: 14, marginBottom: 14,
    fontFamily: 'var(--font-body)', background: '#fff',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-body)' }}>

      {/* ── Left: identity panel — manifest board concept ────────────── */}
      <div style={{
        flex: '0 0 44%', background: 'var(--deep)', color: '#fff',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 56px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: .05, backgroundImage:
            'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 38, height: 38, background: 'var(--accent)', borderRadius: 7,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17,
            }}>IM</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>
              InventoryMS
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
            letterSpacing: '2px', marginBottom: 14, textTransform: 'uppercase',
          }}>
            Warehouse Operations Platform
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700,
            lineHeight: 1.15, marginBottom: 20, maxWidth: 420,
          }}>
            Every pallet,<br/>every SKU,<br/>tracked.
          </h1>
          <p style={{ color: '#C9D4CC', fontSize: 14, maxWidth: 380, lineHeight: 1.7 }}>
            Stock levels, batch expiry, purchase orders and supplier
            performance — one ledger, three roles, zero guesswork.
          </p>
        </div>

        <div style={{
          position: 'relative', zIndex: 1, display: 'flex', gap: 28,
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)',
          borderTop: '1px solid var(--line-deep)', paddingTop: 18,
        }}>
          <span>MICROSERVICE ARCHITECTURE</span>
          <span>ROLE-BASED ACCESS</span>
          <span>REAL-TIME STOCK</span>
        </div>
      </div>

      {/* ── Right: auth form ────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: 24,
      }}>
        <div className="card" style={{ width: '100%', maxWidth: 380, padding: 40 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-2)',
            letterSpacing: '1.5px', marginBottom: 6, textTransform: 'uppercase',
          }}>
            {step === 1 ? 'Step 1 of 2 — Credentials' : 'Step 2 of 2 — Verification'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
            Sign in
          </h2>

          {justRegistered && step === 1 && (
            <div style={{
              background: 'var(--ok-bg)', border: '1px solid var(--ok)', borderRadius: 'var(--radius)',
              padding: '10px 14px', color: 'var(--ok)', fontSize: 13, marginBottom: 16,
            }}>
              Account created — sign in with your new credentials.
            </div>
          )}
          {error && (
            <div style={{
              background: 'var(--crit-bg)', border: '1px solid var(--crit)', borderRadius: 'var(--radius)',
              padding: '10px 14px', color: 'var(--crit)', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}
          {devOtp && (
            <div style={{
              background: 'var(--warn-bg)', border: '1px solid var(--warn)', borderRadius: 'var(--radius)',
              padding: '10px 14px', color: 'var(--warn)', fontSize: 13, marginBottom: 16,
              fontFamily: 'var(--font-mono)',
            }}>
              DEV OTP: <strong>{devOtp}</strong>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={step1}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>Email</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>Password</label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading}>
                {loading ? 'Sending code…' : 'Continue →'}
              </button>
              <div style={{ textAlign: 'right', marginTop: 12, fontSize: 12.5 }}>
                <Link to="/forgot-password" style={{ color: 'var(--accent)', fontWeight: 500 }}>Forgot password?</Link>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={step2}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>Verification code</label>
              <input
                style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" maxLength={6} required autoFocus
              />
              <button className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading}>
                {loading ? 'Verifying…' : 'Sign in'}
              </button>
              <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setStep(1)}>
                ← Back
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-2)' }}>
            No account? <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
