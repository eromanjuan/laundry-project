import { FaQrcode } from 'react-icons/fa'

interface ProductionCardProps {
  job: {
    id: string
    customer: string
    service: string
    weight: string
    loads: number
    totalLaundries: number
    assigned: string
    timeReceived: string
    estimatedRelease: string
    priority: 'Normal' | 'Express'
    paymentStatus: string
    status: string
    category: 'Express' | 'Full Service' | 'Self Service' | 'Commercial' | 'Ready Today'
    startedAt?: string
    releasedAt?: string
  }
  /** Open the scannable tracking code for this order. */
  onShowCode?: () => void
  /** Which fields to display; when omitted, all are shown. */
  fields?: string[]
}

/** Toggleable card fields, in display order. */
export const CARD_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'customer', label: 'Customer' },
  { key: 'service', label: 'Service' },
  { key: 'weight', label: 'Weight' },
  { key: 'loads', label: 'Loads' },
  { key: 'items', label: 'Items' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'priority', label: 'Priority' },
  { key: 'payment', label: 'Payment' },
  { key: 'status', label: 'Status' },
]

const statusColors: Record<string, string> = {
  Received: 'bg-blue-100 text-blue-700',
  Washing: 'bg-amber-100 text-amber-700',
  Drying: 'bg-orange-100 text-orange-700',
  Folding: 'bg-violet-100 text-violet-700',
  Ready: 'bg-emerald-100 text-emerald-700',
}

export function ProductionCard({ job, onShowCode, fields }: ProductionCardProps) {
  const show = (key: string) => !fields || fields.includes(key)
  const showServiceRow = show('service') || show('weight')
  const showDetailRows = show('loads') || show('items') || show('assigned') || showServiceRow
  const showBadges = show('priority') || show('payment') || show('status')

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{job.id}</p>
          {show('customer') ? <p className="mt-1 text-sm text-slate-600">{job.customer}</p> : null}
        </div>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onShowCode?.() }}
          title="Show tracking code"
          aria-label="Show tracking code"
          className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700"
        >
          <FaQrcode />
        </button>
      </div>

      {showDetailRows ? (
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {showServiceRow ? (
            <div className="flex items-center justify-between gap-2">
              <span>{show('service') ? job.service : ''}</span>
              {show('weight') ? <span className="font-semibold text-slate-900">{job.weight}</span> : null}
            </div>
          ) : null}
          {show('loads') ? (
            <div className="flex items-center justify-between">
              <span>Loads</span>
              <span className="font-semibold text-slate-900">{job.loads}</span>
            </div>
          ) : null}
          {show('items') ? (
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span className="font-semibold text-slate-900">{job.totalLaundries}</span>
            </div>
          ) : null}
          {show('assigned') ? (
            <div className="flex items-center justify-between">
              <span>Assigned</span>
              <span className="font-semibold text-slate-900">{job.assigned}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {show('timeline') ? (
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <p>Received: {job.timeReceived}</p>
          {job.startedAt ? <p>Started: {job.startedAt}</p> : null}
          {job.releasedAt ? <p>Released: {job.releasedAt}</p> : null}
        </div>
      ) : null}

      {showBadges ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {show('priority') ? (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${job.priority === 'Express' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
              {job.priority}
            </span>
          ) : null}
          {show('payment') ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {job.paymentStatus}
            </span>
          ) : null}
          {show('status') ? (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[job.status] ?? 'bg-slate-100 text-slate-700'}`}>
              {job.status}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
