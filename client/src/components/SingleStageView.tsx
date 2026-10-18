import type { OrderRecord } from '../data/seeds'
import type { WithDocId } from '../hooks/useCollection'
import { ProductionCard } from './ProductionCard'

/** Colour chip per workflow stage — mirrors the kanban column accents. */
const accent: Record<string, string> = {
  Pending: 'bg-rose-100 text-rose-700',
  Washing: 'bg-amber-100 text-amber-700',
  Drying: 'bg-orange-100 text-orange-700',
  Ready: 'bg-emerald-100 text-emerald-700',
  Claimed: 'bg-blue-100 text-blue-700',
}

interface SingleStageViewProps {
  /** The one workflow stage being viewed. */
  stage: string
  jobs: Array<OrderRecord & WithDocId>
  /** Which fields show on each card — same toggle as the kanban board. */
  fields: string[]
  onOpen: (job: OrderRecord & WithDocId) => void
  onShowCode: (job: OrderRecord & WithDocId) => void
}

/**
 * Flat card grid for a single workflow stage.
 *
 * Used instead of the kanban board when the stage filter is narrowed to one
 * stage: with a single stage there are no columns to drop between, so the
 * board would just be one tall column. Cards stay clickable for details and
 * stage changes happen from the order modal.
 */
export function SingleStageView({ stage, jobs, fields, onOpen, onShowCode }: SingleStageViewProps) {
  const chip = accent[stage] ?? 'bg-slate-100 text-slate-700'

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm shadow-slate-200/70">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">{stage}</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}>{jobs.length}</span>
        </div>
        <p className="text-sm text-slate-500">
          {jobs.length} job{jobs.length === 1 ? '' : 's'} in this stage
          {jobs.length > 0 ? ' — tap a card to open it.' : '.'}
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-sm text-slate-500">
          No {stage.toLowerCase()} orders match the current filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {jobs.map((job) => (
            <div key={job.id} onClick={() => onOpen(job)} className="cursor-pointer">
              <ProductionCard job={job} onShowCode={() => onShowCode(job)} fields={fields} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}