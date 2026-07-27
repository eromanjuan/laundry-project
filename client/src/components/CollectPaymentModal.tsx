import { useEffect, useState } from 'react'
import { FaTimes, FaMoneyBillWave, FaQrcode } from 'react-icons/fa'
import type { PaymentSettings } from '../hooks/usePaymentSettings'

export interface PaymentResult {
  method: 'Cash' | 'GCash' | 'Cash+GCash'
  /** Amount applied to the order via cash. */
  cash: number
  /** Amount applied to the order via GCash. */
  gcash: number
}

interface CollectPaymentModalProps {
  isOpen: boolean
  /** Outstanding balance (the most that can be applied now). */
  due: number
  /** Context label, e.g. "#1058 • Juan Cruz". */
  label: string
  gcash: PaymentSettings
  onClose: () => void
  onConfirm: (result: PaymentResult) => void
}

function peso(n: number) {
  return `₱${(Math.round(n * 100) / 100).toLocaleString('en-PH')}`
}

type Mode = 'Cash' | 'GCash' | 'Split'

export function CollectPaymentModal({ isOpen, due, label, gcash, onClose, onConfirm }: CollectPaymentModalProps) {
  const [mode, setMode] = useState<Mode>('Cash')
  const [cashInput, setCashInput] = useState('')
  const [gcashInput, setGcashInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setMode('Cash')
      setCashInput('')
      setGcashInput('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const cashVal = Number.parseFloat(cashInput) || 0
  const gcashVal = Number.parseFloat(gcashInput) || 0

  // Amount actually applied to the balance for the active mode.
  let appliedCash = 0
  let appliedGcash = 0
  if (mode === 'Cash') appliedCash = Math.min(cashVal, due)
  else if (mode === 'GCash') appliedGcash = Math.min(gcashVal, due)
  else { appliedCash = cashVal; appliedGcash = gcashVal }

  const applied = Math.round((appliedCash + appliedGcash) * 100) / 100
  const remaining = Math.max(0, Math.round((due - applied) * 100) / 100)
  const change = mode === 'Cash' ? Math.max(0, Math.round((cashVal - due) * 100) / 100) : 0
  const isPartial = remaining > 0

  const confirm = () => {
    if (applied <= 0) return setError('Enter an amount to collect.')
    if (mode === 'Split' && cashVal + gcashVal > due + 0.001) return setError(`Split total can't exceed the balance of ${peso(due)}.`)
    const method: PaymentResult['method'] =
      appliedCash > 0 && appliedGcash > 0 ? 'Cash+GCash' : appliedGcash > 0 ? 'GCash' : 'Cash'
    onConfirm({ method, cash: Math.round(appliedCash * 100) / 100, gcash: Math.round(appliedGcash * 100) / 100 })
  }

  const showGcashQr = mode === 'GCash' || (mode === 'Split' && gcashVal > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Collect Payment</h3>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"><FaTimes /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 pt-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center">
            <p className="text-sm text-slate-500">Balance due</p>
            <p className="text-3xl font-bold text-blue-700">{peso(due)}</p>
            <p className="mt-1 text-xs text-slate-500">You can collect any amount — a partial payment lowers the balance.</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['Cash', 'GCash', 'Split'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                  mode === m ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {m === 'Split' ? 'Cash + GCash' : m}
              </button>
            ))}
          </div>

          {mode === 'Cash' ? (
            <div className="mt-4 space-y-3">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Cash received</span>
                <input type="number" inputMode="decimal" value={cashInput} onChange={(e) => { setCashInput(e.target.value); setError('') }} placeholder={String(due)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" />
              </label>
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <span>Change</span><span>{peso(change)}</span>
              </div>
            </div>
          ) : null}

          {mode === 'GCash' ? (
            <label className="mt-4 block space-y-1">
              <span className="text-sm font-semibold text-slate-700">GCash amount</span>
              <input type="number" inputMode="decimal" value={gcashInput} onChange={(e) => { setGcashInput(e.target.value); setError('') }} placeholder={String(due)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" />
            </label>
          ) : null}

          {mode === 'Split' ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Cash</span>
                <input type="number" inputMode="decimal" value={cashInput} onChange={(e) => { setCashInput(e.target.value); setError('') }} placeholder="0" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">GCash</span>
                <input type="number" inputMode="decimal" value={gcashInput} onChange={(e) => { setGcashInput(e.target.value); setError('') }} placeholder="0" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" />
              </label>
            </div>
          ) : null}

          {showGcashQr ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700"><FaQrcode /> Scan to pay via GCash</p>
              {gcash.gcashQr ? (
                <img src={gcash.gcashQr} alt="GCash QR" className="mx-auto mt-3 h-44 w-44 rounded-xl bg-white object-contain p-1" />
              ) : (
                <div className="mx-auto mt-3 flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 text-xs text-slate-400">No GCash QR set. Add it in Settings → GCash Payment.</div>
              )}
              {(gcash.gcashName || gcash.gcashNumber) ? (
                <p className="mt-2 text-sm font-semibold text-slate-800">{gcash.gcashName}{gcash.gcashNumber ? ` • ${gcash.gcashNumber}` : ''}</p>
              ) : null}
            </div>
          ) : null}

          {/* Live preview of what this collects and what's left. */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="text-slate-500">Paying now</p><p className="font-semibold text-slate-900">{peso(applied)}</p></div>
            <div className={`rounded-2xl border px-3 py-2.5 ${isPartial ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <p className="text-slate-500">Remaining</p>
              <p className={`font-semibold ${isPartial ? 'text-amber-700' : 'text-emerald-700'}`}>{peso(remaining)}</p>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button onClick={confirm} className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
              <FaMoneyBillWave /> {isPartial ? 'Confirm Partial Payment' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
