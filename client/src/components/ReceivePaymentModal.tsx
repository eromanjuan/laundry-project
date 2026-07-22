import { useMemo, useState } from 'react'
import type { PaymentRow } from './PaymentTable'

interface ReceivePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  row: PaymentRow | null
}

export function ReceivePaymentModal({ isOpen, onClose, row }: ReceivePaymentModalProps) {
  const [cashReceived, setCashReceived] = useState('')

  const total = Number.parseFloat((row?.amountDue ?? '0').replace(/[^\d.]/g, ''))
  const paid = Number.parseFloat((row?.amountPaid ?? '0').replace(/[^\d.]/g, ''))
  const remaining = Math.max(total - paid, 0)
  const cashValue = Number.parseFloat(cashReceived) || 0
  const change = Math.max(cashValue - remaining, 0)

  const summary = useMemo(() => ({ remaining, change }), [remaining, change])

  if (!isOpen || !row) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Receive Payment</h3>
            <p className="mt-1 text-sm text-slate-500">{row.orNumber} • {row.customer}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100">Close</button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Amount Due</span>
              <span className="font-semibold text-slate-900">{row.amountDue}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-semibold text-slate-900">{row.amountPaid}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-500">Remaining Balance</span>
              <span className="font-semibold text-blue-700">₱{summary.remaining.toFixed(2)}</span>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Cash Received</span>
            <input
              type="number"
              value={cashReceived}
              onChange={(event) => setCashReceived(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
              placeholder="0"
            />
          </label>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <p className="font-semibold">Change</p>
            <p className="mt-1">₱{summary.change.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Cancel</button>
          <button className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Save Payment</button>
        </div>
      </div>
    </div>
  )
}
