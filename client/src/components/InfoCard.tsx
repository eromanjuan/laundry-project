interface InfoCardProps {
  title: string
  value: string
  accent?: string
}

export function InfoCard({ title, value, accent = 'text-slate-900' }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className={`mt-2 text-sm font-semibold ${accent}`}>{value}</p>
    </div>
  )
}
