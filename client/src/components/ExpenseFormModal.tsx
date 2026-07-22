import { useEffect, useState, type FormEvent } from 'react'
import type { ExpenseRow } from './ExpenseTable'

interface ExpenseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (row: ExpenseRow) => void
  mode: 'add' | 'edit'
  row: ExpenseRow | null
}

const categories = [
  'Detergent',
  'Fabric Conditioner',
  'LPG',
  'Water Bill',
  'Electric Bill',
  'Staff Salary',
  'Transportation',
  'Maintenance',
  'Supplies',
  'Office',
  'Marketing',
  'Other',
]

const paymentMethods = ['Cash', 'Bank Transfer', 'GCash', 'Credit']

const initialForm = {
  id: '',
  date: '',
  category: 'Detergent',
  description: '',
  amount: '',
  paymentMethod: 'Cash',
  paidTo: '',
  recordedBy: 'Admin',
  notes: '',
}

export function ExpenseFormModal({ isOpen, onClose, onSave, mode, row }: ExpenseFormModalProps) {
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (row) {
      setForm({ ...row })
    } else {
      setForm({ ...initialForm, id: `EXP-${Math.floor(1000 + Math.random() * 9000)}` })
    }
  }, [row, isOpen])

  if (!isOpen) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({ ...form })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{mode === 'add' ? 'Add Expense' : 'Edit Expense'}</h3>
            <p className="mt-1 text-sm text-slate-500">Record business spending with accounting-style detail.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100">Close</button>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Expense ID</span>
            <input value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Date</span>
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Category</span>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400">
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Amount</span>
            <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Payment Method</span>
            <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400">
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Paid To</span>
            <input value={form.paidTo} onChange={(event) => setForm({ ...form, paidTo: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Notes</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" rows={3} />
          </label>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button type="submit" className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Save Expense</button>
          </div>
        </form>
      </div>
    </div>
  )
}
