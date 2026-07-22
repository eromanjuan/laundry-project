interface PaymentHistoryPanelProps {
  rows: Array<{
    orNumber: string
    customer: string
    status: string
  }>
}

export function PaymentHistoryPanel({ rows }: PaymentHistoryPanelProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <h3 className="text-lg font-semibold text-slate-900">Payment History</h3>
      <p className="mt-1 text-sm text-slate-500">Latest settlements and customer balances.</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.orNumber} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div>
              <p className="font-semibold text-slate-900">{row.orNumber}</p>
              <p className="text-sm text-slate-500">{row.customer}</p>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
