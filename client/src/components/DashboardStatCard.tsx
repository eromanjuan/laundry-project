import type { IconType } from 'react-icons'

interface DashboardStatCardProps {
  title: string
  value: string
  subtitle: string
  icon: IconType
  accent: string
  iconBg: string
}

export function DashboardStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  iconBg,
}: DashboardStatCardProps) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${iconBg}`}>
          <Icon className={`text-xl ${accent}`} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}
