import { useState, type FormEvent } from 'react'
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa'

interface RevertStageModalProps {
  isOpen: boolean
  /** e.g. "Ready" */
  fromStage: string
  /** e.g. "Washing" */
  toStage: string
  /** Job label for context, e.g. "#1045". */
  jobLabel: string
  /**
   * Verify + apply the move. Return an error string to show inline, or null on
   * success (modal then closes).
   */
  onConfirm: (reason: string, password: string) => string | null | Promise<string | null>
  onClose: () => void
}

/**
 * Guards an accidental backward stage move (e.g. dragging a Ready order back to
 * Washing). Requires a written reason + the user's password before it applies,
 * so every reversal leaves a record. In-app modal — never a native prompt.
 */
export function RevertStageModal({ isOpen, fromStage, toStage, jobLabel, onConfirm, onClose }: RevertStageModalProps) {
  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isOpen) return null

  const close = () => {
    setReason('')
    setPassword('')
    setError('')
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!reason.trim()) {
      setError('Please enter a reason for moving this order back.')
      return
    }
    setBusy(true)
    const result = await onConfirm(reason.trim(), password)
    setBusy(false)
    if (result) {
      setError(result)
      return
    }
    setReason('')
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <FaExclamationTriangle />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Move {jobLabel} back a stage?</h3>
              <p className="mt-1 text-sm text-slate-500">
                You're moving this order from <span className="font-semibold text-slate-700">{fromStage}</span> back to{' '}
                <span className="font-semibold text-slate-700">{toStage}</span>. Give a reason and confirm with your password.
              </p>
            </div>
          </div>
          <button onClick={close} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
            <FaTimes />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">Reason</span>
            <textarea
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
              placeholder="e.g. Started the wrong load — needs to go back in"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">Your Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
              placeholder="Enter your password to confirm"
            />
          </label>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={close} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60">
              {busy ? 'Verifying…' : 'Confirm Move Back'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
