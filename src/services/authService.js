import api from '../api/axios'
export async function login(username, password) {
  const res = await api.post('/auth/login', { username, password, expiresInMins: 30 })
  localStorage.setItem('accessToken', res.data.accessToken)
  localStorage.setItem('refreshToken', res.data.refreshToken)
  return res.data
}
export async function getMe() {
  const res = await api.get('/auth/me')
  return res.data
}
export function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}
