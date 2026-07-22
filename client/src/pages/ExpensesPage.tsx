import { useMemo, useState } from 'react'
import { FaPlus, FaSearch } from 'react-icons/fa'
import { ExpenseCharts } from '../components/ExpenseCharts'
import { ExpenseFormModal } from '../components/ExpenseFormModal'
import { ExpenseTable, type ExpenseRow } from '../components/ExpenseTable'
import { SummaryStat } from '../components/SummaryStat'

const initialRows: ExpenseRow[] = [
  {
    id: 'EXP-1001',
    date: '2026-07-20',
    category: 'Detergent',
    description: 'Bulk detergent purchase',
    amount: '₱4,200',
    paymentMethod: 'Cash',
    paidTo: 'Clean Supply Co.',
    recordedBy: 'Admin',
    notes: 'Restocked for the week',
  },
  {
    id: 'EXP-1002',
    date: '2026-07-18',
    category: 'Water Bill',
    description: 'Water utility invoice',
    amount: '₱1,760',
    paymentMethod: 'Bank Transfer',
    paidTo: 'Metro Water',
    recordedBy: 'Finance',
    notes: 'Monthly statement',
  },
  {
    id: 'EXP-1003',
    date: '2026-07-16',
    category: 'Staff Salary',
    description: 'Payroll for attendants',
    amount: '₱18,500',
    paymentMethod: 'Bank Transfer',
    paidTo: 'Laundry Team',
    recordedBy: 'Admin',
    notes: 'Weekly payroll',
  },
  {
    id: 'EXP-1004',
    date: '2026-07-14',
    category: 'Maintenance',
    description: 'Washer repair kit',
    amount: '₱2,860',
    paymentMethod: 'GCash',
    paidTo: 'Prime Appliance',
    recordedBy: 'Operations',
    notes: 'Replaced belts',
  },
]

const filterOptions = ['All', 'Detergent', 'Water Bill', 'Staff Salary', 'Maintenance', 'Supplies', 'Office']

export function ExpensesPage() {
  const [rows, setRows] = useState(initialRows)
  const [query, setQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedRow, setSelectedRow] = useState<ExpenseRow | null>(null)

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
    if (window.confirm(`Delete ${row.id}?`)) {
      setRows(rows.filter((item) => item.id !== row.id))
    }
  }

  const handleSave = (row: ExpenseRow) => {
    if (modalMode === 'edit' && selectedRow) {
      setRows(rows.map((item) => (item.id === selectedRow.id ? row : item)))
      return
    }

    setRows([row, ...rows])
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
          <ExpenseCharts
            monthly={[4200, 3800, 5200, 6100, 4700, 5600]}
            categories={[
              { label: 'Detergent', value: 4200 },
              { label: 'Water Bill', value: 1760 },
              { label: 'Staff Salary', value: 18500 },
              { label: 'Maintenance', value: 2860 },
            ]}
          />
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
    </div>
  )
}
