import { useMemo, useState } from 'react'
import { FaSearch, FaThList, FaThLarge, FaTags, FaListUl, FaSlidersH } from 'react-icons/fa'
import { ClaimRecordModal } from '../components/ClaimRecordModal'
import { CollectPaymentModal, type PaymentResult } from '../components/CollectPaymentModal'
import { usePaymentSettings } from '../hooks/usePaymentSettings'
import { SummaryStat } from '../components/SummaryStat'
import { useCollection, type WithDocId } from '../hooks/useCollection'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'
import { useBusiness } from '../hooks/useBusiness'
import { printReceipt } from '../lib/printReceipt'
import { publishStatus } from '../lib/tracking'
import { buildOrderReceipt, trackQrDataUrl } from '../lib/receipts'
import { seedActivity, seedCustomers, seedOrders, nowStamp, type ActivityRecord, type CustomerRecord, type OrderRecord } from '../data/seeds'

const filters = ['All', 'Ready', 'Unpaid', 'Released', 'In Process']
const statusRank: Record<string, number> = { Ready: 0, Claimed: 1, Washing: 2, Pending: 3 }

type ViewMode = 'list' | 'cards' | 'tags' | 'detailed'

const viewOptions: Array<{ key: ViewMode; label: string; icon: typeof FaThList }> = [
  { key: 'list', label: 'List', icon: FaThList },
  { key: 'cards', label: 'Cards', icon: FaThLarge },
  { key: 'tags', label: 'Tags', icon: FaTags },
  { key: 'detailed', label: 'Detailed', icon: FaListUl },
]

interface Field {
  key: string
  label: string
}

const FIELDS: Field[] = [
  { key: 'id', label: 'Job Number' },
  { key: 'customer', label: 'Customer' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'service', label: 'Service' },
  { key: 'weight', label: 'Weight' },
  { key: 'loads', label: 'Loads' },
  { key: 'dateReceived', label: 'Date Received' },
  { key: 'releaseSchedule', label: 'Released' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'amountPaid', label: 'Paid' },
  { key: 'balance', label: 'Balance' },
  { key: 'paymentStatus', label: 'Payment' },
  { key: 'claimStatus', label: 'Claim Status' },
]

const DEFAULT_FIELDS = ['id', 'customer', 'mobile', 'service', 'totalAmount', 'balance', 'paymentStatus', 'claimStatus']

interface DisplayRow {
  id: string
  customer: string
  mobile: string
  service: string
  weight: string
  loads: string
  dateReceived: string
  releaseSchedule: string
  totalAmount: string
  amountPaid: string
  balance: string
  paymentStatus: string
  claimStatus: string
}

function toDisplayRow(order: OrderRecord & WithDocId, customers: Array<CustomerRecord & WithDocId>): DisplayRow {
  const paid = order.paymentStatus === 'Paid'
  const customer = customers.find((entry) => entry.name === order.customer)
  const claimStatus = order.status === 'Claimed' ? 'Released' : order.status === 'Ready' ? 'Ready for Claim' : order.status
  return {
    id: order.id,
    customer: order.customer,
    mobile: customer?.mobile ?? '—',
    service: order.service,
    weight: order.weight,
    loads: String(order.loads),
    dateReceived: order.date ?? order.timeReceived,
    releaseSchedule: order.releasedAt ?? order.estimatedRelease ?? '—',
    totalAmount: order.amount,
    amountPaid: paid ? order.amount : '₱0',
    balance: paid ? '₱0' : order.amount,
    paymentStatus: paid ? 'Paid' : 'Unpaid',
    claimStatus,
  }
}

function StatusBadges({ row }: { row: DisplayRow }) {
  const claimTone: Record<string, string> = {
    'Ready for Claim': 'bg-blue-100 text-blue-700',
    Released: 'bg-slate-200 text-slate-700',
    Washing: 'bg-amber-100 text-amber-700',
    Pending: 'bg-rose-100 text-rose-700',
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.paymentStatus}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${claimTone[row.claimStatus] ?? 'bg-slate-100 text-slate-700'}`}>{row.claimStatus}</span>
    </div>
  )
}

export function ClaimLaundryPage() {
  const { data: orders, update } = useCollection<OrderRecord>('orders', seedOrders)
  const { data: customers } = useCollection<CustomerRecord>('customers', seedCustomers)
  const { add: addActivity } = useCollection<ActivityRecord>('activity', seedActivity)
  const { user } = useAuth()
  const { logoUrl } = useBranding()
  const { business } = useBusiness()

  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [visibleFields, setVisibleFields] = useState<string[]>(DEFAULT_FIELDS)
  const [showFieldMenu, setShowFieldMenu] = useState(false)
  const [selected, setSelected] = useState<(OrderRecord & WithDocId) | null>(null)
  const [payJob, setPayJob] = useState<(OrderRecord & WithDocId) | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const { payment } = usePaymentSettings()

  const shownFields = FIELDS.filter((field) => visibleFields.includes(field.key))
  const orderById = (id: string) => orders.find((entry) => entry.id === id)

  const logActivity = (action: string) => {
    void addActivity({ id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, action, user: user?.name ?? 'Unknown', at: nowStamp() })
  }

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase()
    return orders
      .filter((order) => {
        const matchesFilter =
          activeFilter === 'All' ||
          (activeFilter === 'Ready' && order.status === 'Ready') ||
          (activeFilter === 'Unpaid' && order.paymentStatus !== 'Paid') ||
          (activeFilter === 'Released' && order.status === 'Claimed') ||
          (activeFilter === 'In Process' && (order.status === 'Pending' || order.status === 'Washing'))
        const matchesSearch = !search || [order.id, order.customer].join(' ').toLowerCase().includes(search)
        return matchesFilter && matchesSearch
      })
      .slice()
      .sort((a, b) => (statusRank[a.status] ?? 4) - (statusRank[b.status] ?? 4))
      .map((order) => toDisplayRow(order, customers))
  }, [orders, customers, query, activeFilter])

  const summary = useMemo(
    () => ({
      ready: orders.filter((order) => order.status === 'Ready').length,
      released: orders.filter((order) => order.status === 'Claimed').length,
      unpaid: orders.filter((order) => order.paymentStatus !== 'Paid').length,
      total: orders.length,
    }),
    [orders],
  )

  const openRow = (id: string) => {
    const order = orderById(id)
    if (order) setSelected(order)
  }

  const parsePeso = (value?: string) => Number.parseFloat((value ?? '').replace(/[^\d.]/g, '')) || 0
  const peso = (n: number) => `₱${(Math.round(n * 100) / 100).toLocaleString('en-PH')}`

  // Open the Cash / GCash / Split collection modal.
  const handleSettle = (order: OrderRecord & WithDocId) => setPayJob(order)

  const confirmCollect = (result: PaymentResult) => {
    const order = payJob
    if (!order) return
    const totalNum = parsePeso(order.amount)
    const applied = result.cash + result.gcash
    const newPaidNum = Math.min(totalNum, parsePeso(order.amountPaid) + applied)
    const newBalanceNum = Math.max(0, totalNum - newPaidNum)
    const newCash = parsePeso(order.cashPaid) + result.cash
    const newGcash = parsePeso(order.gcashPaid) + result.gcash
    const payStatus = newBalanceNum <= 0 ? 'Paid' : 'Partial'
    const methods: string[] = []
    if (newCash > 0) methods.push('Cash')
    if (newGcash > 0) methods.push('GCash')
    const patch: Partial<OrderRecord> = {
      paymentStatus: payStatus,
      amountPaid: peso(newPaidNum),
      balance: peso(newBalanceNum),
      cashPaid: peso(newCash),
      gcashPaid: peso(newGcash),
      paymentMethod: methods.join('+') || result.method,
    }
    void update(order, patch)
    void publishStatus(order.id, order.status, { paymentStatus: payStatus, balance: peso(newBalanceNum) })
    logActivity(`${order.id}: ${peso(applied)} settled via ${result.method} — balance ${peso(newBalanceNum)}`)
    setSelected((current) => (current && current.id === order.id ? { ...current, ...patch } : current))
    setPayJob(null)
    setFeedback({
      tone: 'success',
      text: newBalanceNum <= 0
        ? `${order.id} fully paid via ${methods.join('+') || result.method}.`
        : `${peso(applied)} collected for ${order.id}. Remaining balance ${peso(newBalanceNum)}.`,
    })
  }

  const handleRelease = (order: OrderRecord & WithDocId) => {
    if (order.status !== 'Ready' || order.paymentStatus !== 'Paid') return
    void update(order, { status: 'Claimed', releasedAt: nowStamp() })
    void publishStatus(order.id, 'Claimed')
    logActivity(`${order.id}: released to customer`)
    setSelected(null)
    setFeedback({ tone: 'success', text: `${order.id} released to customer.` })
  }

  const handlePrint = async (order: OrderRecord & WithDocId) => {
    const qr = await trackQrDataUrl(order.id)
    printReceipt(buildOrderReceipt(order, business, logoUrl, qr, true))
  }

  const toggleField = (key: string) =>
    setVisibleFields((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Claim Laundry</p>
            <h2 className="mt-2 text-3xl font-semibold">Release and settle completed orders</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Click any record to view details, settle payment, and release. Ready-to-claim orders are on top.
            </p>
          </div>
        </div>
      </section>

      {feedback ? (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="rounded-lg px-2 py-1 text-xs transition hover:bg-white/60">Dismiss</button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Ready for Claim" value={`${summary.ready} orders`} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Released" value={`${summary.released} orders`} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Unpaid" value={`${summary.unpaid} orders`} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Total Orders" value={`${summary.total} orders`} accent="bg-violet-100 text-violet-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            <FaSearch />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-56 border-none bg-transparent outline-none placeholder:text-slate-400" placeholder="Search job number or customer" />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${activeFilter === filter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {viewOptions.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setViewMode(key)} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${viewMode === key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon /> {label}
              </button>
            ))}
          </div>

          {/* Field customization */}
          <div className="relative">
            <button onClick={() => setShowFieldMenu((value) => !value)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FaSlidersH /> Customize Fields
            </button>
            {showFieldMenu ? (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Show fields</p>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {FIELDS.map((field) => (
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

      {/* Records */}
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No orders match your filters.</div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {shownFields.map((field) => (
                    <th key={field.key} className="px-4 py-3 font-medium">{field.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => openRow(row.id)} className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/50">
                    {shownFields.map((field) => (
                      <td key={field.key} className="px-4 py-3 text-slate-700">
                        {field.key === 'paymentStatus' || field.key === 'claimStatus' ? <StatusBadges row={row} /> : (row as unknown as Record<string, string>)[field.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <button key={row.id} onClick={() => openRow(row.id)} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900">{row.id}</p>
                <StatusBadges row={row} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{row.customer}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {shownFields.filter((f) => !['id', 'customer', 'paymentStatus', 'claimStatus'].includes(f.key)).map((field) => (
                  <div key={field.key}>
                    <p className="text-xs text-slate-400">{field.label}</p>
                    <p className="font-semibold text-slate-800">{(row as unknown as Record<string, string>)[field.key]}</p>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : viewMode === 'tags' ? (
        <div className="flex flex-wrap gap-2">
          {rows.map((row) => (
            <button key={row.id} onClick={() => openRow(row.id)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50">
              <span className="font-semibold text-slate-900">{row.id}</span>
              <span className="text-slate-500">{row.customer}</span>
              <StatusBadges row={row} />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <button key={row.id} onClick={() => openRow(row.id)} className="block w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{row.id}</p>
                  <p className="text-sm text-slate-600">{row.customer}</p>
                </div>
                <StatusBadges row={row} />
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {shownFields.filter((f) => !['id', 'customer', 'paymentStatus', 'claimStatus'].includes(f.key)).map((field) => (
                  <div key={field.key} className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-400">{field.label}</p>
                    <p className="font-semibold text-slate-800">{(row as unknown as Record<string, string>)[field.key]}</p>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <ClaimRecordModal
        order={selected}
        mobile={selected ? customers.find((c) => c.name === selected.customer)?.mobile : undefined}
        onClose={() => setSelected(null)}
        onSettle={handleSettle}
        onRelease={handleRelease}
        onPrint={handlePrint}
      />

      <CollectPaymentModal
        isOpen={Boolean(payJob)}
        due={payJob ? parsePeso(payJob.balance ?? payJob.amount) : 0}
        label={payJob ? `${payJob.id} • ${payJob.customer}` : ''}
        gcash={payment}
        onClose={() => setPayJob(null)}
        onConfirm={confirmCollect}
      />
    </div>
  )
}
