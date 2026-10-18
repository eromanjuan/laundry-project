import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FaLock, FaUser, FaArrowRight, FaStore, FaEnvelope } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'
import { useShopBySlug } from '../hooks/useShopBySlug'
import heroImage from '../assets/login-hero.jpg'

export function LoginPage() {
  const [params] = useSearchParams()
  const shopSlug = params.get('shop') ?? undefined
  const { slugRecord } = useShopBySlug(shopSlug)
  const { defaultLogo } = useBranding()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const { login, forgotPassword, hasSession, user, loading, logout } = useAuth()
  const navigate = useNavigate()

  const logoUrl = slugRecord?.logoDataUrl || defaultLogo
  const shopName = slugRecord?.name || 'Laundry Project'
  const orphaned = !loading && hasSession && !user

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    const success = await login(email, password)
    setBusy(false)

    if (success) {
      // HomeRedirectPage resolves the correct landing spot once the profile
      // (and the user's shop) has loaded.
      navigate('/')
      return
    }
    setError('Invalid email or password.')
  }

  const handleForgot = async () => {
    if (!email.trim()) {
      setError('Enter your email or username first, then tap “Forgot password”.')
      return
    }
    setError('')
    try {
      await forgotPassword(email)
      setNotice('If that account exists, a password-reset email is on its way.')
    } catch {
      setNotice('If that account exists, a password-reset email is on its way.')
    }
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
              <img src={logoUrl} alt={`${shopName} logo`} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Laundry Project</p>
              <p className="truncate text-lg font-semibold text-slate-900">{shopName}</p>
            </div>
          </div>

          {shopSlug ? (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
              <FaStore /> Signing in to <span className="font-mono font-semibold">/{shopSlug}</span>
            </div>
          ) : null}

          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to manage your laundry operations.</p>
          </div>

          {orphaned ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">This account is not attached to a shop.</p>
              <p className="mt-1 text-amber-700">
                It may have been removed by an administrator. Try a different account, or{' '}
                <button onClick={logout} className="font-semibold underline">
                  sign out
                </button>
                .
              </p>
            </div>
          ) : null}

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
            {notice ? (
              <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">{notice}</p>
            ) : null}

            <button
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign In'}
              <FaArrowRight className="transition group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={handleForgot}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              <FaEnvelope className="text-xs" /> Forgot password?
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
            Own a laundry shop?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:underline">
              Register your shop
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Cleaner care, better living — © {new Date().getFullYear()} Laundry Project
          </p>
        </div>
      </div>
    </div>
  )
}
