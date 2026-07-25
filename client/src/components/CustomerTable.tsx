import { FaPen, FaTrash } from 'react-icons/fa'
import { StatusBadge } from './StatusBadge'

interface CustomerRow {
  id: string
  name: string
  mobile: string
  address: string
  loyaltyPoints: number
  totalOrders: number
  outstandingBalance: string
  lastVisit: string
  status: 'Active' | 'VIP' | 'Inactive'
}

interface CustomerTableProps {
  rows: CustomerRow[]
  /** Only Administrators and Managers may edit/delete. */
  canManage?: boolean
  onEdit?: (row: CustomerRow) => void
  onDelete?: (row: CustomerRow) => void
}

export function CustomerTable({ rows, canManage = false, onEdit, onDelete }: CustomerTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Customer ID</th>
              <th className="px-5 py-3 font-medium">Customer Name</th>
              <th className="px-5 py-3 font-medium">Mobile Number</th>
              <th className="px-5 py-3 font-medium">Address</th>
              <th className="px-5 py-3 font-medium">Loyalty Points</th>
              <th className="px-5 py-3 font-medium">Total Orders</th>
              <th className="px-5 py-3 font-medium">Outstanding Balance</th>
              <th className="px-5 py-3 font-medium">Last Visit</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-5 py-3 font-semibold text-slate-900">{row.id}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {row.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <div className="mt-1">
                        <StatusBadge
                          label={row.status}
                          tone={row.status === 'VIP' ? 'blue' : row.status === 'Active' ? 'green' : 'amber'}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{row.mobile}</td>
                <td className="px-5 py-3 text-slate-600">{row.address}</td>
                <td className="px-5 py-3 font-semibold text-slate-900">{row.loyaltyPoints}</td>
                <td className="px-5 py-3 text-slate-600">{row.totalOrders}</td>
                <td className="px-5 py-3 font-semibold text-slate-900">{row.outstandingBalance}</td>
                <td className="px-5 py-3 text-slate-600">{row.lastVisit}</td>
                <td className="px-5 py-3">
                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit?.(row)}
                        title="Edit customer"
                        className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                      >
                        <FaPen />
                      </button>
                      <button
                        onClick={() => onDelete?.(row)}
                        title="Delete customer"
                        className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
