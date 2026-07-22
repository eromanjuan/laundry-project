import { FaHistory, FaLock, FaMoneyBillWave, FaReceipt, FaSearch, FaTools, FaTruck, FaUserCircle } from 'react-icons/fa'

const historySections = [
  { title: 'Sales History', description: 'Completed sales and order invoices', icon: FaReceipt },
  { title: 'Payment History', description: 'Payments received and balances cleared', icon: FaMoneyBillWave },
  { title: 'Expense History', description: 'Operational expenditures and suppliers', icon: FaReceipt },
  { title: 'Job Order History', description: 'Completed and closed job orders', icon: FaTruck },
  { title: 'Customer History', description: 'Customer service and visit records', icon: FaUserCircle },
  { title: 'Shift History', description: 'Cashier shifts and drawer transfers', icon: FaHistory },
  { title: 'Cash Drawer History', description: 'Drawer opening, closing, and reconciliations', icon: FaMoneyBillWave },
  { title: 'Machine Cycle History', description: 'Machine usage, runtime, and maintenance logs', icon: FaTools },
  { title: 'Inventory History', description: 'Stock movement, replenishment, and adjustments', icon: FaReceipt },
  { title: 'Login History', description: 'Sign-in events by user and time', icon: FaLock },
  { title: 'Audit Trail', description: 'Important changes and system actions', icon: FaSearch },
]

const sampleRows = [
  { activity: 'Invoice #10011 closed', user: 'Ariel Santos', date: '2026-07-21', time: '16:45' },
  { activity: 'Payment posted for order #J-1088', user: 'Rene Dela Cruz', date: '2026-07-21', time: '15:12' },
  { activity: 'Expense logged for detergent purchase', user: 'Mina Cruz', date: '2026-07-21', time: '13:34' },
  { activity: 'Machine #3 completed cycle', user: 'Rene Dela Cruz', date: '2026-07-21', time: '12:06' },
  { activity: 'User account updated', user: 'Ariel Santos', date: '2026-07-21', time: '10:50' },
]

export function HistoryPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">History</p>
            <h2 className="mt-2 text-3xl font-semibold">Read-only operational record center</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Review sales, payments, inventory, machine activity, login events, and audit records without editing or deleting anything.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-blue-50">Read Only</div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {historySections.map(({ title, description, icon: Icon }) => (
          <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Icon className="text-lg" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Activity</th>
                    <th className="px-3 py-2 font-semibold">User</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((row) => (
                    <tr key={`${title}-${row.activity}`} className="border-t border-slate-200 bg-white">
                      <td className="px-3 py-2">{row.activity}</td>
                      <td className="px-3 py-2">{row.user}</td>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
