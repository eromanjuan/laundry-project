import { FaEye, FaMoneyBillWave, FaPrint } from 'react-icons/fa'

export interface PaymentRow {
  orNumber: string
  jobNumber: string
  customer: string
  amountDue: string
  amountPaid: string
  balance: string
  paymentMethod: 'Cash' | 'GCash'
  paymentDate: string
  cashier: string
  status: 'Paid' | 'Partial' | 'Unpaid'
}

interface PaymentTableProps {
  rows: PaymentRow[]
  onView: (row: PaymentRow) => void
  onReceive: (row: PaymentRow) => void
}

export function PaymentTable({ rows, onView, onReceive }: PaymentTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">OR Number</th>
              <th className="px-4 py-3 font-medium">Job Number</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount Due</th>
              <th className="px-4 py-3 font-medium">Amount Paid</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Payment Method</th>
              <th className="px-4 py-3 font-medium">Payment Date</th>
              <th className="px-4 py-3 font-medium">Cashier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.orNumber} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.orNumber}</td>
                <td className="px-4 py-3 text-slate-700">{row.jobNumber}</td>
                <td className="px-4 py-3 text-slate-700">{row.customer}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.amountDue}</td>
                <td className="px-4 py-3 text-slate-700">{row.amountPaid}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.balance}</td>
                <td className="px-4 py-3 text-slate-700">{row.paymentMethod}</td>
                <td className="px-4 py-3 text-slate-700">{row.paymentDate}</td>
                <td className="px-4 py-3 text-slate-700">{row.cashier}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : row.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onView(row)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
                      <FaEye />
                    </button>
                    <button onClick={() => onReceive(row)} className="rounded-xl border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-50">
                      <FaMoneyBillWave />
                    </button>
                    <button className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
                      <FaPrint />
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
