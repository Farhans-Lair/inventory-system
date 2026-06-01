/**
 * AuthContext shim for MFE remotes.
 * When loaded via Module Federation, the shell provides the real AuthContext
 * through the shared react singleton. This file is only needed for standalone
 * dev mode of this remote app.
 */
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

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
