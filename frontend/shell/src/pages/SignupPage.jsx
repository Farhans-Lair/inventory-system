import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'

// Public self-signup is intentionally limited to non-admin roles. The very
// first ADMIN account in a fresh deployment is still created through this
// same form (server allows it only when zero admins exist yet — see
// AuthService.enforcePublicSignupAdminRule). After that, admin accounts can
// only be created by an existing admin via the Users page — never by
// self-elevation through public signup.
const ROLES = [
  { value: 'WAREHOUSE_MANAGER', label: 'Warehouse Manager',  desc: 'Manage stock, suppliers and purchase orders' },
  { value: 'STAKEHOLDER',       label: 'Stakeholder',        desc: 'View-only access to reports and dashboards' },
]

export default function SignupPage() {
  const [step,  setStep]  = useState(1)
  const [form,  setForm]  = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'WAREHOUSE_MANAGER' })
  const [otp,   setOtp]   = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)
  const navigate = useNavigate()

  const inp = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
    borderRadius: 'var(--radius)', fontSize: 13.5, fontFamily: 'inherit',
  }

  const submitDetails = async e => {
    e.preventDefault(); setError(''); setBusy(true)
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); setBusy(false); return }
    try {
      const { data } = await authApi.initiateSignup({
        email: form.email, fullName: form.fullName, password: form.password, role: form.role,
      })
      setEmail(data.email); setStep(2)
    } catch (err) { setError(err.response?.data?.message || 'Signup failed.') }
    finally { setBusy(false) }
  }

  const submitOtp = async e => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      await authApi.verifySignup({ email, otp })
      navigate('/login', { state: { registered: true } })
    } catch (err) { setError(err.response?.data?.message || 'Invalid or expired code.') }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-body)' }}>

      {/* ── Left panel — consistent with login ─────────────────────── */}
      <div style={{
        flex: '0 0 40%', background: 'var(--deep)', color: '#fff',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: .05, backgroundImage:
            'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 38, height: 38, background: 'var(--accent)', borderRadius: 7,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17,
          }}>IM</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>InventoryMS</span>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
            letterSpacing: '2px', marginBottom: 14, textTransform: 'uppercase',
          }}>
            New Account
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 16, maxWidth: 360 }}>
            Three roles.<br/>One source of truth.
          </h1>
          <p style={{ color: '#C9D4CC', fontSize: 13.5, maxWidth: 340, lineHeight: 1.7 }}>
            Choose the access level that matches your responsibility —
            an administrator can change it later from the Users panel.
          </p>
        </div>

        <div />
      </div>

      {/* ── Right: form ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
        <div className="card" style={{ width: '100%', maxWidth: 460, padding: '36px 40px' }}>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {step === 1 ? 'Create your account' : 'Verify your email'}
          </h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', marginBottom: 22, letterSpacing: '.5px' }}>
            STEP {step} OF 2
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['Details', 'Verification'].map((label, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 3, borderRadius: 3, background: i + 1 <= step ? 'var(--accent)' : 'var(--line)', marginBottom: 6 }} />
                <div style={{ fontSize: 10.5, color: i + 1 <= step ? 'var(--accent)' : 'var(--text-2)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
              </div>
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={submitDetails} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 12.5 }}>Full name</label>
                <input style={inp} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Jane Smith" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 12.5 }}>Email address</label>
                <input style={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 12.5 }}>Password</label>
                <input style={inp} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" required minLength={6} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 12.5 }}>Confirm password</label>
                <input style={inp} type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat password" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12.5 }}>Role</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {ROLES.map(r => (
                    <label key={r.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                      border: `1px solid ${form.role === r.value ? 'var(--accent)' : 'var(--line)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer',
                      background: form.role === r.value ? 'var(--ok-bg)' : '#fff',
                    }}>
                      <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                        onChange={() => setForm(f => ({ ...f, role: r.value }))}
                        style={{ accentColor: 'var(--accent)', marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {error && (
                <div style={{ color: 'var(--crit)', fontSize: 13, background: 'var(--crit-bg)', padding: '9px 12px', borderRadius: 'var(--radius)' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={busy} className="btn-primary" style={{ padding: 12, opacity: busy ? .7 : 1 }}>
                {busy ? 'Sending code…' : 'Continue →'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submitOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--ok-bg)', border: '1px solid var(--ok)', borderRadius: 'var(--radius)', padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12.5, color: 'var(--ok)', marginBottom: 2 }}>A 6-digit code was sent to</div>
                <div style={{ fontWeight: 700, color: 'var(--ok)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>{email}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 6 }}>Check your inbox (and spam folder).</div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 12.5 }}>Enter 6-digit code</label>
                <input
                  style={{ ...inp, fontFamily: 'var(--font-mono)', textAlign: 'center', fontSize: 26, fontWeight: 700, letterSpacing: 10, padding: 14 }}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" maxLength={6} required autoFocus
                />
              </div>
              {error && (
                <div style={{ color: 'var(--crit)', fontSize: 13, background: 'var(--crit-bg)', padding: '9px 12px', borderRadius: 'var(--radius)' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={busy || otp.length < 6} className="btn-primary" style={{ padding: 12, opacity: (busy || otp.length < 6) ? .5 : 1 }}>
                {busy ? 'Verifying…' : 'Create account'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setStep(1); setError(''); setOtp('') }}>
                ← Back to details
              </button>
            </form>
          )}

          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
