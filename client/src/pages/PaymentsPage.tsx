import { useMemo, useState } from 'react'
import { FaSearch, FaSlidersH } from 'react-icons/fa'
import { PaymentHistoryPanel } from '../components/PaymentHistoryPanel'
import { PaymentTable, PAYMENT_FIELDS, type PaymentRow } from '../components/PaymentTable'
import { ReceivePaymentModal } from '../components/ReceivePaymentModal'
import { SummaryStat } from '../components/SummaryStat'
import { useCollection, type WithDocId } from '../hooks/useCollection'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'
import { useBusiness } from '../hooks/useBusiness'
import { printReceipt } from '../lib/printReceipt'
import { publishStatus } from '../lib/tracking'
import { buildOrderReceipt, trackQrDataUrl } from '../lib/receipts'
import { seedActivity, seedOrders, todayISO, nowStamp, type ActivityRecord, type OrderRecord } from '../data/seeds'

const filters = ['All', 'Paid', 'Unpaid', 'Today', 'This Week']

function peso(value: number) {
  return `₱${value.toLocaleString('en-PH')}`
}
function parsePeso(value: string) {
  return Number.parseFloat(value.replace(/[^\d.-]/g, '')) || 0
}

function toRow(order: OrderRecord & WithDocId): PaymentRow {
  const paid = order.paymentStatus === 'Paid'
  const partial = order.paymentStatus === 'Partial'
  return {
    orNumber: order.id,
    jobNumber: order.id,
    customer: order.customer,
    amountDue: order.amount,
    amountPaid: order.amountPaid ?? (paid ? order.amount : '₱0'),
    balance: order.balance ?? (paid ? '₱0' : order.amount),
    paymentMethod: paid ? 'Settled' : '—',
    paymentDate: order.date ?? order.timeReceived,
    cashier: '—',
    status: paid ? 'Paid' : partial ? 'Partial' : 'Unpaid',
  }
}

export function PaymentsPage() {
  const { data: orders, update } = useCollection<OrderRecord>('orders', seedOrders)
  const { add: addActivity } = useCollection<ActivityRecord>('activity', seedActivity)
  const { user } = useAuth()
  const { logoUrl } = useBranding()
  const { business } = useBusiness()
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [selectedRow, setSelectedRow] = useState<PaymentRow | null>(null)
  const [visibleFields, setVisibleFields] = useState<Array<keyof PaymentRow>>(['orNumber', 'customer', 'amountDue', 'amountPaid', 'balance', 'paymentDate', 'status'])
  const [showFieldMenu, setShowFieldMenu] = useState(false)

  const toggleField = (key: keyof PaymentRow) =>
    setVisibleFields((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))

  const weekAgo = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })()

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    const today = todayISO()
    return orders
      .filter((order) => {
        const date = order.date ?? ''
        const matchesFilter =
          selectedFilter === 'All' ||
          (selectedFilter === 'Paid' && order.paymentStatus === 'Paid') ||
          (selectedFilter === 'Unpaid' && order.paymentStatus !== 'Paid') ||
          (selectedFilter === 'Today' && date === today) ||
          (selectedFilter === 'This Week' && date >= weekAgo)
        const matchesSearch = !search || [order.id, order.customer].join(' ').toLowerCase().includes(search)
        return matchesFilter && matchesSearch
      })
      .map(toRow)
  }, [orders, query, selectedFilter, weekAgo])

  const totals = useMemo(() => {
    const collected = orders.filter((o) => o.paymentStatus === 'Paid').reduce((sum, o) => sum + parsePeso(o.amount), 0)
    const outstanding = orders.filter((o) => o.paymentStatus !== 'Paid').reduce((sum, o) => sum + parsePeso(o.amount), 0)
    const paidCount = orders.filter((o) => o.paymentStatus === 'Paid').length
    const unpaidCount = orders.filter((o) => o.paymentStatus !== 'Paid').length
    return { collected: peso(collected), outstanding: peso(outstanding), paidCount, unpaidCount }
  }, [orders])

  // Receiving payment settles the order (marks it fully paid).
  const handleSavePayment = (row: PaymentRow) => {
    const order = orders.find((entry) => entry.id === row.jobNumber)
    if (!order) return
    void update(order, { paymentStatus: 'Paid', amountPaid: order.amount, balance: '₱0' })
    void publishStatus(order.id, order.status, { paymentStatus: 'Paid', balance: '₱0' })
    void addActivity({
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      action: `${order.id}: payment received (${order.amount})`,
      user: user?.name ?? 'Unknown',
      at: nowStamp(),
    })
  }

  const handleReceipt = async (row: PaymentRow) => {
    const order = orders.find((entry) => entry.id === row.jobNumber)
    if (!order) return
    const qr = await trackQrDataUrl(order.id)
    printReceipt(buildOrderReceipt(order, business, logoUrl, qr, true))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Payments</p>
            <h2 className="mt-2 text-3xl font-semibold">Cashier and settlement dashboard</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Every job order's payment status, live. Filter paid vs unpaid and settle balances here.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Total Collected" value={totals.collected} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Outstanding Balance" value={totals.outstanding} accent="bg-rose-100 text-rose-700" />
        <SummaryStat label="Paid Orders" value={String(totals.paidCount)} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Unpaid Orders" value={String(totals.unpaidCount)} accent="bg-amber-100 text-amber-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Payment Transactions</h3>
            <p className="text-sm text-slate-500">Search by job number or customer name.</p>
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

            <div className="relative">
              <button onClick={() => setShowFieldMenu((value) => !value)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <FaSlidersH /> Fields
              </button>
              {showFieldMenu ? (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Show columns</p>
                  <div className="space-y-1">
                    {PAYMENT_FIELDS.map((field) => (
                      <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" checked={visibleFields.includes(field.key)} onChange={() => toggleField(field.key)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {filteredRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            No payment transactions match this filter.
          </div>
        ) : (
          <PaymentTable rows={filteredRows} onView={setSelectedRow} onReceive={setSelectedRow} onReceipt={handleReceipt} visibleFields={visibleFields} />
        )}
        <PaymentHistoryPanel rows={filteredRows.slice(0, 4).map((row) => ({ orNumber: row.orNumber, customer: row.customer, status: row.status }))} />
      </div>

      <ReceivePaymentModal isOpen={Boolean(selectedRow)} onClose={() => setSelectedRow(null)} row={selectedRow} onSave={handleSavePayment} />
    </div>
  )
}
