import { useMemo, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { AddCustomerModal, type CustomerFormValues } from '../components/AddCustomerModal'
import { EditCustomerModal } from '../components/EditCustomerModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { CustomerTable } from '../components/CustomerTable'
import { SearchBar } from '../components/SearchBar'
import { useCollection } from '../hooks/useCollection'
import { usePermissions } from '../hooks/usePermissions'
import { nextId, seedCustomers, type CustomerRecord } from '../data/seeds'

export function CustomersPage() {
  const [query, setQuery] = useState('')
  const { data: customers, add, update, remove } = useCollection<CustomerRecord>('customers', seedCustomers)
  const { manageCustomers: canManage } = usePermissions()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CustomerRecord | null>(null)

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
    void add({
      id: nextId(customers, 'C-', 1001),
      name: payload.name,
      mobile: payload.mobile,
      address: payload.address,
      loyaltyPoints: 0,
      totalOrders: 0,
      outstandingBalance: '₱0',
      lastVisit: 'Just added',
      status: 'Active',
    })
  }

  const handleEditSave = (changes: Partial<CustomerRecord>) => {
    if (editing) void update(editing, changes)
  }

  const handleDelete = (row: { id: string }) => {
    const record = customers.find((item) => item.id === row.id)
    if (record) setPendingDelete(record)
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

          {canManage ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              <FaPlus />
              Add Customer
            </button>
          ) : null}
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

        <CustomerTable
          rows={filteredCustomers}
          canManage={canManage}
          onEdit={(row) => setEditing(customers.find((item) => item.id === row.id) ?? null)}
          onDelete={handleDelete}
        />
      </section>

      <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddCustomer} />
      <EditCustomerModal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSave={handleEditSave}
        customer={editing}
      />
      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        title="Delete customer"
        message={
          pendingDelete
            ? `Delete ${pendingDelete.name} (${pendingDelete.id})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDelete) void remove(pendingDelete)
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
