import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaStore, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaArrowLeft, FaArrowRight } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { slugify, RESERVED_SLUGS } from '../data/seeds'

export function RegisterShopPage() {
  const { registerShop } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    contact: '',
    location: '',
    address: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const slug = useMemo(() => slugify(form.shopName), [form.shopName])
  const slugTaken = slug ? RESERVED_SLUGS.has(slug) : false

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!form.shopName || !form.ownerName || !form.email || !form.password) {
      setError('Please fill in the shop name, your name, email and password.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    const result = await registerShop(form)
    setBusy(false)
    if (!result.ok || !result.slug) {
      setError(result.error ?? 'Registration failed. Please try again.')
      return
    }
    navigate(`/${result.slug}`, { replace: true })
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#e0ecff,_#f8fafc_45%,_#eef2ff)] px-4 py-10">
      <div className="w-full max-w-2xl rounded-[36px] border border-white/60 bg-white p-8 shadow-[0_40px_120px_-40px_rgba(37,99,235,0.5)] sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-md">
            <FaStore />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Laundry Project</p>
            <h1 className="text-2xl font-semibold text-slate-900">Register your laundry shop</h1>
          </div>
        </div>

        <p className="mb-8 text-sm text-slate-500">
          Create your shop workspace. A platform administrator reviews every new shop; you'll be notified on screen once
          your shop is approved.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FaStore className="text-blue-500" /> Shop name
            </span>
            <input value={form.shopName} onChange={set('shopName')} className={inputClass} placeholder="e.g. Bubbles Laundry Hub" />
            {slug ? (
              <span className={`mt-1.5 block text-xs ${slugTaken ? 'text-rose-600' : 'text-slate-500'}`}>
                Your web address will be <span className="font-mono font-semibold">/{slug}</span>
                {slugTaken ? ' — that name is reserved, please choose another.' : ''}
              </span>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaUser className="text-blue-500" /> Owner's full name
              </span>
              <input value={form.ownerName} onChange={set('ownerName')} className={inputClass} placeholder="Juan Dela Cruz" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaPhone className="text-blue-500" /> Contact number
              </span>
              <input value={form.contact} onChange={set('contact')} className={inputClass} placeholder="0917 000 0000" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaMapMarkerAlt className="text-blue-500" /> Location
              </span>
              <input value={form.location} onChange={set('location')} className={inputClass} placeholder="City / Barangay" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaMapMarkerAlt className="text-blue-500" /> Street address
              </span>
              <input value={form.address} onChange={set('address')} className={inputClass} placeholder="123 Main Street" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FaEnvelope className="text-blue-500" /> Email address
            </span>
            <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="you@example.com" autoComplete="email" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaLock className="text-blue-500" /> Password
              </span>
              <input type="password" value={form.password} onChange={set('password')} className={inputClass} placeholder="At least 6 characters" autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FaLock className="text-blue-500" /> Confirm password
              </span>
              <input type="password" value={form.confirm} onChange={set('confirm')} className={inputClass} placeholder="Re-enter password" autoComplete="new-password" />
            </label>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600">{error}</p>
          ) : null}

          <button
            disabled={busy}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
          >
            {busy ? 'Creating your shop…' : 'Create shop & register'}
            <FaArrowRight className="transition group-hover:translate-x-0.5" />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
            <FaArrowLeft className="text-xs" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
