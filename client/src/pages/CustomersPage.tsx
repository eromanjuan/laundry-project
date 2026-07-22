import { useMemo, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { AddCustomerModal, type CustomerFormValues } from '../components/AddCustomerModal'
import { CustomerTable } from '../components/CustomerTable'
import { SearchBar } from '../components/SearchBar'

const initialCustomers = [
  {
    id: 'C-1001',
    name: 'Maria Santos',
    mobile: '0917 223 4410',
    address: 'Block 12, Greenlane',
    loyaltyPoints: 520,
    totalOrders: 18,
    outstandingBalance: '₱1,240',
    lastVisit: '2 hrs ago',
    status: 'VIP' as const,
  },
  {
    id: 'C-1002',
    name: 'Jose Cruz',
    mobile: '0928 551 9032',
    address: 'Unit 8B, Harbor Street',
    loyaltyPoints: 210,
    totalOrders: 9,
    outstandingBalance: '₱380',
    lastVisit: 'Yesterday',
    status: 'Active' as const,
  },
  {
    id: 'C-1003',
    name: 'Rina Dela Cruz',
    mobile: '0998 110 3345',
    address: 'Lot 4, Pine Heights',
    loyaltyPoints: 76,
    totalOrders: 4,
    outstandingBalance: '₱0',
    lastVisit: '3 days ago',
    status: 'Inactive' as const,
  },
]

export function CustomersPage() {
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState(initialCustomers)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredCustomers = useMemo(() => {
    const search = query.trim().toLowerCase()

    if (!search) return customers

    return customers.filter((customer) =>
      [customer.name, customer.mobile, customer.address, customer.id]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [customers, query])

  const handleAddCustomer = (payload: CustomerFormValues) => {
    const nextCustomer = {
      id: `C-${String(customers.length + 1000).padStart(4, '0')}`,
      name: payload.name,
      mobile: payload.mobile,
      address: payload.address,
      loyaltyPoints: 0,
      totalOrders: 0,
      outstandingBalance: '₱0',
      lastVisit: 'Just added',
      status: 'Active' as const,
    }

    setCustomers([nextCustomer, ...customers])
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Customer Management</p>
            <h2 className="mt-2 text-3xl font-semibold">Professional customer records</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Search, review, and onboard customers with a streamlined enterprise-style workspace.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <FaPlus />
            Add Customer
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Customer Directory</h3>
            <p className="text-sm text-slate-500">Track loyalty, orders, balances, and activity history.</p>
          </div>
          <div className="w-full lg:w-80">
            <SearchBar value={query} onChange={setQuery} />
          </div>
        </div>

        <CustomerTable rows={filteredCustomers} />
      </section>

      <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddCustomer} />
    </div>
  )
}
