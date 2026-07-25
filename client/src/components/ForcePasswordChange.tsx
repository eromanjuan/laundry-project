import { useState, type FormEvent } from 'react'
import { FaLock } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

/**
 * Full-screen gate shown when the signed-in user has `mustChangePassword` set
 * (after an admin reset their password to the default). They cannot proceed
 * until they choose a new password.
 */
export function ForcePasswordChange() {
  const { user, changeOwnPassword, logout } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  if (!user) return null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    try {
      await changeOwnPassword(password)
    } catch {
      setError('Could not update password. Please log out and try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_55%,_#e2e8f0)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FaLock />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Set a new password</h2>
            <p className="text-sm text-slate-500">Your password was reset. Choose a new one to continue.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">New Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
              placeholder="Enter new password"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">Confirm Password</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
              placeholder="Re-enter new password"
            />
          </label>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            Save New Password
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancel & Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
