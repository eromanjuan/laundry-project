import type { ClaimRow } from './ClaimTable'

interface ClaimDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  row: ClaimRow | null
}

export function ClaimDetailsModal({ isOpen, onClose, row }: ClaimDetailsModalProps) {
  if (!isOpen || !row) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Order Details</h3>
            <p className="mt-1 text-sm text-slate-500">{row.id} • {row.customer}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100">Close</button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">Customer Information</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Name:</span> {row.customer}</p>
              <p><span className="font-semibold text-slate-800">Mobile:</span> {row.mobile}</p>
              <p><span className="font-semibold text-slate-800">Service:</span> {row.service}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">Laundry Items</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Weight:</span> {row.weight}</p>
              <p><span className="font-semibold text-slate-800">Loads:</span> {row.loads}</p>
              <p><span className="font-semibold text-slate-800">Machine Used:</span> Washer 2 / Dryer 1</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">Schedule</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Received:</span> {row.dateReceived}</p>
              <p><span className="font-semibold text-slate-800">Estimated Release:</span> {row.releaseSchedule}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">Payment Summary</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Total:</span> {row.totalAmount}</p>
              <p><span className="font-semibold text-slate-800">Paid:</span> {row.amountPaid}</p>
              <p><span className="font-semibold text-slate-800">Balance:</span> {row.balance}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-blue-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes</p>
          <p className="mt-2">Handle with care, separate whites from colors, and notify customer once released.</p>
        </div>
      </div>
    </div>
  )
}
