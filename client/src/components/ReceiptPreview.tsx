import type { ClaimRow } from './ClaimTable'
import { useBranding } from '../hooks/useBranding'

interface ReceiptPreviewProps {
  row: ClaimRow | null
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={bold ? 'font-bold text-slate-900' : 'text-slate-800'}>{value}</span>
    </div>
  )
}

export function ReceiptPreview({ row }: ReceiptPreviewProps) {
  const { logoUrl } = useBranding()
  if (!row) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        Select an order to preview its receipt.
      </div>
    )
  }

  return (
    <div className="mx-auto w-[280px] rounded-2xl border border-slate-200 bg-white p-5 font-mono text-xs text-slate-700 shadow-sm">
      <div className="flex flex-col items-center border-b border-dashed border-slate-300 pb-3 text-center">
        <img src={logoUrl} alt="" className="mb-2 h-14 w-14 object-contain" />
        <p className="text-sm font-bold tracking-widest text-slate-900">LAUNDRY PROJECT</p>
        <p className="text-[10px] text-slate-500">Cleaner care, better living</p>
        <p className="mt-1 text-[10px] text-slate-500">OFFICIAL RECEIPT</p>
      </div>

      <div className="space-y-1 border-b border-dashed border-slate-300 py-3">
        <Line label="Job #" value={row.id} bold />
        <Line label="Customer" value={row.customer} />
        <Line label="Service" value={row.service} />
        <Line label="Weight" value={row.weight} />
      </div>

      <div className="space-y-1 py-3">
        <Line label="Total" value={row.totalAmount} />
        <Line label="Paid" value={row.amountPaid} />
        <Line label="Balance" value={row.balance} bold />
        <Line label="Status" value={row.paymentStatus} />
      </div>

      <p className="border-t border-dashed border-slate-300 pt-3 text-center text-[10px] text-slate-500">
        Thank you! Please keep this receipt.
      </p>
    </div>
  )
}
