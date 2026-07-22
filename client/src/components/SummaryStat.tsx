interface SummaryStatProps {
  label: string
  value: string
  accent: string
}

export function SummaryStat({ label, value, accent }: SummaryStatProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <p className="text-sm text-slate-500">{label}</p>
      <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${accent}`}>{value}</div>
    </div>
  )
}
