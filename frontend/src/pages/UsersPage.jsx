import { useState, useEffect } from 'react'
import { authApi } from '../api/client'

const EMPTY = { email: '', fullName: '', password: '', role: 'WAREHOUSE_MANAGER' }

export default function UsersPage() {
  const [users, setUsers]   = useState([])
  const [form, setForm]     = useState(EMPTY)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  const load = () => authApi.getUsers().then(r => setUsers(r.data))
  useEffect(() => { load() }, [])

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    try {
      await authApi.createUser(form)
      setSuccess(`User ${form.email} created.`); setForm(EMPTY); load()
      setTimeout(() => setSuccess(''), 3000)
    } catch(err) { setError(err.response?.data?.message || 'Error creating user') }
  }

  const toggleActive = async id => {
    await authApi.toggleActive(id); load()
  }

  const inp = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: '100%' }
  const th  = { padding: '10px 14px', fontWeight: 600, fontSize: 12, textAlign: 'left', color: '#6b7280', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: .4 }
  const td  = { padding: '11px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }
  const roleColor = r => {
    if (r === 'ADMIN') return { bg: '#ede9fe', fg: '#5b21b6' }
    if (r === 'STAKEHOLDER') return { bg: '#ecfdf5', fg: '#065f46' }
    return { bg: '#e0f2fe', fg: '#0369a1' }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>User Management</h1>

      {/* Create user form */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Create new user</h2>
        <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Full Name *</label>
            <input style={inp} value={form.fullName} onChange={e => setForm(f => ({...f, fullName: e.target.value}))} required /></div>
          <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Email *</label>
            <input style={inp} type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required /></div>
          <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Password *</label>
            <input style={inp} type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required /></div>
          <div><label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Role *</label>
            <select style={inp} value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
              <option value="ADMIN">Admin</option>
              <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
              <option value="STAKEHOLDER">Stakeholder</option>
            </select>
          </div>
          {error   && <div style={{ gridColumn: 'span 4', color: 'var(--danger)', fontSize: 12, background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
          {success && <div style={{ gridColumn: 'span 4', color: '#16a34a', fontSize: 12, background: '#f0fdf4', padding: '8px 12px', borderRadius: 6 }}>{success}</div>}
          <div>
            <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Create User</button>
          </div>
        </form>
      </div>

      {/* Users table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>{['Full Name','Email','Role','Status','Created','Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u => {
              const rc = roleColor(u.role)
              return (
                <tr key={u.id}>
                  <td style={{...td, fontWeight: 500}}>{u.fullName}</td>
                  <td style={{...td, color: '#6b7280'}}>{u.email}</td>
                  <td style={td}><span style={{ background: rc.bg, color: rc.fg, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{u.role.replace('_', ' ')}</span></td>
                  <td style={td}><span style={{ background: u.active ? '#dcfce7' : '#f3f4f6', color: u.active ? '#16a34a' : '#9ca3af', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{u.active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{...td, color: '#9ca3af', fontSize: 12}}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td style={td}>
                    <button onClick={() => toggleActive(u.id)} style={{
                      background: 'none', border: `1px solid ${u.active ? '#fecaca' : '#d1fae5'}`,
                      borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
                      color: u.active ? '#ef4444' : '#16a34a',
                    }}>{u.active ? 'Disable' : 'Enable'}</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No users found</div>}
      </div>
    </div>
  )
}
