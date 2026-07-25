import { useEffect, useState, type FormEvent } from 'react'
import { FaTimes } from 'react-icons/fa'
import type { CustomerRecord } from '../data/seeds'

interface EditCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (changes: Partial<CustomerRecord>) => void
  customer: CustomerRecord | null
}

const statuses: Array<CustomerRecord['status']> = ['Active', 'VIP', 'Inactive']

export function EditCustomerModal({ isOpen, onClose, onSave, customer }: EditCustomerModalProps) {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    address: '',
    status: 'Active' as CustomerRecord['status'],
    loyaltyPoints: 0,
    outstandingBalance: '',
  })

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address,
        status: customer.status,
        loyaltyPoints: customer.loyaltyPoints,
        outstandingBalance: customer.outstandingBalance,
      })
    }
  }, [customer])

  if (!isOpen || !customer) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({
      name: form.name,
      mobile: form.mobile,
      address: form.address,
      status: form.status,
      loyaltyPoints: Number(form.loyaltyPoints) || 0,
      outstandingBalance: form.outstandingBalance,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Edit Customer</h3>
            <p className="mt-1 text-sm text-slate-500">{customer.id} — update profile and status.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
            <FaTimes />
          </button>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Customer Name</span>
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Mobile Number</span>
            <input value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CustomerRecord['status'] })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400">
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Address</span>
            <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Loyalty Points</span>
            <input type="number" value={form.loyaltyPoints} onChange={(event) => setForm({ ...form, loyaltyPoints: Number(event.target.value) })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Outstanding Balance</span>
            <input value={form.outstandingBalance} onChange={(event) => setForm({ ...form, outstandingBalance: event.target.value })} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" />
          </label>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100">Cancel</button>
            <button type="submit" className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  )
}
