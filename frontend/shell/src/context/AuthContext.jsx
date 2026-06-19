import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

/**
 * TAB-ISOLATED SESSION ARCHITECTURE
 *
 * Access token  → sessionStorage['access_token'] per tab
 *   - Sent via Authorization: Bearer header on every API call
 *   - Each tab has its own independent token → true functional isolation
 *   - Tab A (Admin) and Tab B (Manager) each send their own correct token
 *   - Backend correctly identifies and authorises each user independently
 *   - Cleared automatically when tab closes
 *
 * Refresh token → HttpOnly cookie (path=/api/auth/)
 *   - Never accessible by JavaScript → XSS cannot steal it
 *   - Sent automatically by browser only to /api/auth/ endpoints
 *   - Rotated on every use → stolen refresh token invalidated on next use
 *   - 7-day expiry
 *
 * User profile  → sessionStorage['user'] per tab
 *   - Tab isolated — logging in/out on one tab does not affect others
 */
export function AuthProvider({ children }) {
  const storedUser = (() => {
    try {
      const s = sessionStorage.getItem('user')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })()

  const [user, setUser] = useState(storedUser)

  /** Store access token in sessionStorage for this tab. */
  const setToken = useCallback((token) => {
    if (token) sessionStorage.setItem('access_token', token)
    else        sessionStorage.removeItem('access_token')
  }, [])

  /** Get the current tab's access token. Used by client.js interceptor. */
  const getToken = useCallback(() => {
    return sessionStorage.getItem('access_token')
  }, [])

  /**
   * Called after verifyLogin / verifySignup.
   * response contains { accessToken, userId, email, fullName, role }
   */
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

  /**
   * Clear this tab's session only.
   * Other tabs are unaffected — they have their own sessionStorage.
   */
  const logout = useCallback(async () => {
    const token = getToken()
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user')
    setUser(null)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // sends refresh_token cookie for server-side revocation
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
    } catch { /* ignore network errors on logout */ }
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
