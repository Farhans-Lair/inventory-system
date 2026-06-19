import { createContext, useContext, useState } from 'react'

// Safe default prevents null destructuring when component mounts without AuthProvider
const defaultContext = {
  user:          null,
  isAdmin:       false,
  isManager:     false,
  isStakeholder: false,
  canWrite:      false,
}

const AuthContext = createContext(defaultContext)

/**
 * Reads user profile from sessionStorage (tab-scoped).
 * Each tab has its own independent session — logging in/out
 * on one tab does not affect other tabs.
 */
export function AuthProvider({ children }) {
  const stored = (() => {
    try { const s = sessionStorage.getItem('user'); return s ? JSON.parse(s) : null }
    catch { return null }
  })()
  const [user] = useState(stored)
  const isAdmin       = user?.role === 'ADMIN'
  const isManager     = user?.role === 'WAREHOUSE_MANAGER'
  const isStakeholder = user?.role === 'STAKEHOLDER'
  const canWrite      = isAdmin || isManager
  return (
    <AuthContext.Provider value={{ user, isAdmin, isManager, isStakeholder, canWrite }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

