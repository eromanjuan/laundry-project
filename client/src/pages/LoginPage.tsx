import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaLock, FaUser } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const success = login(username, password)

    if (success) {
      navigate('/dashboard')
      return
    }

    setError('Invalid username or password.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_55%,_#e2e8f0)] px-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-gradient-to-br from-blue-700 to-blue-950 p-8 text-white lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Laundry Project POS</p>
            <h1 className="mt-4 text-3xl font-semibold">Secure sign-in for daily operations</h1>
            <p className="mt-3 max-w-md text-sm text-blue-50/90">
              Access dashboard insights, manage users, and review transaction history with role-based controls.
            </p>
            <div className="mt-8 space-y-3 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm">
              <p className="font-semibold">Demo credentials</p>
              <p>Admin: admin / admin123</p>
              <p>Manager: manager / manager123</p>
              <p>Staff: staff / staff123</p>
            </div>
          </div>

          <div className="p-8 lg:p-10">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Authentication</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to continue managing the laundry operations.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FaUser /> Username
                </span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full border-none bg-transparent outline-none"
                  placeholder="Enter username"
                />
              </label>

              <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <FaLock /> Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full border-none bg-transparent outline-none"
                  placeholder="Enter password"
                />
              </label>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
