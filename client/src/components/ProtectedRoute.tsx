import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'
import { ForcePasswordChange } from './ForcePasswordChange'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Wait until Firebase has restored the session (and the profile has loaded)
  // before deciding — otherwise a refresh bounces to /login before auth resolves.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Loading your workspace…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Force a password change (after an admin reset) before any page is reachable.
  if (user.mustChangePassword) {
    return <ForcePasswordChange />
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'Administrator') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
