import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Sends a signed-in user to the right place: the master console, their shop
 * workspace (or its pending screen), or the login page.
 */
export function HomeRedirectPage() {
  const { loading, hasSession, isMaster, shop } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Loading…
      </div>
    )
  }

  if (!hasSession) return <Navigate to="/login" replace />
  if (isMaster) return <Navigate to="/admin" replace />
  if (shop?.slug) return <Navigate to={`/${shop.slug}/dashboard`} replace />

  return <Navigate to="/login" replace />
}
