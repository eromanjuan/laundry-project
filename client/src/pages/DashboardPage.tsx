import { StatCard } from '../components/StatCard'
import { PlaceholderPage } from './PlaceholderPage'

const stats = [
  { title: 'Today Orders', value: '128', detail: 'Fresh pickups and deliveries', accent: 'bg-blue-100 text-blue-700' },
  { title: 'Revenue', value: '₱48,250', detail: 'Collected across all counters', accent: 'bg-emerald-100 text-emerald-700' },
  { title: 'Pending Claims', value: '24', detail: 'Awaiting customer pickup', accent: 'bg-amber-100 text-amber-700' },
  { title: 'Machine Load', value: '82%', detail: 'Active capacity across facilities', accent: 'bg-slate-100 text-slate-700' },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <PlaceholderPage
        title="Dashboard"
        subtitle="Monitor orders, throughput, cash flow, and service status at a glance."
        description="This area can later host live KPIs, charts, and workflow summaries tailored to your laundry operations."
      />
    </div>
  )
}
