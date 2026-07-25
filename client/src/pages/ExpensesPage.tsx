import { useMemo, useState } from 'react'
import { FaPlus, FaSearch } from 'react-icons/fa'
import { ExpenseCharts } from '../components/ExpenseCharts'
import { ExpenseFormModal } from '../components/ExpenseFormModal'
import { ExpenseTable, type ExpenseRow } from '../components/ExpenseTable'
import { ConfirmModal } from '../components/ConfirmModal'
import { SummaryStat } from '../components/SummaryStat'
import { useCollection } from '../hooks/useCollection'
import { seedExpenses, type ExpenseRecord } from '../data/seeds'

const filterOptions = ['All', 'Detergent', 'Water Bill', 'Staff Salary', 'Maintenance', 'Supplies', 'Office']

export function ExpensesPage() {
  const { data: rows, add, update, remove } = useCollection<ExpenseRecord>('expenses', seedExpenses)
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedRow, setSelectedRow] = useState<ExpenseRow | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ExpenseRecord | null>(null)

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesFilter = selectedFilter === 'All' || row.category === selectedFilter
      const matchesSearch = !search || [row.id, row.description, row.category, row.paidTo].join(' ').toLowerCase().includes(search)
      return matchesFilter && matchesSearch
    })
  }, [query, rows, selectedFilter])

  const summary = useMemo(() => {
    const monthlyTotal = rows.reduce((total, row) => total + (Number.parseFloat(row.amount.replace(/[^\d.-]/g, '')) || 0), 0)
    const weeklyTotal = rows.slice(0, 3).reduce((total, row) => total + (Number.parseFloat(row.amount.replace(/[^\d.-]/g, '')) || 0), 0)
    const todayTotal = rows[0] ? Number.parseFloat(rows[0].amount.replace(/[^\d.-]/g, '')) || 0 : 0
    return {
      monthlyTotal,
      weeklyTotal,
      todayTotal,
      remainingBudget: 150000 - monthlyTotal,
    }
  }, [rows])

  const chartData = useMemo(() => {
    const parse = (value: string) => Number.parseFloat(value.replace(/[^\d.-]/g, '')) || 0
    const catMap = new Map<string, number>()
    rows.forEach((row) => catMap.set(row.category, (catMap.get(row.category) || 0) + parse(row.amount)))
    const categories = Array.from(catMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    const now = new Date()
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }
    })
    const monthly = months.map((month) =>
      rows.filter((row) => (row.date || '').startsWith(month.key)).reduce((sum, row) => sum + parse(row.amount), 0),
    )
    return { categories, monthly }
  }, [rows])

  const handleAdd = () => {
    setModalMode('add')
    setSelectedRow(null)
    setIsModalOpen(true)
  }

  const handleEdit = (row: ExpenseRow) => {
    setModalMode('edit')
    setSelectedRow(row)
    setIsModalOpen(true)
  }

  const handleDelete = (row: ExpenseRow) => {
    const record = rows.find((item) => item.id === row.id)
    if (record) setPendingDelete(record)
  }

  const handleSave = (row: ExpenseRow) => {
    if (modalMode === 'edit' && selectedRow) {
      const record = rows.find((item) => item.id === selectedRow.id)
      if (record) void update(record, row as ExpenseRecord)
      return
    }

    void add(row as ExpenseRecord)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Expenses</p>
            <h2 className="mt-2 text-3xl font-semibold">Operational cost control center</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Review business spend, compare categories, and keep daily operations financially visible.
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <FaPlus />
            Add Expense
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Today's Spend" value={`₱${summary.todayTotal.toLocaleString()}`} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="This Week" value={`₱${summary.weeklyTotal.toLocaleString()}`} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="This Month" value={`₱${summary.monthlyTotal.toLocaleString()}`} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Budget Left" value={`₱${summary.remainingBudget.toLocaleString()}`} accent="bg-violet-100 text-violet-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Expense Ledger</h3>
            <p className="text-sm text-slate-500">Search by reference, description, category, or supplier.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              <FaSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-64 border-none bg-transparent outline-none placeholder:text-slate-400"
                placeholder="Search expenses"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => (
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
        <div className="space-y-6">
          <ExpenseTable
            rows={filteredRows}
            onView={(row) => setSelectedRow(row)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              No expenses recorded yet. Add an expense to see spending trends and category breakdowns.
            </div>
          ) : (
            <ExpenseCharts monthly={chartData.monthly} categories={chartData.categories} />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-slate-900">Expense Detail</h3>
          <p className="mt-1 text-sm text-slate-500">Inspect the selected record.</p>
          {selectedRow ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reference</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedRow.id}</p>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between"><span>Category</span><span className="font-semibold text-slate-900">{selectedRow.category}</span></div>
                <div className="flex items-center justify-between"><span>Amount</span><span className="font-semibold text-slate-900">{selectedRow.amount}</span></div>
                <div className="flex items-center justify-between"><span>Paid To</span><span className="font-semibold text-slate-900">{selectedRow.paidTo}</span></div>
                <div className="flex items-center justify-between"><span>Recorded By</span><span className="font-semibold text-slate-900">{selectedRow.recordedBy}</span></div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Description</p>
                <p className="mt-2">{selectedRow.description}</p>
              </div>
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Choose an expense from the ledger to review its details.
            </div>
          )}
        </div>
      </div>

      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        mode={modalMode}
        row={selectedRow}
      />
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete expense"
        message={pendingDelete ? `Delete expense ${pendingDelete.id} (${pendingDelete.amount})? This cannot be undone.` : ''}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDelete) void remove(pendingDelete)
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
