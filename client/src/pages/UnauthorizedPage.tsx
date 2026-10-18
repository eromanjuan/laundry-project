import { Link } from 'react-router-dom'
import { FaLock } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

/** Shown when a signed-in member lacks the role required for a route. */
export function UnauthorizedPage() {
  const { shop } = useAuth()
  const home = shop?.slug ? `/${shop.slug}/dashboard` : '/'
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-xl text-rose-600">
          <FaLock />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-900">Insufficient permissions</h1>
        <p className="mt-2 text-sm text-slate-600">Your role does not have access to this page.</p>
        <Link
          to={home}
          className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
