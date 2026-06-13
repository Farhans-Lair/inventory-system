import { createContext, useContext, useState } from 'react'

// Safe default context value prevents "Cannot destructure property of null" errors
// when a page component is loaded via Module Federation without being explicitly
// wrapped in AuthProvider. useAuth() returns safe defaults instead of null.
const defaultContext = {
  user:          null,
  isAdmin:       false,
  isManager:     false,
  isStakeholder: false,
  canWrite:      false,
}

const AuthContext = createContext(defaultContext)

export function AuthProvider({ children }) {
  const stored = localStorage.getItem('user')
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null)
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
