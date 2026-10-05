import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('emilys')
  const [password, setPassword] = useState('emilyspass')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try { await login(username, password) } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={submit} className="bg-white p-8 rounded shadow w-80 space-y-4">
        <h1 className="text-xl font-semibold">Login</h1>
        <input className="w-full border rounded p-2" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <input className="w-full border rounded p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-blue-600 text-white rounded p-2 disabled:opacity-50">{busy ? 'Logging in...' : 'Login'}</button>
        <p className="text-xs text-gray-500">Test login: emilys / emilyspass</p>
      </form>
    </div>
  )
}
