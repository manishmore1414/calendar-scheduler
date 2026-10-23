import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Calendar from './pages/Calendar'
import EventDetails from './pages/EventDetails'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-6">Loading...</p>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Calendar /></Protected>} />
        <Route path="/events/:id" element={<Protected><EventDetails /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
