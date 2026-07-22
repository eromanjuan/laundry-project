import type { ReactNode } from 'react'

interface ProductionColumnProps {
  title: string
  count: number
  accent: string
  children: ReactNode
}

export function ProductionColumn({ title, count, accent, children }: ProductionColumnProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm shadow-slate-200/70">
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{count} jobs</p>
        </div>
        <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accent}`}>{count}</div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
