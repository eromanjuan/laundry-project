import { FaEye, FaMoneyBillWave, FaPrint } from 'react-icons/fa'
import { PAYMENT_FIELDS, type PaymentRow } from '../lib/paymentFields'

// Re-exported so existing importers of the row type keep working.
export type { PaymentRow }

interface PaymentTableProps {
  rows: PaymentRow[]
  onView: (row: PaymentRow) => void
  onReceive: (row: PaymentRow) => void
  onReceipt?: (row: PaymentRow) => void
  visibleFields?: Array<keyof PaymentRow>
}

const allKeys = PAYMENT_FIELDS.map((field) => field.key)

export function PaymentTable({ rows, onView, onReceive, onReceipt, visibleFields = allKeys }: PaymentTableProps) {
  const fields = PAYMENT_FIELDS.filter((field) => visibleFields.includes(field.key))

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {fields.map((field) => (
                <th key={field.key} className="px-4 py-3 font-medium">{field.label}</th>
              ))}
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.orNumber} className="border-t border-slate-100 transition hover:bg-slate-50">
                {fields.map((field) => (
                  <td key={field.key} className="px-4 py-3 text-slate-700">
                    {field.key === 'status' ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : row.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {row.status}
                      </span>
                    ) : (
                      row[field.key]
                    )}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onView(row)} title="View" className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"><FaEye /></button>
                    <button onClick={() => onReceive(row)} title="Receive payment" className="rounded-xl border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-50"><FaMoneyBillWave /></button>
                    <button onClick={() => onReceipt?.(row)} title="Print receipt" className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"><FaPrint /></button>
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
