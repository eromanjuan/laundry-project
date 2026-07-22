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
  }
}

const statusColors: Record<string, string> = {
  Received: 'bg-blue-100 text-blue-700',
  Washing: 'bg-amber-100 text-amber-700',
  Drying: 'bg-orange-100 text-orange-700',
  Folding: 'bg-violet-100 text-violet-700',
  Ready: 'bg-emerald-100 text-emerald-700',
}

export function ProductionCard({ job }: ProductionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{job.id}</p>
          <p className="mt-1 text-sm text-slate-600">{job.customer}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
          <FaQrcode />
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>{job.service}</span>
          <span className="font-semibold text-slate-900">{job.weight}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Loads</span>
          <span className="font-semibold text-slate-900">{job.loads}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Items</span>
          <span className="font-semibold text-slate-900">{job.totalLaundries}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Assigned</span>
          <span className="font-semibold text-slate-900">{job.assigned}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p>Received: {job.timeReceived}</p>
        <p>Release: {job.estimatedRelease}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${job.priority === 'Express' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
          {job.priority}
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {job.paymentStatus}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[job.status] ?? 'bg-slate-100 text-slate-700'}`}>
          {job.status}
        </span>
      </div>
    </div>
  )
}
