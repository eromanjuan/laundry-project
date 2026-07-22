import { useMemo, useState } from 'react'
import { FaEnvelope, FaFileExcel, FaFilePdf, FaPrint } from 'react-icons/fa'
import { SummaryStat } from '../components/SummaryStat'

type FilterKey = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom'

interface SummaryData {
  grossSales: number
  discounts: number
  refunds: number
  totalCollections: number
  totalExpenses: number
  outstandingReceivables: number
  customersServed: number
  jobOrders: number
  laundryLoads: number
  paymentBreakdown: Array<{ label: string; value: number; color: string }>
  services: Array<{ label: string; transactions: number; revenue: number }>
  jobOrderSummary: Array<{ label: string; value: number }>
  customerSummary: Array<{ label: string; value: number }>
  expenseSummary: Array<{ label: string; value: number }>
  cashDrawer: {
    beginningFloat: number
    cashSales: number
    cashExpenses: number
    cashCollection: number
    remainingCash: number
    lastCollectionDate: string
    lastCollectionAmount: number
  }
  hourlySales: number[]
}

const summaryPresets: Record<FilterKey, SummaryData> = {
  today: {
    grossSales: 128400,
    discounts: 3200,
    refunds: 1180,
    totalCollections: 121500,
    totalExpenses: 28520,
    outstandingReceivables: 3800,
    customersServed: 84,
    jobOrders: 48,
    laundryLoads: 76,
    paymentBreakdown: [
      { label: 'Cash', value: 48200, color: '#2563eb' },
      { label: 'GCash', value: 22600, color: '#16a34a' },
      { label: 'Maya', value: 12150, color: '#f59e0b' },
      { label: 'Bank Transfer', value: 16400, color: '#7c3aed' },
      { label: 'Credit', value: 9800, color: '#ef4444' },
      { label: 'Partial Payments', value: 16350, color: '#0f766e' },
    ],
    services: [
      { label: 'Wash & Fold', transactions: 24, revenue: 34200 },
      { label: 'Wash & Dry', transactions: 10, revenue: 18400 },
      { label: 'Dry Only', transactions: 8, revenue: 12800 },
      { label: 'Comforters', transactions: 5, revenue: 9800 },
      { label: 'Blankets', transactions: 4, revenue: 7200 },
      { label: 'Shoes', transactions: 3, revenue: 6100 },
      { label: 'Spot Cleaning', transactions: 2, revenue: 4500 },
      { label: 'Hand Wash', transactions: 2, revenue: 3800 },
      { label: 'Pickup & Delivery', transactions: 6, revenue: 12400 },
      { label: 'Commercial Laundry', transactions: 4, revenue: 9600 },
      { label: 'Others', transactions: 2, revenue: 3600 },
    ],
    jobOrderSummary: [
      { label: 'Received', value: 56 },
      { label: 'Processing', value: 18 },
      { label: 'Ready for Claim', value: 14 },
      { label: 'Claimed', value: 22 },
      { label: 'Unclaimed', value: 6 },
      { label: 'Cancelled', value: 3 },
    ],
    customerSummary: [
      { label: 'New Customers', value: 24 },
      { label: 'Returning Customers', value: 41 },
      { label: 'Walk-in Customers', value: 13 },
      { label: 'Commercial Accounts', value: 6 },
    ],
    expenseSummary: [
      { label: 'Detergent', value: 6400 },
      { label: 'Fabric Conditioner', value: 1800 },
      { label: 'LPG', value: 2400 },
      { label: 'Electricity', value: 4200 },
      { label: 'Water', value: 1600 },
      { label: 'Staff Salary', value: 15600 },
      { label: 'Transportation', value: 1200 },
      { label: 'Marketing', value: 900 },
      { label: 'Maintenance', value: 1100 },
      { label: 'Office Supplies', value: 800 },
      { label: 'Others', value: 520 },
    ],
    cashDrawer: {
      beginningFloat: 8000,
      cashSales: 48200,
      cashExpenses: 5600,
      cashCollection: 42600,
      remainingCash: 13200,
      lastCollectionDate: 'Today, 4:30 PM',
      lastCollectionAmount: 8420,
    },
    hourlySales: [5200, 6400, 5800, 7200, 8100, 9400, 12800],
  },
  yesterday: {
    grossSales: 118900,
    discounts: 2800,
    refunds: 860,
    totalCollections: 112600,
    totalExpenses: 26450,
    outstandingReceivables: 4200,
    customersServed: 76,
    jobOrders: 44,
    laundryLoads: 68,
    paymentBreakdown: [
      { label: 'Cash', value: 44100, color: '#2563eb' },
      { label: 'GCash', value: 19800, color: '#16a34a' },
      { label: 'Maya', value: 10800, color: '#f59e0b' },
      { label: 'Bank Transfer', value: 15200, color: '#7c3aed' },
      { label: 'Credit', value: 9400, color: '#ef4444' },
      { label: 'Partial Payments', value: 14300, color: '#0f766e' },
    ],
    services: [
      { label: 'Wash & Fold', transactions: 21, revenue: 30100 },
      { label: 'Wash & Dry', transactions: 10, revenue: 17800 },
      { label: 'Dry Only', transactions: 7, revenue: 11200 },
      { label: 'Comforters', transactions: 5, revenue: 9200 },
      { label: 'Blankets', transactions: 4, revenue: 6400 },
      { label: 'Shoes', transactions: 2, revenue: 5100 },
      { label: 'Spot Cleaning', transactions: 2, revenue: 3600 },
      { label: 'Hand Wash', transactions: 2, revenue: 3200 },
      { label: 'Pickup & Delivery', transactions: 5, revenue: 10800 },
      { label: 'Commercial Laundry', transactions: 3, revenue: 7800 },
      { label: 'Others', transactions: 2, revenue: 2500 },
    ],
    jobOrderSummary: [
      { label: 'Received', value: 49 },
      { label: 'Processing', value: 16 },
      { label: 'Ready for Claim', value: 12 },
      { label: 'Claimed', value: 20 },
      { label: 'Unclaimed', value: 5 },
      { label: 'Cancelled', value: 2 },
    ],
    customerSummary: [
      { label: 'New Customers', value: 20 },
      { label: 'Returning Customers', value: 38 },
      { label: 'Walk-in Customers', value: 12 },
      { label: 'Commercial Accounts', value: 6 },
    ],
    expenseSummary: [
      { label: 'Detergent', value: 5800 },
      { label: 'Fabric Conditioner', value: 1600 },
      { label: 'LPG', value: 2200 },
      { label: 'Electricity', value: 3900 },
      { label: 'Water', value: 1500 },
      { label: 'Staff Salary', value: 14800 },
      { label: 'Transportation', value: 1100 },
      { label: 'Marketing', value: 800 },
      { label: 'Maintenance', value: 1000 },
      { label: 'Office Supplies', value: 700 },
      { label: 'Others', value: 500 },
    ],
    cashDrawer: {
      beginningFloat: 7500,
      cashSales: 44100,
      cashExpenses: 5200,
      cashCollection: 38900,
      remainingCash: 12100,
      lastCollectionDate: 'Yesterday, 4:00 PM',
      lastCollectionAmount: 7600,
    },
    hourlySales: [4800, 5200, 5800, 6500, 7600, 9000, 11000],
  },
  'this-week': {
    grossSales: 652000,
    discounts: 15400,
    refunds: 5600,
    totalCollections: 618000,
    totalExpenses: 142300,
    outstandingReceivables: 18200,
    customersServed: 398,
    jobOrders: 224,
    laundryLoads: 352,
    paymentBreakdown: [
      { label: 'Cash', value: 234000, color: '#2563eb' },
      { label: 'GCash', value: 114000, color: '#16a34a' },
      { label: 'Maya', value: 56000, color: '#f59e0b' },
      { label: 'Bank Transfer', value: 84000, color: '#7c3aed' },
      { label: 'Credit', value: 44000, color: '#ef4444' },
      { label: 'Partial Payments', value: 86000, color: '#0f766e' },
    ],
    services: [
      { label: 'Wash & Fold', transactions: 112, revenue: 184000 },
      { label: 'Wash & Dry', transactions: 44, revenue: 91200 },
      { label: 'Dry Only', transactions: 38, revenue: 68400 },
      { label: 'Comforters', transactions: 22, revenue: 46800 },
      { label: 'Blankets', transactions: 16, revenue: 32100 },
      { label: 'Shoes', transactions: 12, revenue: 21400 },
      { label: 'Spot Cleaning', transactions: 10, revenue: 18400 },
      { label: 'Hand Wash', transactions: 8, revenue: 15400 },
      { label: 'Pickup & Delivery', transactions: 24, revenue: 48600 },
      { label: 'Commercial Laundry', transactions: 20, revenue: 42400 },
      { label: 'Others', transactions: 10, revenue: 11200 },
    ],
    jobOrderSummary: [
      { label: 'Received', value: 248 },
      { label: 'Processing', value: 84 },
      { label: 'Ready for Claim', value: 61 },
      { label: 'Claimed', value: 129 },
      { label: 'Unclaimed', value: 24 },
      { label: 'Cancelled', value: 10 },
    ],
    customerSummary: [
      { label: 'New Customers', value: 82 },
      { label: 'Returning Customers', value: 194 },
      { label: 'Walk-in Customers', value: 76 },
      { label: 'Commercial Accounts', value: 46 },
    ],
    expenseSummary: [
      { label: 'Detergent', value: 26400 },
      { label: 'Fabric Conditioner', value: 9100 },
      { label: 'LPG', value: 12600 },
      { label: 'Electricity', value: 21400 },
      { label: 'Water', value: 7800 },
      { label: 'Staff Salary', value: 78000 },
      { label: 'Transportation', value: 6200 },
      { label: 'Marketing', value: 4200 },
      { label: 'Maintenance', value: 5200 },
      { label: 'Office Supplies', value: 3900 },
      { label: 'Others', value: 2400 },
    ],
    cashDrawer: {
      beginningFloat: 24000,
      cashSales: 234000,
      cashExpenses: 28000,
      cashCollection: 206000,
      remainingCash: 62000,
      lastCollectionDate: 'Today, 6:20 PM',
      lastCollectionAmount: 34200,
    },
    hourlySales: [24000, 28000, 30000, 32000, 35000, 42000, 51000],
  },
  'this-month': {
    grossSales: 2840000,
    discounts: 62000,
    refunds: 24800,
    totalCollections: 2690000,
    totalExpenses: 610000,
    outstandingReceivables: 88000,
    customersServed: 1620,
    jobOrders: 944,
    laundryLoads: 1380,
    paymentBreakdown: [
      { label: 'Cash', value: 1020000, color: '#2563eb' },
      { label: 'GCash', value: 512000, color: '#16a34a' },
      { label: 'Maya', value: 248000, color: '#f59e0b' },
      { label: 'Bank Transfer', value: 368000, color: '#7c3aed' },
      { label: 'Credit', value: 196000, color: '#ef4444' },
      { label: 'Partial Payments', value: 360000, color: '#0f766e' },
    ],
    services: [
      { label: 'Wash & Fold', transactions: 420, revenue: 742000 },
      { label: 'Wash & Dry', transactions: 180, revenue: 312000 },
      { label: 'Dry Only', transactions: 150, revenue: 264000 },
      { label: 'Comforters', transactions: 75, revenue: 160000 },
      { label: 'Blankets', transactions: 60, revenue: 112000 },
      { label: 'Shoes', transactions: 35, revenue: 76000 },
      { label: 'Spot Cleaning', transactions: 28, revenue: 59000 },
      { label: 'Hand Wash', transactions: 22, revenue: 48000 },
      { label: 'Pickup & Delivery', transactions: 90, revenue: 162000 },
      { label: 'Commercial Laundry', transactions: 65, revenue: 138000 },
      { label: 'Others', transactions: 32, revenue: 58000 },
    ],
    jobOrderSummary: [
      { label: 'Received', value: 1020 },
      { label: 'Processing', value: 312 },
      { label: 'Ready for Claim', value: 240 },
      { label: 'Claimed', value: 620 },
      { label: 'Unclaimed', value: 96 },
      { label: 'Cancelled', value: 34 },
    ],
    customerSummary: [
      { label: 'New Customers', value: 320 },
      { label: 'Returning Customers', value: 840 },
      { label: 'Walk-in Customers', value: 310 },
      { label: 'Commercial Accounts', value: 150 },
    ],
    expenseSummary: [
      { label: 'Detergent', value: 118000 },
      { label: 'Fabric Conditioner', value: 36000 },
      { label: 'LPG', value: 54000 },
      { label: 'Electricity', value: 76000 },
      { label: 'Water', value: 28000 },
      { label: 'Staff Salary', value: 300000 },
      { label: 'Transportation', value: 26000 },
      { label: 'Marketing', value: 16000 },
      { label: 'Maintenance', value: 22000 },
      { label: 'Office Supplies', value: 12000 },
      { label: 'Others', value: 10000 },
    ],
    cashDrawer: {
      beginningFloat: 96000,
      cashSales: 1020000,
      cashExpenses: 140000,
      cashCollection: 900000,
      remainingCash: 240000,
      lastCollectionDate: 'Today, 6:35 PM',
      lastCollectionAmount: 182000,
    },
    hourlySales: [82000, 90000, 94000, 104000, 116000, 132000, 148000],
  },
  custom: {
    grossSales: 136800,
    discounts: 3600,
    refunds: 1280,
    totalCollections: 129500,
    totalExpenses: 30400,
    outstandingReceivables: 4100,
    customersServed: 91,
    jobOrders: 52,
    laundryLoads: 79,
    paymentBreakdown: [
      { label: 'Cash', value: 49800, color: '#2563eb' },
      { label: 'GCash', value: 23600, color: '#16a34a' },
      { label: 'Maya', value: 13200, color: '#f59e0b' },
      { label: 'Bank Transfer', value: 17600, color: '#7c3aed' },
      { label: 'Credit', value: 10400, color: '#ef4444' },
      { label: 'Partial Payments', value: 16900, color: '#0f766e' },
    ],
    services: [
      { label: 'Wash & Fold', transactions: 26, revenue: 36400 },
      { label: 'Wash & Dry', transactions: 10, revenue: 19600 },
      { label: 'Dry Only', transactions: 8, revenue: 13400 },
      { label: 'Comforters', transactions: 5, revenue: 10600 },
      { label: 'Blankets', transactions: 4, revenue: 7600 },
      { label: 'Shoes', transactions: 3, revenue: 6400 },
      { label: 'Spot Cleaning', transactions: 2, revenue: 4700 },
      { label: 'Hand Wash', transactions: 2, revenue: 4000 },
      { label: 'Pickup & Delivery', transactions: 6, revenue: 13200 },
      { label: 'Commercial Laundry', transactions: 4, revenue: 10200 },
      { label: 'Others', transactions: 2, revenue: 3800 },
    ],
    jobOrderSummary: [
      { label: 'Received', value: 58 },
      { label: 'Processing', value: 19 },
      { label: 'Ready for Claim', value: 15 },
      { label: 'Claimed', value: 24 },
      { label: 'Unclaimed', value: 7 },
      { label: 'Cancelled', value: 3 },
    ],
    customerSummary: [
      { label: 'New Customers', value: 25 },
      { label: 'Returning Customers', value: 43 },
      { label: 'Walk-in Customers', value: 14 },
      { label: 'Commercial Accounts', value: 9 },
    ],
    expenseSummary: [
      { label: 'Detergent', value: 6800 },
      { label: 'Fabric Conditioner', value: 1900 },
      { label: 'LPG', value: 2600 },
      { label: 'Electricity', value: 4400 },
      { label: 'Water', value: 1700 },
      { label: 'Staff Salary', value: 16200 },
      { label: 'Transportation', value: 1300 },
      { label: 'Marketing', value: 1000 },
      { label: 'Maintenance', value: 1200 },
      { label: 'Office Supplies', value: 850 },
      { label: 'Others', value: 550 },
    ],
    cashDrawer: {
      beginningFloat: 8200,
      cashSales: 49800,
      cashExpenses: 5800,
      cashCollection: 44000,
      remainingCash: 13600,
      lastCollectionDate: 'Today, 4:45 PM',
      lastCollectionAmount: 8800,
    },
    hourlySales: [5400, 6600, 6100, 7600, 8400, 9800, 13200],
  },
}

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'custom', label: 'Custom Date Range' },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  )
}

function MetricRow({ label, value, percent }: { label: string; value: string; percent?: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600">
      <span>{label}</span>
      <div className="text-right">
        <p className="font-semibold text-slate-900">{value}</p>
        {percent ? <p className="text-xs text-slate-500">{percent}</p> : null}
      </div>
    </div>
  )
}

function PieChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((acc, item) => acc + item.value, 0)
  let offset = 0

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <svg viewBox="0 0 120 120" className="mx-auto h-44 w-44 shrink-0">
        <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="24" />
        {data.map((item) => {
          const length = (item.value / total) * 263
          const dash = `${length} 263`
          const circle = (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke={item.color}
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          )
          offset += length
          return circle
        })}
      </svg>

      <div className="flex-1 space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600">{item.label}</span>
            </div>
            <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
            <span>{item.label}</span>
            <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function LineChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = 100 - ((value - min) / (max - min || 1)) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <svg viewBox="0 0 100 100" className="h-48 w-full">
        <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={points} />
        {values.map((value, index) => {
          const x = (index / (values.length - 1)) * 100
          const y = 100 - ((value - min) / (max - min || 1)) * 100
          return <circle key={`${value}-${index}`} cx={x} cy={y} r="2.2" fill="#1d4ed8" />
        })}
      </svg>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>08:00</span>
        <span>10:00</span>
        <span>12:00</span>
        <span>14:00</span>
        <span>16:00</span>
        <span>18:00</span>
        <span>20:00</span>
      </div>
    </div>
  )
}

export function SalesSummaryPage() {
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('today')
  const data = useMemo(() => summaryPresets[selectedFilter], [selectedFilter])

  const netSales = data.grossSales - data.discounts - data.refunds
  const netProfit = data.grossSales - data.totalExpenses
  const profitMargin = data.grossSales ? (netProfit / data.grossSales) * 100 : 0
  const averageRevenuePerJobOrder = data.jobOrders ? data.grossSales / data.jobOrders : 0
  const averageRevenuePerLoad = data.laundryLoads ? data.grossSales / data.laundryLoads : 0
  const totalExpenseValue = data.expenseSummary.reduce((acc, item) => acc + item.value, 0)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Sales Summary</p>
            <h2 className="mt-2 text-3xl font-semibold">End-of-day business performance report</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Review revenue, payment mix, customer activity, expenses, and cash position through a finance-ready POS dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setSelectedFilter(filter.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selectedFilter === filter.key ? 'bg-white text-blue-700' : 'bg-blue-500/40 text-blue-50 hover:bg-blue-400/60'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaPrint /> Print Sales Summary
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaFilePdf /> Export PDF
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaFileExcel /> Export Excel
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaEnvelope /> Email Report
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Gross Sales" value={formatCurrency(data.grossSales)} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Net Sales" value={formatCurrency(netSales)} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Total Collections" value={formatCurrency(data.totalCollections)} accent="bg-violet-100 text-violet-700" />
        <SummaryStat label="Total Expenses" value={formatCurrency(data.totalExpenses)} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Cash Drawer Balance" value={formatCurrency(data.cashDrawer.remainingCash)} accent="bg-cyan-100 text-cyan-700" />
        <SummaryStat label="Outstanding Receivables" value={formatCurrency(data.outstandingReceivables)} accent="bg-rose-100 text-rose-700" />
        <SummaryStat label="Total Customers Served" value={data.customersServed.toString()} accent="bg-slate-100 text-slate-700" />
        <SummaryStat label="Total Job Orders" value={data.jobOrders.toString()} accent="bg-indigo-100 text-indigo-700" />
        <SummaryStat label="Total Laundry Loads" value={data.laundryLoads.toString()} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Average Sale / Customer" value={formatCurrency(data.grossSales / data.customersServed)} accent="bg-blue-100 text-blue-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Sales Breakdown" subtitle="Review the adjusted revenue flow after discounts and refunds.">
          <div className="space-y-3">
            <MetricRow label="Gross Sales" value={formatCurrency(data.grossSales)} />
            <MetricRow label="Less Discounts" value={formatCurrency(data.discounts)} />
            <MetricRow label="Less Refunds" value={formatCurrency(data.refunds)} />
            <MetricRow label="Net Sales" value={formatCurrency(netSales)} />
          </div>
        </SectionCard>

        <SectionCard title="Profit Summary" subtitle="View the profitability of the selected window.">
          <div className="space-y-3">
            <MetricRow label="Gross Sales" value={formatCurrency(data.grossSales)} />
            <MetricRow label="Expenses" value={formatCurrency(data.totalExpenses)} />
            <MetricRow label="Net Profit" value={formatCurrency(netProfit)} />
            <MetricRow label="Profit Margin" value={`${profitMargin.toFixed(1)}%`} />
            <MetricRow label="Avg Revenue / Job Order" value={formatCurrency(averageRevenuePerJobOrder)} />
            <MetricRow label="Avg Revenue / Load" value={formatCurrency(averageRevenuePerLoad)} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Payment Breakdown" subtitle="Measure payment mix against income.">
          <div className="space-y-3">
            {data.paymentBreakdown.map((item) => (
              <MetricRow
                key={item.label}
                label={item.label}
                value={formatCurrency(item.value)}
                percent={`${((item.value / data.totalCollections) * 100).toFixed(1)}% of total collections`}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Service Sales" subtitle="Break down revenue by laundry service category.">
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium">Transactions</th>
                  <th className="px-3 py-2 font-medium">Revenue</th>
                  <th className="px-3 py-2 font-medium">% of Sales</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.label} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{service.label}</td>
                    <td className="px-3 py-2 text-slate-700">{service.transactions}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(service.revenue)}</td>
                    <td className="px-3 py-2 text-slate-700">{((service.revenue / data.grossSales) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Job Order Summary" subtitle="Workflow status snapshot for the selected period.">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.jobOrderSummary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Customer Summary" subtitle="Track mix and loyalty of served customers.">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.customerSummary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Expense Summary" subtitle="Monitor spending categories by total amount.">
          <div className="space-y-3">
            {data.expenseSummary.map((item) => (
              <MetricRow key={item.label} label={item.label} value={formatCurrency(item.value)} />
            ))}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700">
              Total Expenses: {formatCurrency(totalExpenseValue)}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Cash Drawer Summary" subtitle="Monitor daily cash flow and collections.">
          <div className="space-y-3">
            <MetricRow label="Beginning Float" value={formatCurrency(data.cashDrawer.beginningFloat)} />
            <MetricRow label="Cash Sales" value={formatCurrency(data.cashDrawer.cashSales)} />
            <MetricRow label="Cash Expenses" value={formatCurrency(data.cashDrawer.cashExpenses)} />
            <MetricRow label="Cash Collection" value={formatCurrency(data.cashDrawer.cashCollection)} />
            <MetricRow label="Remaining Cash" value={formatCurrency(data.cashDrawer.remainingCash)} />
            <MetricRow label="Last Collection Date" value={data.cashDrawer.lastCollectionDate} />
            <MetricRow label="Last Collection Amount" value={formatCurrency(data.cashDrawer.lastCollectionAmount)} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Charts" subtitle="Visualize payment mix and revenue trends.">
          <div className="space-y-6">
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Payment Method Pie Chart</h4>
              <PieChart data={data.paymentBreakdown} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Sales by Service" subtitle="Bar chart for service category contribution.">
          <BarChart data={data.services.map((service) => ({ label: service.label, value: service.revenue }))} />
        </SectionCard>

        <SectionCard title="Hourly Sales" subtitle="Line chart for hourly performance.">
          <LineChart values={data.hourlySales} />
        </SectionCard>

        <SectionCard title="Expense Breakdown" subtitle="Category allocation for overhead and operations.">
          <BarChart data={data.expenseSummary.map((item) => ({ label: item.label, value: item.value }))} />
        </SectionCard>
      </div>
    </div>
  )
}
