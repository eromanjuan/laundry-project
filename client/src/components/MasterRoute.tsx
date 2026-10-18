import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ForcePasswordChange } from './ForcePasswordChange'

/** Restricts a route to the platform master administrator. */
export function MasterRoute({ children }: { children: ReactNode }) {
  const { loading, isMaster, hasSession, user } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Loading platform console…
      </div>
    )
  }

  if (!hasSession) return <Navigate to="/login" replace />
  if (!isMaster) return <Navigate to="/" replace />
  // A freshly created platform administrator must set their own password.
  if (user?.mustChangePassword) return <ForcePasswordChange />

  return <>{children}</>
}
