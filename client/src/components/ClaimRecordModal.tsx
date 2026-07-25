import { FaTimes, FaMoneyBillWave, FaTruck, FaPrint, FaCheckCircle } from 'react-icons/fa'
import type { OrderRecord } from '../data/seeds'
import type { WithDocId } from '../hooks/useCollection'

interface ClaimRecordModalProps {
  order: (OrderRecord & WithDocId) | null
  mobile?: string
  onClose: () => void
  onSettle: (order: OrderRecord & WithDocId) => void
  onRelease: (order: OrderRecord & WithDocId) => void
  onPrint: (order: OrderRecord & WithDocId) => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}

export function ClaimRecordModal({ order, mobile, onClose, onSettle, onRelease, onPrint }: ClaimRecordModalProps) {
  if (!order) return null

  const paid = order.paymentStatus === 'Paid'
  const claimStatus = order.status === 'Claimed' ? 'Released' : order.status === 'Ready' ? 'Ready for Claim' : order.status
  const canRelease = order.status === 'Ready' && paid

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Job Order {order.id}</h3>
            <p className="mt-1 text-sm text-slate-500">{order.customer} • {order.service}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
            <FaTimes />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Row label="Customer" value={order.customer} />
          <Row label="Mobile" value={mobile || '—'} />
          <Row label="Service" value={order.service} />
          <Row label="Weight" value={order.weight} />
          <Row label="Loads" value={String(order.loads)} />
          <Row label="Priority" value={order.priority} />
          <Row label="Date Received" value={order.date ?? order.timeReceived} />
          <Row label="Released" value={order.releasedAt ?? '—'} />
          <Row label="Total Amount" value={order.amount} />
          <Row label="Payment" value={order.paymentStatus} />
          <Row label="Balance" value={paid ? '₱0' : order.amount} />
          <Row label="Claim Status" value={claimStatus} />
        </div>

        <div className="mt-6 space-y-3">
          {!paid ? (
            <button
              onClick={() => onSettle(order)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FaMoneyBillWave /> Settle Payment ({order.amount})
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              <FaCheckCircle /> Fully paid
            </div>
          )}

          <button
            onClick={() => onRelease(order)}
            disabled={!canRelease}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaTruck /> Release to Customer
          </button>
          {order.status === 'Claimed' ? (
            <p className="text-center text-xs font-semibold text-emerald-600">Already released.</p>
          ) : !paid ? (
            <p className="text-center text-xs font-semibold text-rose-600">Settle the payment to enable release.</p>
          ) : order.status !== 'Ready' ? (
            <p className="text-center text-xs font-semibold text-amber-600">Order isn't ready to claim yet (still {order.status}).</p>
          ) : null}

          <button
            onClick={() => onPrint(order)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FaPrint /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
