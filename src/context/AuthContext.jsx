import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'
const DEMO_USER = { username: 'emilys', password: 'emilyspass' }
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // No login screen on first visit: restore the session if a token exists,
  // otherwise sign in silently with the public DummyJSON demo user.
  useEffect(() => {
    const init = async () => {
      try {
        if (localStorage.getItem('accessToken')) { setUser(await authService.getMe()); return }
      } catch {}
      if (localStorage.getItem('explicitLogout')) return
      try {
        await authService.login(DEMO_USER.username, DEMO_USER.password)
        setUser(await authService.getMe())
      } catch { setUser(null) }
    }
    init().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'accessToken' && !e.newValue) setUser(null) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = async (username, password) => {
    await authService.login(username, password)
    localStorage.removeItem('explicitLogout')
    setUser(await authService.getMe())
  }
  const logout = () => { localStorage.setItem('explicitLogout', '1'); authService.logout(); setUser(null) }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}
