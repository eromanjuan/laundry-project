import { useMemo, useState } from 'react'
import { FaCoins, FaFileExcel, FaPrint } from 'react-icons/fa'
import { SummaryStat } from '../components/SummaryStat'
import { useCollection, type WithDocId } from '../hooks/useCollection'
import { useAuth } from '../context/AuthContext'
import { seedCollections, seedExpenses, seedOrders, todayISO, nowStamp, type CollectionRecord, type ExpenseRecord, type OrderRecord } from '../data/seeds'
import { downloadCsv, printReport } from '../lib/exports'

function parseAmount(value: string) {
  return Number.parseFloat(value.replace(/[^\d.-]/g, '')) || 0
}
function peso(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}
function inRange(date: string, from: string, to: string) {
  return (!from || date >= from) && (!to || date <= to)
}
function orderDate(order: OrderRecord & WithDocId) {
  if (order.date) return order.date
  const created = (order as unknown as Record<string, unknown>).createdAt
  return typeof created === 'number' ? new Date(created).toISOString().slice(0, 10) : ''
}
function recordDate(record: { createdAt?: unknown; datetime?: string }) {
  if (typeof record.createdAt === 'number') return new Date(record.createdAt).toISOString().slice(0, 10)
  return (record.datetime || '').slice(0, 10)
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

export function CashDrawerPage() {
  const { data: orders } = useCollection<OrderRecord>('orders', seedOrders)
  const { data: collections, add: addCollection } = useCollection<CollectionRecord>('collections', seedCollections)
  const { data: expenses } = useCollection<ExpenseRecord>('expenses', seedExpenses)
  const { user } = useAuth()

  const [fromDate, setFromDate] = useState(todayISO())
  const [toDate, setToDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')

  const stats = useMemo(() => {
    const os = orders.filter((o) => inRange(orderDate(o), fromDate, toDate))
    const cs = collections.filter((c) => inRange(recordDate(c), fromDate, toDate))
    const es = expenses.filter((e) => inRange(e.date || '', fromDate, toDate))
    const recognized = os.filter((o) => o.paymentStatus === 'Paid').reduce((s, o) => s + parseAmount(o.amount), 0)
    const outstanding = os.filter((o) => o.paymentStatus !== 'Paid').reduce((s, o) => s + parseAmount(o.amount), 0)
    const collected = cs.reduce((s, c) => s + (c.amount || 0), 0)
    const expensesTotal = es.reduce((s, e) => s + parseAmount(e.amount), 0)
    return { os, cs, recognized, outstanding, collected, expensesTotal, net: recognized - expensesTotal }
  }, [orders, collections, expenses, fromDate, toDate])

  const rangeLabel = fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`

  const handleCollectCash = () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    void addCollection({
      id: `COL-${Date.now()}`,
      datetime: nowStamp(),
      collectedBy: user?.name ?? 'Unknown',
      amount: value,
      remainingFloat: 0,
      remarks,
    })
    setAmount('')
    setRemarks('')
  }

  const exportCsv = () =>
    downloadCsv(`cash-drawer-${fromDate}_${toDate}`, [
      ['Metric', 'Value'],
      ['Period', rangeLabel],
      ['Recognized Sales (paid)', stats.recognized],
      ['Outstanding', stats.outstanding],
      ['Cash Collected', stats.collected],
      ['Cash Expenses', stats.expensesTotal],
      ['Net', stats.net],
      [''],
      ['Collection', 'By', 'Amount', 'Remarks'],
      ...stats.cs.map((c) => [c.datetime, c.collectedBy, c.amount, c.remarks]),
    ])

  const printSummary = () => {
    const body = `<table><tbody>
      <tr><td>Recognized Sales (paid)</td><td>${peso(stats.recognized)}</td></tr>
      <tr><td>Outstanding</td><td>${peso(stats.outstanding)}</td></tr>
      <tr><td>Cash Collected</td><td>${peso(stats.collected)}</td></tr>
      <tr><td>Cash Expenses</td><td>${peso(stats.expensesTotal)}</td></tr>
      <tr><td><b>Net</b></td><td><b>${peso(stats.net)}</b></td></tr>
    </tbody></table>`
    printReport(`Cash Drawer — ${rangeLabel}`, body)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Cash Drawer</p>
            <h2 className="mt-2 text-3xl font-semibold">Cash & settlement reconciliation</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">Recognized sales, collections, and cash expenses for the selected date range.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm text-white backdrop-blur">
              <span className="font-semibold">From</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg bg-white/90 px-2 py-1 text-slate-800 outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm text-white backdrop-blur">
              <span className="font-semibold">To</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg bg-white/90 px-2 py-1 text-slate-800 outline-none" />
            </label>
            <button onClick={() => { setFromDate(todayISO()); setToDate(todayISO()) }} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">Today</button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={printSummary} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"><FaPrint /> Print</button>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"><FaFileExcel /> Export CSV</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryStat label="Recognized Sales" value={peso(stats.recognized)} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Outstanding" value={peso(stats.outstanding)} accent="bg-rose-100 text-rose-700" />
        <SummaryStat label="Cash Collected" value={peso(stats.collected)} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Cash Expenses" value={peso(stats.expensesTotal)} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Net" value={peso(stats.net)} accent="bg-violet-100 text-violet-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Collect Cash" subtitle="Record a cash collection (e.g. drawer pickup).">
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Amount</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-slate-700">Remarks</span>
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
            </label>
            <button onClick={handleCollectCash} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              <FaCoins /> Save Collection
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Collection History" subtitle="Cash collections in this date range.">
          {stats.cs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No cash collections in this range.</p>
          ) : (
            <div className="space-y-2">
              {stats.cs.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{peso(c.amount)}</p>
                    <p className="text-xs text-slate-500">{c.datetime} · {c.collectedBy}{c.remarks ? ` · ${c.remarks}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recognized Sales" subtitle="Fully paid orders counted as sales in this period.">
        {stats.os.filter((o) => o.paymentStatus === 'Paid').length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No recognized sales in this range.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.os.filter((o) => o.paymentStatus === 'Paid').map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-900">{o.id}</td>
                    <td className="px-3 py-2 text-slate-700">{o.customer}</td>
                    <td className="px-3 py-2 text-slate-700">{orderDate(o)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{o.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
