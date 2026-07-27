import { useEffect, useState } from 'react'
import { FaTimes, FaMoneyBillWave, FaQrcode, FaCheck } from 'react-icons/fa'
import type { PaymentSettings } from '../hooks/usePaymentSettings'

export interface PaymentResult {
  method: 'Cash' | 'GCash' | 'Cash+GCash'
  cash: number
  gcash: number
}

interface CollectPaymentModalProps {
  isOpen: boolean
  /** Amount to collect (the outstanding balance). */
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
  const [cashReceived, setCashReceived] = useState('')
  const [gcashAmount, setGcashAmount] = useState('')
  const [error, setError] = useState('')

  // Reset each time the modal (re)opens.
  useEffect(() => {
    if (isOpen) {
      setMode('Cash')
      setCashReceived('')
      setGcashAmount('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const cashIn = Number.parseFloat(cashReceived) || 0
  const gcashIn = Number.parseFloat(gcashAmount) || 0
  const splitCash = Math.max(0, due - gcashIn)
  const change = mode === 'Cash' ? Math.max(0, cashIn - due) : 0

  const confirm = () => {
    if (mode === 'Cash') {
      if (cashIn < due) return setError(`Cash received must be at least ${peso(due)}.`)
      onConfirm({ method: 'Cash', cash: due, gcash: 0 })
    } else if (mode === 'GCash') {
      onConfirm({ method: 'GCash', cash: 0, gcash: due })
    } else {
      if (gcashIn <= 0 || gcashIn >= due) return setError(`Enter the GCash portion between ${peso(0.01)} and ${peso(due - 0.01)}.`)
      onConfirm({ method: 'Cash+GCash', cash: Math.round(splitCash * 100) / 100, gcash: Math.round(gcashIn * 100) / 100 })
    }
  }

  const showGcashQr = mode === 'GCash' || (mode === 'Split' && gcashIn > 0)
  const gcashPortion = mode === 'GCash' ? due : gcashIn

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
            <p className="text-sm text-slate-500">Amount due</p>
            <p className="text-3xl font-bold text-blue-700">{peso(due)}</p>
          </div>

          {/* Method selector */}
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
                <input type="number" inputMode="decimal" value={cashReceived} onChange={(e) => { setCashReceived(e.target.value); setError('') }} placeholder={String(due)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" />
              </label>
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <span>Change</span><span>{peso(change)}</span>
              </div>
            </div>
          ) : null}

          {mode === 'Split' ? (
            <div className="mt-4 space-y-3">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">GCash portion</span>
                <input type="number" inputMode="decimal" value={gcashAmount} onChange={(e) => { setGcashAmount(e.target.value); setError('') }} placeholder="e.g. half of the balance" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" />
              </label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="text-slate-500">Cash</p><p className="font-semibold text-slate-900">{peso(splitCash)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="text-slate-500">GCash</p><p className="font-semibold text-slate-900">{peso(gcashIn)}</p></div>
              </div>
            </div>
          ) : null}

          {/* GCash QR — shown so the customer can scan and pay the GCash portion. */}
          {showGcashQr ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700"><FaQrcode /> Scan to pay {peso(gcashPortion)} via GCash</p>
              {gcash.gcashQr ? (
                <img src={gcash.gcashQr} alt="GCash QR" className="mx-auto mt-3 h-48 w-48 rounded-xl bg-white object-contain p-1" />
              ) : (
                <div className="mx-auto mt-3 flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 text-xs text-slate-400">
                  No GCash QR set. Add it in Settings → GCash Payment.
                </div>
              )}
              {(gcash.gcashName || gcash.gcashNumber) ? (
                <p className="mt-2 text-sm font-semibold text-slate-800">{gcash.gcashName}{gcash.gcashNumber ? ` • ${gcash.gcashNumber}` : ''}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">Confirm once the customer's GCash payment is received.</p>
            </div>
          ) : null}

          {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button onClick={confirm} className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
              {mode === 'GCash' ? <FaCheck /> : <FaMoneyBillWave />} Confirm {mode === 'Split' ? 'Split' : mode} Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
