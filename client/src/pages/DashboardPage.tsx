import {
  FaBoxOpen,
  FaChartLine,
  FaClock,
  FaMoneyBillWave,
  FaShoppingBag,
  FaUsers,
} from 'react-icons/fa'
import { DashboardStatCard } from '../components/DashboardStatCard'
import { MachineStatusList } from '../components/MachineStatusList'
import { RecentOrdersTable } from '../components/RecentOrdersTable'

const stats = [
  {
    title: "Today's Sales",
    value: '₱18,420',
    subtitle: 'Revenue from completed orders today',
    icon: FaMoneyBillWave,
    accent: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  {
    title: "Today's Customers",
    value: '86',
    subtitle: 'New and returning customers served',
    icon: FaUsers,
    accent: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  {
    title: 'Pending Laundry',
    value: '24',
    subtitle: 'Orders awaiting processing',
    icon: FaClock,
    accent: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  {
    title: 'Ready for Claim',
    value: '12',
    subtitle: 'Orders ready for pickup',
    icon: FaBoxOpen,
    accent: 'text-slate-700',
    iconBg: 'bg-slate-100',
  },
  {
    title: 'Machines Running',
    value: '4',
    subtitle: 'Active equipment in operation',
    icon: FaShoppingBag,
    accent: 'text-cyan-600',
    iconBg: 'bg-cyan-100',
  },
  {
    title: 'Completed Today',
    value: '63',
    subtitle: 'Orders completed successfully',
    icon: FaChartLine,
    accent: 'text-violet-600',
    iconBg: 'bg-violet-100',
  },
]

const orders = [
  { id: '#1024', customer: 'Maria Santos', service: 'Wash & Fold', weight: '6.5 kg', status: 'Ready', amount: '₱320' },
  { id: '#1025', customer: 'Jose Cruz', service: 'Dry Cleaning', weight: '3.2 kg', status: 'In Progress', amount: '₱480' },
  { id: '#1026', customer: 'Rina Dela Cruz', service: 'Ironing', weight: '2.0 kg', status: 'Pending', amount: '₱180' },
  { id: '#1027', customer: 'Liza Gomez', service: 'Express Wash', weight: '4.8 kg', status: 'Ready', amount: '₱260' },
]

const machines = [
  { name: 'Washer 1', state: 'Running' as const },
  { name: 'Washer 2', state: 'Idle' as const },
  { name: 'Dryer 1', state: 'Finished' as const },
  { name: 'Dryer 2', state: 'Running' as const },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <DashboardStatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <RecentOrdersTable rows={orders} />
        <MachineStatusList machines={machines} />
      </div>
    </div>
  )
}
