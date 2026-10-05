import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) { setLoading(false); return }
    authService.getMe().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'accessToken' && !e.newValue) setUser(null) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = async (username, password) => {
    await authService.login(username, password)
    setUser(await authService.getMe())
  }
  const logout = () => { authService.logout(); setUser(null) }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}
