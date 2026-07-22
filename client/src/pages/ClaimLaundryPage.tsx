import { useMemo, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { ClaimDetailsModal } from '../components/ClaimDetailsModal'
import { ClaimTable, type ClaimRow } from '../components/ClaimTable'
import { PaymentModal } from '../components/PaymentModal'
import { ReceiptPreview } from '../components/ReceiptPreview'
import { SummaryStat } from '../components/SummaryStat'

const initialRows = [
  {
    id: '#1041',
    customer: 'Maria Santos',
    mobile: '0917 223 4410',
    service: 'Wash & Fold',
    weight: '6.5 kg',
    loads: 2,
    dateReceived: 'Jul 20',
    releaseSchedule: 'Today 14:00',
    totalAmount: '₱320',
    amountPaid: '₱320',
    balance: '₱0',
    paymentStatus: 'Paid' as const,
    claimStatus: 'Ready for Claim' as const,
  },
  {
    id: '#1042',
    customer: 'Jose Cruz',
    mobile: '0928 551 9032',
    service: 'Comforter',
    weight: '8.0 kg',
    loads: 3,
    dateReceived: 'Jul 20',
    releaseSchedule: 'Today 15:30',
    totalAmount: '₱480',
    amountPaid: '₱240',
    balance: '₱240',
    paymentStatus: 'Unpaid' as const,
    claimStatus: 'Ready for Claim' as const,
  },
  {
    id: '#1043',
    customer: 'Rina Dela Cruz',
    mobile: '0998 110 3345',
    service: 'Dry Only',
    weight: '3.2 kg',
    loads: 1,
    dateReceived: 'Jul 19',
    releaseSchedule: 'Today 11:20',
    totalAmount: '₱180',
    amountPaid: '₱180',
    balance: '₱0',
    paymentStatus: 'Paid' as const,
    claimStatus: 'Released' as const,
  },
]

const filters = ['All', 'Paid', 'Unpaid', 'Express', 'Ready Today', 'Commercial']

export function ClaimLaundryPage() {
  const [rows, setRows] = useState(initialRows)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedRow, setSelectedRow] = useState<ClaimRow | null>(null)
  const [paymentRow, setPaymentRow] = useState<ClaimRow | null>(null)
  const [releasedToday, setReleasedToday] = useState(3)

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesFilter =
        activeFilter === 'All' ||
        (activeFilter === 'Paid' && row.paymentStatus === 'Paid') ||
        (activeFilter === 'Unpaid' && row.paymentStatus === 'Unpaid') ||
        (activeFilter === 'Express' && row.service.includes('Wash')) ||
        (activeFilter === 'Ready Today' && row.releaseSchedule.includes('Today')) ||
        (activeFilter === 'Commercial' && row.service.includes('Comforter'))

      const matchesSearch = !search || [row.id, row.customer, row.mobile].join(' ').toLowerCase().includes(search)
      return matchesFilter && matchesSearch
    })
  }, [activeFilter, query, rows])

  const handleRelease = (row: ClaimRow) => {
    const confirmed = window.confirm(`Release ${row.id} for ${row.customer}?`)
    if (!confirmed) return

    setRows((current) => current.filter((item) => item.id !== row.id))
    setReleasedToday((current) => current + 1)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Claim Laundry</p>
            <h2 className="mt-2 text-3xl font-semibold">Release and verify completed orders</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Review ready pickups, verify balances, and release orders in a secure, professional workflow.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Ready for Claim" value="12 orders" accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Released Today" value={`${releasedToday} orders`} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Unpaid Orders" value="3 orders" accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Claimed This Week" value="28 orders" accent="bg-violet-100 text-violet-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Order Queue</h3>
            <p className="text-sm text-slate-500">Search by job number, customer, mobile, or QR code.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              <FaSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-64 border-none bg-transparent outline-none placeholder:text-slate-400"
                placeholder="Search orders"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    activeFilter === filter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ClaimTable
        rows={filteredRows}
        onView={setSelectedRow}
        onPay={setPaymentRow}
        onReceipt={() => undefined}
        onRelease={handleRelease}
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-slate-900">Receipt Preview</h3>
          <p className="mt-1 text-sm text-slate-500">Printable receipt layout for claim handoff.</p>
          <div className="mt-5">
            <ReceiptPreview row={filteredRows[0] ?? null} />
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-slate-900">Fast Actions</h3>
          <p className="mt-1 text-sm text-slate-500">Quick assistance for customer release workflows.</p>
          <div className="mt-5 space-y-2 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">Auto-confirm claim handoff.</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">Notify customer once released.</div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">Print claim stub for pickup.</div>
          </div>
        </div>
      </div>

      <ClaimDetailsModal isOpen={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} row={selectedRow} />
      <PaymentModal isOpen={Boolean(paymentRow)} onClose={() => setPaymentRow(null)} row={paymentRow} />
    </div>
  )
}
