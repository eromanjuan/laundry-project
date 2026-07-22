import { StatusBadge } from './StatusBadge'

interface OrderRow {
  id: string
  customer: string
  service: string
  weight: string
  status: string
  amount: string
}

interface RecentOrdersTableProps {
  rows: OrderRow[]
}

export function RecentOrdersTable({ rows }: RecentOrdersTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent Job Orders</h3>
        <p className="text-sm text-slate-500">Latest laundry requests and service progress</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Job #</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">Weight</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                <td className="px-5 py-3 font-semibold text-slate-900">{row.id}</td>
                <td className="px-5 py-3 text-slate-600">{row.customer}</td>
                <td className="px-5 py-3 text-slate-600">{row.service}</td>
                <td className="px-5 py-3 text-slate-600">{row.weight}</td>
                <td className="px-5 py-3">
                  <StatusBadge
                    label={row.status}
                    tone={
                      row.status === 'Ready'
                        ? 'green'
                        : row.status === 'In Progress'
                          ? 'blue'
                          : row.status === 'Pending'
                            ? 'amber'
                            : 'slate'
                    }
                  />
                </td>
                <td className="px-5 py-3 font-semibold text-slate-900">{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
