import { useMemo, useState } from 'react'
import { FaFileExcel, FaPrint, FaReceipt } from 'react-icons/fa'
import { SummaryStat } from '../components/SummaryStat'
import { useCollection, type WithDocId } from '../hooks/useCollection'
import { useBusiness } from '../hooks/useBusiness'
import { useBranding } from '../hooks/useBranding'
import { usePaymentSettings } from '../hooks/usePaymentSettings'
import { useAuth } from '../context/AuthContext'
import { seedExpenses, seedOrders, todayISO, nowStamp, type ExpenseRecord, type OrderRecord } from '../data/seeds'
import { downloadCsv, printReport } from '../lib/exports'
import { printThermal } from '../lib/printReceipt'

/** Peso with 2 decimals, for the printed receipt (e.g. ₱7,698.00). */
function pesoR(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function num(value: string) {
  return Number.parseFloat((value || '').replace(/[^\d.-]/g, '')) || 0
}

function parseAmount(value: string) {
  return Number.parseFloat(value.replace(/[^\d.-]/g, '')) || 0
}
function peso(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
}
function orderDate(order: OrderRecord & WithDocId) {
  if (order.date) return order.date
  const created = (order as unknown as Record<string, unknown>).createdAt
  if (typeof created === 'number') {
    const offset = new Date(created).getTimezoneOffset()
    return new Date(created - offset * 60_000).toISOString().slice(0, 10)
  }
  return ''
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

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600">
      <span>{label}</span>
      <span className={`font-semibold ${accent ?? 'text-slate-900'}`}>{value}</span>
    </div>
  )
}

export function SalesSummaryPage() {
  const { data: orders } = useCollection<OrderRecord>('orders', seedOrders)
  const { data: expenses } = useCollection<ExpenseRecord>('expenses', seedExpenses)
  const { business } = useBusiness()
  const { logoUrl } = useBranding()
  const { payment } = usePaymentSettings()
  const { user } = useAuth()
  const [fromDate, setFromDate] = useState(todayISO())
  const [toDate, setToDate] = useState(todayISO())
  // Cash-count figures for the printed shift/sales-summary receipt.
  const [startingCash, setStartingCash] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [paidIn, setPaidIn] = useState('')
  const [paidOut, setPaidOut] = useState('')
  const [cashRefunds, setCashRefunds] = useState('')

  const data = useMemo(() => {
    const inRange = (date: string) => (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
    const os = orders.filter((order) => inRange(orderDate(order)))
    const es = expenses.filter((expense) => inRange(expense.date || ''))

    const gross = os.reduce((sum, o) => sum + parseAmount(o.amount), 0)
    const collected = os.filter((o) => o.paymentStatus === 'Paid').reduce((sum, o) => sum + parseAmount(o.amount), 0)
    const outstanding = os.filter((o) => o.paymentStatus !== 'Paid').reduce((sum, o) => sum + parseAmount(o.amount), 0)
    // Amount received by method, across all orders (partial payments included).
    const cash = os.reduce((sum, o) => sum + parseAmount(o.cashPaid ?? ''), 0)
    const gcash = os.reduce((sum, o) => sum + parseAmount(o.gcashPaid ?? ''), 0)
    const totalExpenses = es.reduce((sum, e) => sum + parseAmount(e.amount), 0)
    const customers = new Set(os.map((o) => o.customer)).size
    const loads = os.reduce((sum, o) => sum + (o.loads || 0), 0)

    const statusCounts: Record<string, number> = {}
    os.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })

    const expenseByCat: Record<string, number> = {}
    es.forEach((e) => { expenseByCat[e.category] = (expenseByCat[e.category] || 0) + parseAmount(e.amount) })

    return {
      gross, collected, outstanding, totalExpenses, cash, gcash,
      netProfit: collected - totalExpenses,
      orders: os.length, customers, loads,
      paid: os.filter((o) => o.paymentStatus === 'Paid').length,
      unpaid: os.filter((o) => o.paymentStatus !== 'Paid').length,
      statusCounts, expenseByCat,
    }
  }, [orders, expenses, fromDate, toDate])

  const rangeLabel = fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`

  const csvRows = (): Array<Array<string | number>> => [
    ['Metric', 'Value'],
    ['Period', rangeLabel],
    ['Gross Sales', data.gross],
    ['Collected', data.collected],
    ['Collected via Cash', data.cash],
    ['Collected via GCash', data.gcash],
    ['Outstanding', data.outstanding],
    ['Total Expenses', data.totalExpenses],
    ['Net Profit', data.netProfit],
    ['Job Orders', data.orders],
    ['Customers Served', data.customers],
    ['Total Loads', data.loads],
    ...Object.entries(data.statusCounts).map(([k, v]) => [`Orders ${k}`, v] as [string, number]),
    ...Object.entries(data.expenseByCat).map(([k, v]) => [`Expense: ${k}`, v] as [string, number]),
  ]

  const exportCsv = () => downloadCsv(`sales-summary-${fromDate}_${toDate}`, csvRows())
  const printSummary = () => {
    const body = `<table><tbody>${csvRows().map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`
    printReport(`Sales Summary — ${rangeLabel}`, body)
  }

  /** Thermal receipt: cash-drawer reconciliation + sales summary (Cash/GCash). */
  const printSalesReceipt = () => {
    const cashPayments = data.cash
    const startNum = num(startingCash)
    const inNum = num(paidIn)
    const outNum = num(paidOut)
    const cashRefundNum = num(cashRefunds)
    const actualNum = num(actualCash)
    const expectedCash = startNum + cashPayments + inNum - cashRefundNum - outNum
    const difference = actualNum - expectedCash
    const netSales = data.gross // no refunds/discounts tracked separately
    const gcashLabel = payment.gcashNumber ? `G CASH - ${payment.gcashNumber}` : 'G CASH'

    const row = (label: string, value: string, bold = false) =>
      `<tr><td${bold ? ' class="b"' : ''}>${label}</td><td class="r${bold ? ' b' : ''}">${value}</td></tr>`

    const html = `
      ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="" />` : ''}
      <div class="center title">${business.name || 'Laundry Project'}</div>
      ${business.branch ? `<div class="center muted">${business.branch}</div>` : ''}
      <div class="center muted">SALES SUMMARY</div>
      <div class="center muted">${rangeLabel}</div>
      <div class="center muted">Printed: ${nowStamp()}</div>
      <div class="hr"></div>
      <table>
        ${row('Starting cash', pesoR(startNum))}
        ${row('Cash payments', pesoR(cashPayments))}
        ${row('Cash refunds', pesoR(cashRefundNum))}
        ${row('Paid in', pesoR(inNum))}
        ${row('Paid out', pesoR(outNum))}
        ${row('Expected cash amount', pesoR(expectedCash), true)}
        ${row('Actual cash amount', pesoR(actualNum))}
        ${row('Difference', pesoR(difference), true)}
      </table>
      <div class="hr"></div>
      <div class="center title" style="font-size:13px">Sales summary</div>
      <div class="hr"></div>
      <table>
        ${row('Gross sales', pesoR(data.gross), true)}
        ${row('Refunds', pesoR(0))}
        ${row('Discounts', pesoR(0))}
        ${row('Net sales', pesoR(netSales), true)}
        ${row('Cash', pesoR(data.cash))}
        ${row(gcashLabel, pesoR(data.gcash))}
      </table>
      <div class="hr"></div>
      <div class="center muted">Cashier: ${user?.name ?? '—'}</div>
      <div class="center muted">Thank you!</div>
    `
    printThermal(html)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Sales Summary</p>
            <h2 className="mt-2 text-3xl font-semibold">Business performance report</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">Live sales, collections, and expenses for the selected date range.</p>
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
        <button onClick={printSalesReceipt} className="flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><FaReceipt /> Print Sales Receipt</button>
        <button onClick={printSummary} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"><FaPrint /> Print (A4)</button>
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"><FaFileExcel /> Export CSV</button>
      </div>

      {/* Cash count — feeds the printed shift receipt's drawer reconciliation. */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <h3 className="text-lg font-semibold text-slate-900">Cash Count (for the printed receipt)</h3>
        <p className="mt-1 text-sm text-slate-500">Enter the drawer figures. Cash payments (₱{data.cash.toLocaleString('en-PH')}) come from recorded orders.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Starting cash', value: startingCash, set: setStartingCash },
            { label: 'Actual cash counted', value: actualCash, set: setActualCash },
            { label: 'Paid in', value: paidIn, set: setPaidIn },
            { label: 'Paid out', value: paidOut, set: setPaidOut },
            { label: 'Cash refunds', value: cashRefunds, set: setCashRefunds },
          ].map((f) => (
            <label key={f.label} className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">{f.label}</span>
              <input type="number" inputMode="decimal" value={f.value} onChange={(e) => f.set(e.target.value)} placeholder="0" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Gross Sales" value={peso(data.gross)} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Collected" value={peso(data.collected)} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Cash Received" value={peso(data.cash)} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="GCash Received" value={peso(data.gcash)} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Outstanding" value={peso(data.outstanding)} accent="bg-rose-100 text-rose-700" />
        <SummaryStat label="Total Expenses" value={peso(data.totalExpenses)} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Net Profit" value={peso(data.netProfit)} accent="bg-violet-100 text-violet-700" />
        <SummaryStat label="Job Orders" value={String(data.orders)} accent="bg-slate-100 text-slate-700" />
        <SummaryStat label="Customers Served" value={String(data.customers)} accent="bg-cyan-100 text-cyan-700" />
        <SummaryStat label="Total Loads" value={String(data.loads)} accent="bg-indigo-100 text-indigo-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Payment Status" subtitle="Paid vs outstanding orders in this period.">
          <div className="space-y-3">
            <Row label="Paid Orders" value={String(data.paid)} accent="text-emerald-700" />
            <Row label="Unpaid Orders" value={String(data.unpaid)} accent="text-rose-700" />
            <Row label="Collected" value={peso(data.collected)} />
            <Row label="— via Cash" value={peso(data.cash)} accent="text-emerald-700" />
            <Row label="— via GCash" value={peso(data.gcash)} accent="text-blue-700" />
            <Row label="Outstanding Balance" value={peso(data.outstanding)} />
          </div>
        </SectionCard>

        <SectionCard title="Orders by Stage" subtitle="Where orders sit in the workflow.">
          {Object.keys(data.statusCounts).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No orders in this range.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.statusCounts).map(([status, count]) => (
                <Row key={status} label={status} value={`${count} order${count === 1 ? '' : 's'}`} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Expenses by Category" subtitle="Spending recorded in this period.">
        {Object.keys(data.expenseByCat).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No expenses recorded in this range.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(data.expenseByCat).map(([cat, value]) => (
              <Row key={cat} label={cat} value={peso(value)} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
