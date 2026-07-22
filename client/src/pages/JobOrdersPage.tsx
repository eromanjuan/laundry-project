import { useState } from 'react'
import { FaPrint, FaQrcode, FaSave, FaTimes, FaUserPlus } from 'react-icons/fa'
import { InfoCard } from '../components/InfoCard'
import { SectionCard } from '../components/SectionCard'
import { SummaryRow } from '../components/SummaryRow'
import { ToggleOption } from '../components/ToggleOption'

const services = [
  'Wash & Fold',
  'Wash & Dry',
  'Dry Only',
  'Wash Only',
  'Comforter',
  'Spin only',
  'Rinse & Spin',
  'Spot Treatment',
  'Soaking',
]

const paymentMethods = ['Cash', 'GCash', 'Bank Transfer', 'Partial Payment']

export function JobOrdersPage() {
  const [selectedServices, setSelectedServices] = useState<string[]>(['Wash & Fold', 'Spot Treatment'])
  const [priority, setPriority] = useState('Express')
  const [options, setOptions] = useState<string[]>(['Pickup', 'Hanger'])
  const [paymentMethod, setPaymentMethod] = useState('Cash')

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service],
    )
  }

  const toggleOption = (option: string) => {
    setOptions((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    )
  }

  const serviceTotal = 320
  const discount = 20
  const additionalCharges = 40
  const grandTotal = serviceTotal - discount + additionalCharges

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Job Order Entry</p>
            <h2 className="mt-2 text-3xl font-semibold">Cashier transaction screen</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Optimized for fast customer intake, service selection, and payment completion.
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="text-sm text-blue-100">Estimated Speed</p>
            <p className="text-xl font-semibold">Under 60 seconds</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.3fr_0.95fr]">
        <div className="space-y-6">
          <SectionCard title="Customer" subtitle="Fast lookup and account summary">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400"
                  placeholder="Search customer"
                />
                <button className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                  <FaUserPlus />
                  New
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Maria Santos</p>
                    <p className="text-sm text-slate-500">0917 223 4410</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    VIP
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoCard title="Loyalty Points" value="520 pts" accent="text-blue-700" />
                  <InfoCard title="Outstanding Balance" value="₱1,240" accent="text-amber-700" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Laundry Details" subtitle="Select services and service preferences">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Services</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {services.map((service) => (
                    <label key={service} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service)}
                        onChange={() => toggleService(service)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Weight (kg)</span>
                  <input className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" defaultValue="6.5" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Number of Loads</span>
                  <input className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" defaultValue="2" />
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Priority</p>
                <div className="flex gap-2">
                  {['Normal', 'Express'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPriority(item)}
                      className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                        priority === item
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Additional Options</p>
                <div className="grid gap-2">
                  {['Pickup', 'Delivery', 'Hanger', 'Perfume'].map((option) => (
                    <ToggleOption
                      key={option}
                      label={option}
                      checked={options.includes(option)}
                      onChange={() => toggleOption(option)}
                    />
                  ))}
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Special Instructions</span>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400"
                  placeholder="Handle with care, separate colors, etc."
                />
              </label>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Payment" subtitle="Capture charges and payment method">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <SummaryRow label="Service Total" value="₱320" />
                <SummaryRow label="Discount" value="-₱20" accent="text-rose-600" />
                <SummaryRow label="Additional Charges" value="₱40" />
                <div className="border-t border-slate-200 pt-2">
                  <SummaryRow label="Grand Total" value={`₱${grandTotal}`} accent="text-blue-700" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Payment Method</p>
                <div className="grid gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                        paymentMethod === method
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Amount Received</span>
                <input className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-400" defaultValue="₱400" />
              </label>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <p className="font-semibold">Change</p>
                <p className="mt-1">₱80</p>
              </div>

              <div className="grid gap-2">
                <button className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                  <FaSave />
                  Save Job Order
                </button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <FaPrint />
                    Print Receipt
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <FaPrint />
                    Print Claim Stub
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <FaQrcode />
                    Generate QR Code
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                    <FaTimes />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Job Order Preview" subtitle="Snapshot for quick confirmation">
        <div className="grid gap-4 md:grid-cols-4">
          <InfoCard title="Job Number" value="#1028" />
          <InfoCard title="Date" value="Today, 09:42 AM" />
          <InfoCard title="Status" value="Pending" accent="text-amber-700" />
          <InfoCard title="Estimated Release Time" value="2:30 PM" accent="text-blue-700" />
        </div>
      </SectionCard>
    </div>
  )
}
