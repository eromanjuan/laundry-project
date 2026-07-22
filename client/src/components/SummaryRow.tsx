interface SummaryRowProps {
  label: string
  value: string
  accent?: string
}

export function SummaryRow({ label, value, accent }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${accent ?? 'text-slate-800'}`}>{value}</span>
    </div>
  )
}
