import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStatus } from './hooks'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStatus()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/account/login" state={{ from: location }} replace />
  }

  return children
}
