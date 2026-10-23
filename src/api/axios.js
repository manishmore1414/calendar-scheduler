import axios from 'axios'
const BASE = 'https://dummyjson.com'
const api = axios.create({ baseURL: BASE })
let refreshPromise = null

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

function refreshToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(BASE + '/auth/refresh', { refreshToken: localStorage.getItem('refreshToken') })
      .then((res) => {
        localStorage.setItem('accessToken', res.data.accessToken)
        if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken)
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const canRefresh = err.response?.status === 401 && !original._retry && localStorage.getItem('refreshToken')
    if (canRefresh) {
      original._retry = true
      try {
        await refreshToken()
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        return Promise.reject({ message: 'Session expired', status: 401 })
      }
    }
    return Promise.reject({ message: err.response?.data?.message || err.message, status: err.response?.status })
  }
)
export default api
