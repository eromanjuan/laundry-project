import { useMemo, useState } from 'react'
import { FaArchive, FaCashRegister, FaCoins, FaFileExcel, FaFilePdf, FaPrint } from 'react-icons/fa'
import { SummaryStat } from '../components/SummaryStat'

type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Credit'

type ShiftStatus = 'OPEN' | 'CLOSED'

interface PaymentRow {
  id: string
  date: string
  customer: string
  amount: number
  method: PaymentMethod
  status: 'Full' | 'Partial' | 'Deposit'
  recognizedSales: number
  drawerImpact: number
  outstandingBalance: number
  remarks: string
}

interface CollectionRow {
  id: string
  datetime: string
  collectedBy: string
  amount: number
  remainingFloat: number
  remarks: string
}

interface ShiftState {
  staffName: string
  openingFloat: number
  openingTime: string
  status: ShiftStatus
  cashReceivedToday: number
  cashExpenses: number
  cashWithdrawals: number
  actualCashCounted: number
  recognizedSalesToday: number
  outstandingCollections: number
  drawerBalance: number
  lastCollectionDate: string
  lastCollectionTime: string
  lastCollectionAmount: number
}

const initialPayments: PaymentRow[] = [
  {
    id: 'TX-1001',
    date: '2026-07-22',
    customer: 'Maria Santos',
    amount: 300,
    method: 'Cash',
    status: 'Full',
    recognizedSales: 300,
    drawerImpact: 300,
    outstandingBalance: 0,
    remarks: 'Full cash payment',
  },
  {
    id: 'TX-1002',
    date: '2026-07-22',
    customer: 'Jose Cruz',
    amount: 180,
    method: 'GCash',
    status: 'Full',
    recognizedSales: 180,
    drawerImpact: 0,
    outstandingBalance: 0,
    remarks: 'GCash full settlement',
  },
  {
    id: 'TX-1003',
    date: '2026-07-22',
    customer: 'Liza Gomez',
    amount: 200,
    method: 'Cash',
    status: 'Partial',
    recognizedSales: 0,
    drawerImpact: 100,
    outstandingBalance: 100,
    remarks: 'Deposit received',
  },
  {
    id: 'TX-1004',
    date: '2026-07-22',
    customer: 'Rina Dela Cruz',
    amount: 250,
    method: 'Maya',
    status: 'Deposit',
    recognizedSales: 0,
    drawerImpact: 0,
    outstandingBalance: 250,
    remarks: 'Advance payment',
  },
]

const initialCollections: CollectionRow[] = [
  {
    id: 'COL-001',
    datetime: '2026-07-22 14:20',
    collectedBy: 'Admin',
    amount: 500,
    remainingFloat: 8500,
    remarks: 'Cash pickup from front counter',
  },
]

const initialShift: ShiftState = {
  staffName: 'Admin',
  openingFloat: 8000,
  openingTime: '08:00',
  status: 'OPEN',
  cashReceivedToday: 1000,
  cashExpenses: 320,
  cashWithdrawals: 150,
  actualCashCounted: 0,
  recognizedSalesToday: 480,
  outstandingCollections: 350,
  drawerBalance: 8530,
  lastCollectionDate: '2026-07-22',
  lastCollectionTime: '14:20',
  lastCollectionAmount: 500,
}

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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600">
    <span>{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
  )
}

export function CashDrawerPage() {
  const [payments] = useState(initialPayments)
  const [collections, setCollections] = useState(initialCollections)
  const [shift, setShift] = useState(initialShift)
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')

  const recognizedSales = useMemo(() => payments.reduce((sum, item) => sum + item.recognizedSales, 0), [payments])
  const outstandingReceivables = useMemo(() => payments.filter((item) => item.status !== 'Full' && item.status !== 'Deposit').reduce((sum, item) => sum + item.outstandingBalance, 0), [payments])
  const depositsReceived = useMemo(() => payments.filter((item) => item.status === 'Deposit').reduce((sum, item) => sum + item.amount, 0), [payments])
  const expectedCash = shift.openingFloat + shift.cashReceivedToday + shift.cashExpenses + shift.cashWithdrawals

  const handleCollectCash = () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return

    const nextCollection: CollectionRow = {
      id: `COL-${String(collections.length + 1).padStart(3, '0')}`,
      datetime: `${shift.lastCollectionDate} ${shift.lastCollectionTime}`,
      collectedBy: shift.staffName,
      amount: value,
      remainingFloat: shift.drawerBalance - value,
      remarks,
    }

    setCollections([nextCollection, ...collections])
    setShift((current) => ({
      ...current,
      drawerBalance: current.drawerBalance - value,
      lastCollectionDate: current.lastCollectionDate,
      lastCollectionTime: current.lastCollectionTime,
      lastCollectionAmount: value,
    }))
    setAmount('')
    setRemarks('')
  }

  const actualCash = shift.openingFloat + shift.cashReceivedToday + shift.cashExpenses + shift.cashWithdrawals - shift.drawerBalance

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Cash Drawer & Shift</p>
            <h2 className="mt-2 text-3xl font-semibold">Cashier operations and shift reconciliation</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Manage sales recognition, cash collections, shift opening, and closing balance with a cashier-ready dashboard.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Current Cashier" value={shift.staffName} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Current Shift" value={shift.status} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Opening Float" value={formatCurrency(shift.openingFloat)} accent="bg-violet-100 text-violet-700" />
        <SummaryStat label="Cash Received Today" value={formatCurrency(shift.cashReceivedToday)} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Expected Cash" value={formatCurrency(expectedCash)} accent="bg-cyan-100 text-cyan-700" />
        <SummaryStat label="Current Drawer Balance" value={formatCurrency(shift.drawerBalance)} accent="bg-slate-100 text-slate-700" />
        <SummaryStat label="Cash Expenses" value={formatCurrency(shift.cashExpenses)} accent="bg-rose-100 text-rose-700" />
        <SummaryStat label="Cash Withdrawals" value={formatCurrency(shift.cashWithdrawals)} accent="bg-indigo-100 text-indigo-700" />
        <SummaryStat label="Outstanding Collections" value={formatCurrency(shift.outstandingCollections)} accent="bg-orange-100 text-orange-700" />
        <SummaryStat label="Today's Recognized Sales" value={formatCurrency(recognizedSales)} accent="bg-emerald-100 text-emerald-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Shift Dashboard" subtitle="Open, reconcile, and close the cashier shift.">
          <div className="space-y-3">
            <MetricRow label="Current Cashier" value={shift.staffName} />
            <MetricRow label="Opening Time" value={shift.openingTime} />
            <MetricRow label="Status" value={shift.status} />
            <MetricRow label="Expected Cash" value={formatCurrency(expectedCash)} />
            <MetricRow label="Actual Cash Counted" value={formatCurrency(shift.actualCashCounted)} />
            <MetricRow label="Difference" value={formatCurrency(shift.actualCashCounted - expectedCash)} />
          </div>
        </SectionCard>

        <SectionCard title="Collect Cash" subtitle="Record a cash collection and lower the remaining float.">
          <div className="space-y-3">
            <label className="space-y-1 block">
              <span className="text-sm font-semibold text-slate-700">Amount</span>
              <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
            </label>
            <label className="space-y-1 block">
              <span className="text-sm font-semibold text-slate-700">Remarks</span>
              <input value={remarks} onChange={(event) => setRemarks(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
            </label>
            <button onClick={handleCollectCash} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
              <FaCoins /> Save Collection
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Sales Recognition Rules" subtitle="Only fully paid transactions are recognized as sales.">
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Transaction</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Recognized Sales</th>
                  <th className="px-3 py-2 font-medium">Drawer Impact</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{payment.id}</td>
                    <td className="px-3 py-2 text-slate-700">{formatCurrency(payment.amount)}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.method}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.status}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(payment.recognizedSales)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(payment.drawerImpact)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Collection History" subtitle="Recent cash collections and remaining float updates.">
          <div className="space-y-3">
            {collections.map((collection) => (
              <div key={collection.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{collection.datetime}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(collection.amount)}</span>
                </div>
                <p className="mt-1">Collected by {collection.collectedBy}</p>
                <p className="mt-1">Remaining float: {formatCurrency(collection.remainingFloat)}</p>
                <p className="mt-1 text-slate-500">{collection.remarks}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Shift Actions" subtitle="Preview reports, close the shift, and print the receipt.">
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"><FaPrint /> Preview Shift Report</button>
            <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"><FaArchive /> Close Shift</button>
            <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"><FaCashRegister /> Print Receipt</button>
            <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"><FaFileExcel /> Export Excel</button>
            <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"><FaFilePdf /> Export PDF</button>
          </div>
        </SectionCard>

        <SectionCard title="Cash Drawer Summary" subtitle="Recognized sales and receivables summary.">
          <div className="space-y-3">
            <MetricRow label="Outstanding Receivables" value={formatCurrency(outstandingReceivables)} />
            <MetricRow label="Deposits Received" value={formatCurrency(depositsReceived)} />
            <MetricRow label="Recognized Sales Today" value={formatCurrency(recognizedSales)} />
            <MetricRow label="Actual Cash Counted" value={formatCurrency(actualCash)} />
            <MetricRow label="Difference" value={formatCurrency(shift.actualCashCounted - expectedCash)} />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
