import type { ClaimRow } from './ClaimTable'

interface ReceiptPreviewProps {
  row: ClaimRow | null
}

export function ReceiptPreview({ row }: ReceiptPreviewProps) {
  if (!row) return null

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="border-b border-slate-200 pb-4">
        <p className="text-lg font-semibold text-slate-900">Laundry Project POS</p>
        <p className="text-sm text-slate-500">Official receipt preview</p>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>Receipt</span>
          <span className="font-semibold text-slate-900">{row.id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Customer</span>
          <span className="font-semibold text-slate-900">{row.customer}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Service</span>
          <span className="font-semibold text-slate-900">{row.service}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Total</span>
          <span className="font-semibold text-slate-900">{row.totalAmount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Paid</span>
          <span className="font-semibold text-slate-900">{row.amountPaid}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Balance</span>
          <span className="font-semibold text-slate-900">{row.balance}</span>
        </div>
      </div>
    </div>
  )
}
