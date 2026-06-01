import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

/**
 * Tokens are stored in HttpOnly cookies set by auth-service.
 * AuthContext only holds user profile info (userId / email / fullName / role)
 * which is persisted in localStorage so the UI survives a page refresh.
 * Cookies are sent automatically by the browser on every request — we never
 * read or write them from JavaScript.
 */
export function AuthProvider({ children }) {
  const stored = localStorage.getItem('user')
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null)

  /**
   * Called after verifyLogin / verifySignup.
   * The response body now contains only { userId, email, fullName, role }.
   * The actual tokens are already in the HttpOnly cookies set by the server.
   */
  const login = (userInfo) => {
    const u = {
      userId:   userInfo.userId,
      email:    userInfo.email,
      fullName: userInfo.fullName,
      role:     userInfo.role,
    }
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  /**
   * Clear local user info and POST to /api/auth/logout so the server
   * revokes the refresh token and expires both cookies.
   */
  const logout = async () => {
    localStorage.removeItem('user')
    setUser(null)
    try {
      // Fire-and-forget — cookies are cleared by the server response
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* ignore network errors on logout */ }
  }

  const isAdmin       = user?.role === 'ADMIN'
  const isManager     = user?.role === 'WAREHOUSE_MANAGER'
  const isStakeholder = user?.role === 'STAKEHOLDER'
  const canWrite      = isAdmin || isManager

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isManager, isStakeholder, canWrite }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
