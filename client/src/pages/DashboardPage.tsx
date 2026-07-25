import { useMemo, useState } from 'react'
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
import { useCollection, type WithDocId } from '../hooks/useCollection'
import {
  seedCustomers,
  seedMachines,
  seedOrders,
  todayISO,
  type CustomerRecord,
  type MachineRecord,
  type OrderRecord,
} from '../data/seeds'

function parsePeso(value: string) {
  return Number.parseFloat(value.replace(/[^\d.-]/g, '')) || 0
}

function pesos(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

/** Resolve an order's calendar date: explicit `date`, else derived from createdAt. */
function orderDate(order: OrderRecord & WithDocId): string {
  if (order.date) return order.date
  const created = (order as unknown as Record<string, unknown>).createdAt
  if (typeof created === 'number') {
    const offset = new Date(created).getTimezoneOffset()
    return new Date(created - offset * 60_000).toISOString().slice(0, 10)
  }
  return ''
}

export function DashboardPage() {
  const { data: orders } = useCollection<OrderRecord>('orders', seedOrders)
  const { data: customers } = useCollection<CustomerRecord>('customers', seedCustomers)
  const { data: machineList } = useCollection<MachineRecord>('machines', seedMachines)

  const [fromDate, setFromDate] = useState(todayISO())
  const [toDate, setToDate] = useState(todayISO())

  const machines = machineList.map((machine) => ({
    name: machine.name,
    state: (machine.status === 'Busy' ? 'Running' : machine.status === 'Maintenance' ? 'Finished' : 'Idle') as
      | 'Running'
      | 'Idle'
      | 'Finished',
  }))
  const machinesRunning = machines.filter((machine) => machine.state === 'Running').length

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const date = orderDate(order)
        return !date || ((!fromDate || date >= fromDate) && (!toDate || date <= toDate))
      }),
    [orders, fromDate, toDate],
  )

  const totalSales = filteredOrders.reduce((sum, order) => sum + parsePeso(order.amount), 0)
  const customersServed = new Set(filteredOrders.map((order) => order.customer)).size
  const pendingLaundry = filteredOrders.filter((order) => order.status === 'Pending' || order.status === 'Washing').length
  const readyForClaim = filteredOrders.filter((order) => order.status === 'Ready').length
  const completed = filteredOrders.filter((order) => order.status === 'Claimed').length

  const isToday = fromDate === todayISO() && toDate === todayISO()
  const periodLabel = isToday ? 'today' : `${fromDate} → ${toDate}`

  const stats = [
    { title: 'Sales', value: pesos(totalSales), subtitle: `Order value for ${periodLabel}`, icon: FaMoneyBillWave, accent: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    { title: 'Customers Served', value: customersServed.toString(), subtitle: `Distinct customers ${periodLabel}`, icon: FaUsers, accent: 'text-blue-600', iconBg: 'bg-blue-100' },
    { title: 'Pending Laundry', value: pendingLaundry.toString(), subtitle: 'Received or in washing', icon: FaClock, accent: 'text-amber-600', iconBg: 'bg-amber-100' },
    { title: 'Ready for Claim', value: readyForClaim.toString(), subtitle: 'Ready for pickup', icon: FaBoxOpen, accent: 'text-slate-700', iconBg: 'bg-slate-100' },
    { title: 'Machines Running', value: machinesRunning.toString(), subtitle: 'Active equipment now', icon: FaShoppingBag, accent: 'text-cyan-600', iconBg: 'bg-cyan-100' },
    { title: 'Completed', value: completed.toString(), subtitle: 'Orders claimed / released', icon: FaChartLine, accent: 'text-violet-600', iconBg: 'bg-violet-100' },
  ]

  const totalCustomers = customers.length

  const recentOrders = filteredOrders.slice(0, 6).map((order) => ({
    id: order.id,
    customer: order.customer,
    service: order.service,
    weight: order.weight,
    status: order.status,
    amount: order.amount,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Report Period</h3>
          <p className="text-sm text-slate-500">
            Showing {isToday ? "today's" : 'the selected period'}. {totalCustomers} total registered customers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-600">From</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="border-none bg-transparent outline-none" />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-600">To</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="border-none bg-transparent outline-none" />
          </label>
          <button onClick={() => { setFromDate(todayISO()); setToDate(todayISO()) }} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Today
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <DashboardStatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <RecentOrdersTable rows={recentOrders} />
        <MachineStatusList machines={machines} />
      </div>
    </div>
  )
}
