import { useState, type FormEvent } from 'react'
import { FaLock, FaTimes } from 'react-icons/fa'

interface PasswordPromptModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  onClose: () => void
  /** Return an error string to show inline, or null on success (modal then closes). */
  onSubmit: (password: string) => string | null | Promise<string | null>
}

/**
 * Asks the current user to re-enter their password before a sensitive action
 * (e.g. deleting a user). In-app modal — never a native prompt.
 */
export function PasswordPromptModal({ isOpen, title, message, confirmLabel = 'Confirm', onClose, onSubmit }: PasswordPromptModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isOpen) return null

  const close = () => {
    setPassword('')
    setError('')
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const result = await onSubmit(password)
    setBusy(false)
    if (result) {
      setError(result)
      return
    }
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <FaLock />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
          </div>
          <button onClick={close} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
            <FaTimes />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">Your Password</span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
              placeholder="Enter your admin password"
            />
          </label>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={close} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
              {busy ? 'Verifying…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
