import { FaEye, FaMoneyBillWave, FaPrint, FaTruck } from 'react-icons/fa'

export interface ClaimRow {
  id: string
  customer: string
  mobile: string
  service: string
  weight: string
  loads: number
  dateReceived: string
  releaseSchedule: string
  totalAmount: string
  amountPaid: string
  balance: string
  paymentStatus: 'Paid' | 'Unpaid'
  claimStatus: 'Ready for Claim' | 'Released'
}

interface ClaimTableProps {
  rows: ClaimRow[]
  onView: (row: ClaimRow) => void
  onPay: (row: ClaimRow) => void
  onReceipt: (row: ClaimRow) => void
  onRelease: (row: ClaimRow) => void
}

export function ClaimTable({ rows, onView, onPay, onReceipt, onRelease }: ClaimTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Job Number</th>
              <th className="px-4 py-3 font-medium">Customer Name</th>
              <th className="px-4 py-3 font-medium">Mobile Number</th>
              <th className="px-4 py-3 font-medium">Service Type</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              <th className="px-4 py-3 font-medium">Loads</th>
              <th className="px-4 py-3 font-medium">Date Received</th>
              <th className="px-4 py-3 font-medium">Release Schedule</th>
              <th className="px-4 py-3 font-medium">Total Amount</th>
              <th className="px-4 py-3 font-medium">Amount Paid</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Payment Status</th>
              <th className="px-4 py-3 font-medium">Claim Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.id}</td>
                <td className="px-4 py-3 text-slate-700">{row.customer}</td>
                <td className="px-4 py-3 text-slate-700">{row.mobile}</td>
                <td className="px-4 py-3 text-slate-700">{row.service}</td>
                <td className="px-4 py-3 text-slate-700">{row.weight}</td>
                <td className="px-4 py-3 text-slate-700">{row.loads}</td>
                <td className="px-4 py-3 text-slate-700">{row.dateReceived}</td>
                <td className="px-4 py-3 text-slate-700">{row.releaseSchedule}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.totalAmount}</td>
                <td className="px-4 py-3 text-slate-700">{row.amountPaid}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.balance}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {row.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.claimStatus === 'Released' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>
                    {row.claimStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onView(row)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
                      <FaEye />
                    </button>
                    <button onClick={() => onPay(row)} className="rounded-xl border border-slate-200 p-2 text-blue-600 transition hover:bg-blue-50">
                      <FaMoneyBillWave />
                    </button>
                    <button onClick={() => onReceipt(row)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
                      <FaPrint />
                    </button>
                    <button onClick={() => onRelease(row)} className="rounded-xl border border-emerald-200 p-2 text-emerald-700 transition hover:bg-emerald-50">
                      <FaTruck />
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
