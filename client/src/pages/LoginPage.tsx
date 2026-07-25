import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaLock, FaUser, FaArrowRight } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'
import heroImage from '../assets/login-hero.jpg'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const { logoUrl } = useBranding()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    const success = await login(email, password)
    setBusy(false)

    if (success) {
      navigate('/dashboard')
      return
    }

    setError('Invalid email or password.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e0ecff,_#f8fafc_45%,_#eef2ff)] px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/60 bg-white shadow-[0_40px_120px_-40px_rgba(37,99,235,0.5)] lg:grid-cols-2">
        {/* Brand / hero panel */}
        <div className="relative hidden lg:block">
          <img src={heroImage} alt="Laundry Project" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/40 via-transparent to-transparent" />
        </div>

        {/* Login form */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-blue-100">
              <img src={logoUrl} alt="Laundry Project logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Laundry Project</p>
              <p className="text-lg font-semibold text-slate-900">Point of Sale</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to manage your laundry operations.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaUser className="text-blue-500" /> Username or Email
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="admin  or  you@laundrypos.com"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaLock className="text-blue-500" /> Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600">{error}</p>
            ) : null}

            <button disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-60">
              {busy ? 'Signing in…' : 'Sign In'}
              <FaArrowRight className="transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Cleaner care, better living — © {new Date().getFullYear()} Laundry Project
          </p>
        </div>
      </div>
    </div>
  )
}
