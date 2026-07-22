import { useMemo, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { PaymentHistoryPanel } from '../components/PaymentHistoryPanel'
import { PaymentTable, type PaymentRow } from '../components/PaymentTable'
import { ReceivePaymentModal } from '../components/ReceivePaymentModal'
import { SummaryStat } from '../components/SummaryStat'

const initialRows: PaymentRow[] = [
  {
    orNumber: 'OR-1001',
    jobNumber: '#1031',
    customer: 'Maria Santos',
    amountDue: '₱320',
    amountPaid: '₱320',
    balance: '₱0',
    paymentMethod: 'Cash',
    paymentDate: 'Today',
    cashier: 'Admin',
    status: 'Paid',
  },
  {
    orNumber: 'OR-1002',
    jobNumber: '#1032',
    customer: 'Jose Cruz',
    amountDue: '₱480',
    amountPaid: '₱240',
    balance: '₱240',
    paymentMethod: 'GCash',
    paymentDate: 'Today',
    cashier: 'Admin',
    status: 'Partial',
  },
  {
    orNumber: 'OR-1003',
    jobNumber: '#1034',
    customer: 'Liza Gomez',
    amountDue: '₱260',
    amountPaid: '₱0',
    balance: '₱260',
    paymentMethod: 'Cash',
    paymentDate: 'Yesterday',
    cashier: 'Admin',
    status: 'Unpaid',
  },
]

const filters = ['Paid', 'Partial', 'Unpaid', 'Today', 'This Week']

export function PaymentsPage() {
  const [rows] = useState(initialRows)
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('Today')
  const [selectedRow, setSelectedRow] = useState<PaymentRow | null>(null)

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesFilter =
        selectedFilter === 'Today' ||
        (selectedFilter === 'Paid' && row.status === 'Paid') ||
        (selectedFilter === 'Partial' && row.status === 'Partial') ||
        (selectedFilter === 'Unpaid' && row.status === 'Unpaid') ||
        (selectedFilter === 'This Week' && row.paymentDate.includes('Today') || row.paymentDate.includes('Yesterday'))

      const matchesSearch = !search || [row.orNumber, row.jobNumber, row.customer].join(' ').toLowerCase().includes(search)
      return matchesFilter && matchesSearch
    })
  }, [query, rows, selectedFilter])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Payments</p>
            <h2 className="mt-2 text-3xl font-semibold">Cashier and settlement dashboard</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Track collections, monitor balances, and manage payment activity in one place.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Today's Cash" value="₱8,420" accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Today's GCash" value="₱3,200" accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Today's Credit" value="₱1,180" accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Total Collections" value="₱12,800" accent="bg-violet-100 text-violet-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Payment Transactions</h3>
            <p className="text-sm text-slate-500">Search by OR number, job number, or customer name.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              <FaSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-64 border-none bg-transparent outline-none placeholder:text-slate-400"
                placeholder="Search payments"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selectedFilter === filter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <PaymentTable rows={filteredRows} onView={setSelectedRow} onReceive={setSelectedRow} />
        <PaymentHistoryPanel rows={rows.slice(0, 3).map((row) => ({ orNumber: row.orNumber, customer: row.customer, status: row.status }))} />
      </div>

      <ReceivePaymentModal isOpen={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} row={selectedRow} />
    </div>
  )
}
