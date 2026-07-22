import { useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CustomerFormValues) => void
}

export interface CustomerFormValues {
  name: string
  mobile: string
  address: string
  email: string
  birthday: string
  notes: string
}

const initialValues: CustomerFormValues = {
  name: '',
  mobile: '',
  address: '',
  email: '',
  birthday: '',
  notes: '',
}

export function AddCustomerModal({ isOpen, onClose, onSubmit }: AddCustomerModalProps) {
  const [form, setForm] = useState<CustomerFormValues>(initialValues)

  useEffect(() => {
    if (!isOpen) {
      setForm(initialValues)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Add Customer</h3>
            <p className="mt-1 text-sm text-slate-500">Create a new customer profile for laundry services.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <FaTimes />
          </button>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Customer Name</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Mobile Number</span>
            <input
              required
              value={form.mobile}
              onChange={(event) => setForm({ ...form, mobile: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Address</span>
            <input
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Birthday</span>
            <input
              type="date"
              value={form.birthday}
              onChange={(event) => setForm({ ...form, birthday: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <input
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
            />
          </label>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
