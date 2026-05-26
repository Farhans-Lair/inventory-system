import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const stored = sessionStorage.getItem('user')
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null)

  const login = (tokenPairResponse) => {
    const { accessToken, refreshToken, userId, email, fullName, role } = tokenPairResponse
    const u = { userId, email, fullName, role }
    sessionStorage.setItem('token',        accessToken)
    sessionStorage.setItem('refreshToken', refreshToken)
    sessionStorage.setItem('user',         JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    sessionStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
