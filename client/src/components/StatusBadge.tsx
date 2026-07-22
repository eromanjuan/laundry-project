interface StatusBadgeProps {
  label: string
  tone: 'blue' | 'green' | 'amber' | 'slate' | 'red'
}

const tones = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  slate: 'bg-slate-100 text-slate-700',
  red: 'bg-rose-100 text-rose-700',
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {label}
    </span>
  )
}
