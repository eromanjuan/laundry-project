import { useMemo, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import { ProductionCard } from '../components/ProductionCard'
import { ProductionColumn } from '../components/ProductionColumn'
import { SummaryStat } from '../components/SummaryStat'

const initialJobs = [
  {
    id: '#1031',
    customer: 'Maria Santos',
    service: 'Wash & Fold',
    weight: '6.5 kg',
    loads: 2,
    totalLaundries: 12,
    assigned: 'Washer 1',
    timeReceived: '08:20',
    estimatedRelease: '14:00',
    priority: 'Express' as const,
    paymentStatus: 'Paid',
    status: 'Received',
    category: 'Express' as const,
  },
  {
    id: '#1032',
    customer: 'Jose Cruz',
    service: 'Comforter',
    weight: '8.0 kg',
    loads: 3,
    totalLaundries: 5,
    assigned: 'Washer 2',
    timeReceived: '08:55',
    estimatedRelease: '15:30',
    priority: 'Normal' as const,
    paymentStatus: 'Pending',
    status: 'Washing',
    category: 'Full Service' as const,
  },
  {
    id: '#1033',
    customer: 'Rina Dela Cruz',
    service: 'Dry Only',
    weight: '3.2 kg',
    loads: 1,
    totalLaundries: 4,
    assigned: 'Dryer 1',
    timeReceived: '09:10',
    estimatedRelease: '11:20',
    priority: 'Express' as const,
    paymentStatus: 'Paid',
    status: 'Ready',
    category: 'Ready Today' as const,
  },
  {
    id: '#1034',
    customer: 'Liza Gomez',
    service: 'Wash Only',
    weight: '4.8 kg',
    loads: 2,
    totalLaundries: 7,
    assigned: 'Dryer 2',
    timeReceived: '09:40',
    estimatedRelease: '13:20',
    priority: 'Normal' as const,
    paymentStatus: 'Paid',
    status: 'Received',
    category: 'Commercial' as const,
  },
]

const statuses = ['Received', 'Washing', 'Ready', 'Claimed']
const filters = ['All', 'Express', 'Full Service', 'Self Service', 'Commercial', 'Ready Today']

export function ProductionBoardPage() {
  const [jobs, setJobs] = useState(initialJobs)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const filteredJobs = useMemo(() => {
    const search = query.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesFilter = activeFilter === 'All' || job.category === activeFilter || job.priority === activeFilter
      const matchesSearch = !search || [job.id, job.customer].join(' ').toLowerCase().includes(search)
      return matchesFilter && matchesSearch
    })
  }, [jobs, query, activeFilter])

  const groupedJobs = statuses.reduce((acc, status) => {
    acc[status] = filteredJobs.filter((job) => job.status === status)
    return acc
  }, {} as Record<string, typeof filteredJobs>)

  const handleDrop = (status: string) => {
    const draggedId = sessionStorage.getItem('draggedJobId')
    if (!draggedId) return

    setJobs((current) => current.map((job) => (job.id === draggedId ? { ...job, status } : job)))
    sessionStorage.removeItem('draggedJobId')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Production Board</p>
            <h2 className="mt-2 text-3xl font-semibold">Kanban-style laundry workflow</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Track each order across receiving, washing, and claim stages with a live operational view.
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="text-sm text-blue-100">Active Workload</p>
            <p className="text-xl font-semibold">{jobs.length} jobs</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat label="Received" value="8 jobs" accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="In Washing" value="5 jobs" accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Ready for Claim" value="3 jobs" accent="bg-orange-100 text-orange-700" />
        <SummaryStat label="Completed Today" value="12 jobs" accent="bg-emerald-100 text-emerald-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Workflow Filters</h3>
            <p className="text-sm text-slate-500">Filter by service type, urgency, or readiness.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              <FaSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-48 border-none bg-transparent outline-none placeholder:text-slate-400"
                placeholder="Search job or customer"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    activeFilter === filter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {statuses.map((status) => (
          <div
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(status)}
            className="min-h-[480px] rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm shadow-slate-200/70"
          >
            <ProductionColumn
              title={status}
              count={groupedJobs[status].length}
              accent={
                status === 'Received'
                  ? 'bg-blue-100 text-blue-700'
                  : status === 'Washing'
                    ? 'bg-amber-100 text-amber-700'
                    : status === 'Ready'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-emerald-100 text-emerald-700'
              }
            >
              {groupedJobs[status].map((job) => (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => sessionStorage.setItem('draggedJobId', job.id)}
                  className="cursor-grab"
                >
                  <ProductionCard job={job} />
                </div>
              ))}
            </ProductionColumn>
          </div>
        ))}
      </div>
    </div>
  )
}
