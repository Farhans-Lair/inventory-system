import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const storedUser = (() => {
    try {
      const s = sessionStorage.getItem('user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })()

  const [user, setUser] = useState(storedUser)

  const setToken = useCallback((token) => {
    if (token) sessionStorage.setItem('access_token', token)
    else        sessionStorage.removeItem('access_token')
  }, [])

  const getToken = useCallback(() => {
    return sessionStorage.getItem('access_token')
  }, [])

  const login = useCallback((response) => {
    const u = {
      userId:   response.userId,
      email:    response.email,
      fullName: response.fullName,
      role:     response.role,
    }
    setToken(response.accessToken)
    sessionStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }, [setToken])

  const logout = useCallback(async () => {
    const token = getToken()
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user')
    setUser(null)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
    } catch {  }
  }, [getToken])

  const isAdmin       = user?.role === 'ADMIN'
  const isManager     = user?.role === 'WAREHOUSE_MANAGER'
  const isStakeholder = user?.role === 'STAKEHOLDER'
  const canWrite      = isAdmin || isManager

  return (
    <AuthContext.Provider value={{
      user, login, logout, getToken,
      isAdmin, isManager, isStakeholder, canWrite,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
