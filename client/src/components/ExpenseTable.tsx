import { FaEye, FaPencilAlt, FaTrash } from 'react-icons/fa'

export interface ExpenseRow {
  id: string
  date: string
  category: string
  description: string
  amount: string
  paymentMethod: string
  paidTo: string
  recordedBy: string
  notes: string
}

interface ExpenseTableProps {
  rows: ExpenseRow[]
  onView: (row: ExpenseRow) => void
  onEdit: (row: ExpenseRow) => void
  onDelete: (row: ExpenseRow) => void
}

export function ExpenseTable({ rows, onView, onEdit, onDelete }: ExpenseTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Expense ID</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Payment Method</th>
              <th className="px-4 py-3 font-medium">Paid To</th>
              <th className="px-4 py-3 font-medium">Recorded By</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.id}</td>
                <td className="px-4 py-3 text-slate-700">{row.date}</td>
                <td className="px-4 py-3 text-slate-700">{row.category}</td>
                <td className="px-4 py-3 text-slate-700">{row.description}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.amount}</td>
                <td className="px-4 py-3 text-slate-700">{row.paymentMethod}</td>
                <td className="px-4 py-3 text-slate-700">{row.paidTo}</td>
                <td className="px-4 py-3 text-slate-700">{row.recordedBy}</td>
                <td className="px-4 py-3 text-slate-700">{row.notes}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onView(row)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
                      <FaEye />
                    </button>
                    <button onClick={() => onEdit(row)} className="rounded-xl border border-slate-200 p-2 text-blue-600 transition hover:bg-blue-50">
                      <FaPencilAlt />
                    </button>
                    <button onClick={() => onDelete(row)} className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
