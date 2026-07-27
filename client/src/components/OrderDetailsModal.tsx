import { useEffect, useState } from 'react'
import { FaTimes, FaTshirt, FaCheckCircle, FaBoxOpen, FaPlay, FaMoneyBillWave, FaSave, FaWind, FaPrint, FaQrcode } from 'react-icons/fa'
import type { OrderRecord } from '../data/seeds'
import type { WithDocId } from '../hooks/useCollection'
import { ImageViewerModal } from './ImageViewerModal'

export interface WasherOption {
  name: string
  /** 'LG' = a real LG machine (live), 'Manual' = a hand-added machine. */
  source: 'LG' | 'Manual'
}

interface OrderDetailsModalProps {
  order: (OrderRecord & WithDocId) | null
  /** A washer is free right now (needed to start a Pending job). */
  machineAvailable: boolean
  /** A dryer is free right now (needed to move a washing job into drying). */
  dryerAvailable: boolean
  /** Washers that are free right now, for the washing-stage picker. */
  washerOptions: WasherOption[]
  /** Dryers that are free right now, for the drying-stage picker. */
  dryerOptions: WasherOption[]
  onClose: () => void
  /** Start washing. Optionally pass a chosen washer name to start on. */
  onStart: (order: OrderRecord & WithDocId, washerName?: string) => void
  /** Move a washing order into the drying stage. */
  onDry: (order: OrderRecord & WithDocId) => void
  onReady: (order: OrderRecord & WithDocId) => void
  onClaim: (order: OrderRecord & WithDocId) => void
  onPay: (order: OrderRecord & WithDocId) => void
  onReleaseUnpaid: (order: OrderRecord & WithDocId) => void
  /** Move this order to a different machine (washer while washing, dryer while drying). */
  onReassign: (order: OrderRecord & WithDocId, machineName: string) => void
  /** Reprint the customer receipt (a COPY). */
  onReprintReceipt: (order: OrderRecord & WithDocId) => void
  /** Reprint the claim stub (the scannable barcode). */
  onReprintClaim: (order: OrderRecord & WithDocId) => void
  /** GCash proof-of-payment the customer uploaded (image data URL), if any. */
  paymentProof?: { image: string; submittedAt: number } | null
  /** Confirm the uploaded GCash proof and settle the balance. */
  onConfirmGcashProof: (order: OrderRecord & WithDocId) => void
  /** Decline the uploaded proof and message the customer. */
  onDeclineProof: (order: OrderRecord & WithDocId, message: string) => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}

export function OrderDetailsModal({ order, machineAvailable, dryerAvailable, washerOptions, dryerOptions, onClose, onStart, onDry, onReady, onClaim, onPay, onReleaseUnpaid, onReassign, onReprintReceipt, onReprintClaim, paymentProof, onConfirmGcashProof, onDeclineProof }: OrderDetailsModalProps) {
  // Staged machine pick — only applied when the user hits Save.
  const [pendingMachine, setPendingMachine] = useState('')
  // Optional message to the customer when declining a GCash proof.
  const [declineMsg, setDeclineMsg] = useState('')
  // Full-screen proof image viewer.
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)
  // Reset the staged pick whenever a different order opens in the modal.
  useEffect(() => { setPendingMachine(order?.assigned ?? '') }, [order?.id, order?.assigned])

  if (!order) return null

  const isPaid = order.paymentStatus === 'Paid'
  // Outstanding balance to collect, falling back sensibly for older orders.
  const balanceDue = order.balance ?? (isPaid ? '₱0' : order.amount)
  const amountPaid = order.amountPaid ?? (isPaid ? order.amount : '₱0')
  // The machine can only be changed while the laundry is actively on one — i.e.
  // Washing (a washer) or Drying (a dryer). Once Ready/Claimed it's locked.
  const isPending = order.status === 'Pending'
  const inDrying = order.status === 'Drying'
  const canReassign = isPending || order.status === 'Washing' || inDrying
  // Drying picks from dryers; every other reassignable stage picks from washers.
  const machineNoun = inDrying ? 'dryer' : 'washer'
  const activeOptions = inDrying ? dryerOptions : washerOptions
  // Free machines other than the one already assigned to this job.
  const otherFree = activeOptions.filter((w) => w.name !== order.assigned)
  const machineChanged = pendingMachine !== '' && pendingMachine !== order.assigned

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
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
          <Row label="Status" value={order.status} />
          <Row label="Payment" value={order.paymentStatus} />
          {order.paymentMethod ? <Row label="Method" value={order.paymentMethod} /> : null}
          <Row label="Weight" value={order.weight} />
          <Row label="Loads" value={String(order.loads)} />
          <Row label="Priority" value={order.priority} />
          <Row label="Total" value={order.amount} />
          {!isPaid ? <Row label="Paid" value={amountPaid} /> : null}
          {!isPaid ? <Row label="Balance" value={balanceDue} /> : null}
          <Row label="Received" value={order.timeReceived} />
          {order.startedAt ? <Row label="Started" value={order.startedAt} /> : null}
          {order.releasedAt ? <Row label="Released" value={order.releasedAt} /> : null}
        </div>

        {/* Washer assignment — where to put this laundry, and reassign to a free one. */}
        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Assigned {machineNoun}</span>
            <span className="font-semibold text-slate-900">{order.assigned || 'Unassigned'}</span>
          </div>
          {canReassign ? (
            <label className="mt-2 block space-y-1">
              <span className="text-xs font-semibold text-slate-500">
                {isPending ? 'Choose a washer, then press Start Washing' : `Move to an available ${machineNoun}`}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={pendingMachine}
                  onChange={(event) => setPendingMachine(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                >
                  <option value={order.assigned}>
                    {isPending ? (otherFree.length > 0 ? 'Auto — first free washer' : 'Unassigned') : `${order.assigned || 'Unassigned'} (current)`}
                  </option>
                  {otherFree.map((w) => (
                    <option key={`${w.source}-${w.name}`} value={w.name}>
                      {w.name} — {w.source === 'LG' ? 'LG · available' : 'available'}
                    </option>
                  ))}
                </select>
                {/* Pending starts via the Start Washing button, so no Save here. */}
                {!isPending ? (
                  <button
                    type="button"
                    onClick={() => onReassign(order, pendingMachine)}
                    disabled={!machineChanged}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaSave /> Save
                  </button>
                ) : null}
              </div>
            </label>
          ) : null}
          {canReassign ? (
            otherFree.length === 0 ? (
              <p className="mt-1 text-xs font-semibold text-amber-600">No {machineNoun} is free right now.</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Free now: {otherFree.map((w) => w.name).join(', ')}</p>
            )
          ) : (
            <p className="mt-2 text-xs text-slate-500">This stage is done — the machine can no longer be changed.</p>
          )}
        </div>

        {/* Customer-uploaded GCash proof — verify, then confirm to settle. */}
        {paymentProof && !isPaid ? (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-3">
            <p className="text-sm font-semibold text-slate-700">GCash proof of payment submitted</p>
            <p className="text-xs text-slate-500">Uploaded {new Date(paymentProof.submittedAt).toLocaleString()} — verify it, then confirm.</p>
            <button type="button" onClick={() => setViewerSrc(paymentProof.image)} className="mt-2 block w-full" title="Tap to view full size">
              <img src={paymentProof.image} alt="GCash proof" className="mx-auto max-h-60 cursor-zoom-in rounded-xl border border-slate-200 object-contain transition hover:opacity-90" />
            </button>
            <button
              onClick={() => onConfirmGcashProof(order)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <FaCheckCircle /> Confirm GCash Payment ({balanceDue})
            </button>
            {/* Decline — e.g. amount short. Message reaches the customer's track page. */}
            <textarea
              value={declineMsg}
              onChange={(event) => setDeclineMsg(event.target.value)}
              rows={2}
              placeholder={`Optional message — e.g. "Only ₱1 received, balance is ${balanceDue}. Please pay the rest."`}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              onClick={() => { onDeclineProof(order, declineMsg); setDeclineMsg('') }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <FaTimes /> Decline &amp; Message Customer
            </button>
          </div>
        ) : null}

        {/* Collect payment — available whenever the order isn't fully paid. */}
        {!isPaid ? (
          <button
            onClick={() => onPay(order)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <FaMoneyBillWave /> Collect Balance ({balanceDue})
          </button>
        ) : null}

        {/* Stage progression — each step enforces its rule. */}
        <div className="mt-4 space-y-3">
          {order.status === 'Pending' ? (
            <>
              <button
                onClick={() => onStart(order, pendingMachine === order.assigned ? undefined : pendingMachine)}
                disabled={!machineAvailable}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaPlay /> Start Washing
              </button>
              {!machineAvailable ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">
                  No available machine — this job stays Pending until one frees up.
                </p>
              ) : null}
            </>
          ) : null}

          {order.status === 'Washing' ? (
            <>
              <button
                onClick={() => onDry(order)}
                disabled={!dryerAvailable}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaWind /> Move to Drying (washing done)
              </button>
              {!dryerAvailable ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">
                  No available dryer — this laundry stays in washing until one frees up.
                </p>
              ) : null}
            </>
          ) : null}

          {inDrying ? (
            <button
              onClick={() => onReady(order)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              <FaTshirt /> Mark as Ready (drying done)
            </button>
          ) : null}

          {order.status === 'Ready' ? (
            <>
              <button
                onClick={() => onClaim(order)}
                disabled={!isPaid}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaBoxOpen /> Release / Mark Claimed
              </button>
              {!isPaid ? (
                <button
                  onClick={() => onReleaseUnpaid(order)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  Release Unpaid — settle balance later
                </button>
              ) : null}
            </>
          ) : null}

          {order.status === 'Claimed' ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <FaCheckCircle /> Completed & released
            </div>
          ) : null}
        </div>

        {/* Reprints — receipt is a COPY (official once fully paid); claim stub is
            the scannable barcode. */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Reprint</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => onReprintReceipt(order)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FaPrint /> Reprint Receipt
            </button>
            <button
              onClick={() => onReprintClaim(order)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FaQrcode /> Reprint Claim Stub
            </button>
          </div>
          {!isPaid ? (
            <p className="mt-2 text-center text-xs text-amber-600">Not fully paid — the receipt prints as PROVISIONAL until the balance is settled.</p>
          ) : null}
        </div>
      </div>

      <ImageViewerModal
        src={viewerSrc}
        filename={`gcash-proof-${order.id.replace(/[^A-Za-z0-9-]/g, '')}.jpg`}
        onClose={() => setViewerSrc(null)}
      />
    </div>
  )
}
