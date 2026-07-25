import { useMemo, useState } from 'react'
import { FaSearch, FaHistory, FaFileExcel, FaPrint } from 'react-icons/fa'
import { useCollection } from '../hooks/useCollection'
import { seedActivity, type ActivityRecord } from '../data/seeds'
import { downloadCsv, printReport } from '../lib/exports'

/** Millisecond timestamp for an activity row (createdAt), or 0 if unknown. */
function rowTime(row: ActivityRecord & { createdAt?: unknown }): number {
  return typeof row.createdAt === 'number' ? row.createdAt : 0
}

export function HistoryPage() {
  const { data: activity } = useCollection<ActivityRecord>('activity', seedActivity)
  const [query, setQuery] = useState('')
  const [fromDateTime, setFromDateTime] = useState('')
  const [toDateTime, setToDateTime] = useState('')

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase()
    const fromMs = fromDateTime ? new Date(fromDateTime).getTime() : null
    const toMs = toDateTime ? new Date(toDateTime).getTime() : null
    return activity.filter((entry) => {
      const t = rowTime(entry)
      const matchesRange = (fromMs === null || t === 0 || t >= fromMs) && (toMs === null || t === 0 || t <= toMs)
      const matchesSearch = !search || [entry.action, entry.user, entry.at].join(' ').toLowerCase().includes(search)
      return matchesRange && matchesSearch
    })
  }, [activity, query, fromDateTime, toDateTime])

  const setToday = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    setFromDateTime(`${day}T00:00`)
    setToDateTime(`${day}T23:59`)
  }

  const clearRange = () => {
    setFromDateTime('')
    setToDateTime('')
  }

  const exportCsv = () =>
    downloadCsv('activity-log', [['Activity', 'User', 'When'], ...rows.map((row) => [row.action, row.user, row.at])])

  const printLog = () => {
    const rangeNote = fromDateTime || toDateTime ? `${fromDateTime || '…'} → ${toDateTime || '…'}` : 'All time'
    const body = `<p class="muted">Range: ${rangeNote} · ${rows.length} events</p><table><thead><tr><th>Activity</th><th>User</th><th>When</th></tr></thead><tbody>${rows
      .map((row) => `<tr><td>${row.action}</td><td>${row.user}</td><td>${row.at}</td></tr>`)
      .join('')}</tbody></table>`
    printReport('Activity / Audit Log', body)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">History</p>
            <h2 className="mt-2 text-3xl font-semibold">Operational activity & audit trail</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Every job-order stage change, payment, and release — recorded live with the user who made it.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-blue-50">{rows.length} of {activity.length} events</div>
        </div>
      </section>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Audit Trail</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FaFileExcel /> Export CSV
            </button>
            <button onClick={printLog} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FaPrint /> Print
            </button>
          </div>
        </div>

        {/* Date & time range filter */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-600">From</span>
              <input type="datetime-local" value={fromDateTime} onChange={(event) => setFromDateTime(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-slate-600">To</span>
              <input type="datetime-local" value={toDateTime} onChange={(event) => setToDateTime(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none" />
            </label>
            <button onClick={setToday} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Today</button>
            <button onClick={clearRange} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">All time</button>
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            <FaSearch />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-56 border-none bg-transparent outline-none placeholder:text-slate-400" placeholder="Search activity, user, date" />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">No activity in this range.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._docId ?? row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">{row.action}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.user}</td>
                    <td className="px-4 py-3 text-slate-600">{row.at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
