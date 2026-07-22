import { useMemo, useState } from 'react'
import { FaEdit, FaFileExcel, FaFilePdf, FaPrint, FaSave, FaSearch } from 'react-icons/fa'
import { SummaryStat } from '../components/SummaryStat'

type MachineStatus = 'Running' | 'Maintenance' | 'Out of Service' | 'Idle'

interface MachineRow {
  id: string
  name: string
  yesterday: number
  today: number
  status: MachineStatus
  remarks: string
  interval: number
  monthlyCycles: number
}

const initialWashers: MachineRow[] = Array.from({ length: 6 }, (_, index) => ({
  id: `washer-${index + 1}`,
  name: `Washer ${index + 1}`,
  yesterday: 3150 + index * 120,
  today: 3164 + index * 120,
  status: index % 3 === 0 ? 'Running' : index % 3 === 1 ? 'Idle' : 'Maintenance',
  remarks: index % 2 === 0 ? 'Stable' : 'Needs inspection',
  interval: 500,
  monthlyCycles: 320 + index * 28,
}))

const initialDryers: MachineRow[] = Array.from({ length: 6 }, (_, index) => ({
  id: `dryer-${index + 1}`,
  name: `Dryer ${index + 1}`,
  yesterday: 2810 + index * 95,
  today: 2842 + index * 95,
  status: index % 3 === 0 ? 'Running' : index % 3 === 1 ? 'Idle' : 'Out of Service',
  remarks: index % 2 === 0 ? 'Good airflow' : 'Check heating element',
  interval: 600,
  monthlyCycles: 280 + index * 24,
}))

const filters = ['Today', 'This Week', 'This Month', 'Custom Date']

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-PH').format(value)
}

function statusTone(status: MachineStatus) {
  switch (status) {
    case 'Running':
      return 'bg-emerald-100 text-emerald-700'
    case 'Maintenance':
      return 'bg-amber-100 text-amber-700'
    case 'Out of Service':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function maintenanceTone(cyclesRemaining: number) {
  if (cyclesRemaining <= 100) return 'text-rose-600'
  if (cyclesRemaining <= 250) return 'text-amber-600'
  return 'text-emerald-600'
}

export function MachineMonitoringPage() {
  const [washers, setWashers] = useState(initialWashers)
  const [dryers, setDryers] = useState(initialDryers)
  const [washerCount, setWasherCount] = useState(6)
  const [dryerCount, setDryerCount] = useState(6)
  const [selectedFilter, setSelectedFilter] = useState('Today')

  const washerCycleTotal = useMemo(() => washers.reduce((sum, item) => sum + (item.today - item.yesterday), 0), [washers])
  const dryerCycleTotal = useMemo(() => dryers.reduce((sum, item) => sum + (item.today - item.yesterday), 0), [dryers])
  const monthlyWasherTotal = useMemo(() => washers.reduce((sum, item) => sum + item.monthlyCycles, 0), [washers])
  const monthlyDryerTotal = useMemo(() => dryers.reduce((sum, item) => sum + item.monthlyCycles, 0), [dryers])
  const runningMachines = useMemo(() => washers.filter((item) => item.status === 'Running').length + dryers.filter((item) => item.status === 'Running').length, [washers, dryers])
  const highestUsageMachine = useMemo(() => {
    const combined = [...washers, ...dryers]
    return combined.sort((a, b) => b.today - b.yesterday - (a.today - a.yesterday))[0]?.name ?? 'None'
  }, [washers, dryers])

  const updateMachine = (type: 'washer' | 'dryer', id: string, field: keyof MachineRow, value: number | string) => {
    if (type === 'washer') {
      setWashers((current) => current.map((machine) => (machine.id === id ? { ...machine, [field]: value } : machine)))
      return
    }

    setDryers((current) => current.map((machine) => (machine.id === id ? { ...machine, [field]: value } : machine)))
  }

  const handleConfigSave = () => {
    const nextWashers = Array.from({ length: washerCount }, (_, index) => ({
      id: `washer-${index + 1}`,
      name: `Washer ${index + 1}`,
      yesterday: washers[index]?.yesterday ?? 3000 + index * 120,
      today: washers[index]?.today ?? 3010 + index * 120,
      status: washers[index]?.status ?? 'Idle',
      remarks: washers[index]?.remarks ?? 'Stable',
      interval: washers[index]?.interval ?? 500,
      monthlyCycles: washers[index]?.monthlyCycles ?? 320 + index * 28,
    }))

    const nextDryers = Array.from({ length: dryerCount }, (_, index) => ({
      id: `dryer-${index + 1}`,
      name: `Dryer ${index + 1}`,
      yesterday: dryers[index]?.yesterday ?? 2800 + index * 95,
      today: dryers[index]?.today ?? 2820 + index * 95,
      status: dryers[index]?.status ?? 'Idle',
      remarks: dryers[index]?.remarks ?? 'Stable',
      interval: dryers[index]?.interval ?? 600,
      monthlyCycles: dryers[index]?.monthlyCycles ?? 280 + index * 24,
    }))

    setWashers(nextWashers)
    setDryers(nextDryers)
  }

  const washerAvgPerDay = monthlyWasherTotal / 30
  const dryerAvgPerDay = monthlyDryerTotal / 30
  const mostUsedWasher = washers.reduce((current, item) => (item.monthlyCycles > current.monthlyCycles ? item : current), washers[0])
  const mostUsedDryer = dryers.reduce((current, item) => (item.monthlyCycles > current.monthlyCycles ? item : current), dryers[0])
  const leastUsedWasher = washers.reduce((current, item) => (item.monthlyCycles < current.monthlyCycles ? item : current), washers[0])
  const leastUsedDryer = dryers.reduce((current, item) => (item.monthlyCycles < current.monthlyCycles ? item : current), dryers[0])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Machine Monitoring</p>
            <h2 className="mt-2 text-3xl font-semibold">Industrial equipment cycle and utilization dashboard</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Track washer and dryer activity, compute today's actual cycles, and monitor maintenance readiness in one view.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${selectedFilter === filter ? 'bg-white text-blue-700' : 'bg-blue-500/40 text-blue-50 hover:bg-blue-400/60'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaSave /> Save Daily Reading
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaEdit /> Edit Reading
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaSearch /> View History
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaPrint /> Print Report
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaFileExcel /> Export Excel
        </button>
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <FaFilePdf /> Export PDF
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryStat label="Washer Cycles Today" value={formatNumber(washerCycleTotal)} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Dryer Cycles Today" value={formatNumber(dryerCycleTotal)} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Washer Cycles This Month" value={formatNumber(monthlyWasherTotal)} accent="bg-violet-100 text-violet-700" />
        <SummaryStat label="Dryer Cycles This Month" value={formatNumber(monthlyDryerTotal)} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Total Machines Running" value={runningMachines.toString()} accent="bg-slate-100 text-slate-700" />
        <SummaryStat label="Highest Usage Today" value={highestUsageMachine} accent="bg-cyan-100 text-cyan-700" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Machine Configuration</h3>
            <p className="text-sm text-slate-500">Adjust the number of washers and dryers available for the current shift.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">Washers</span>
              <input type="number" min="1" max="20" value={washerCount} onChange={(event) => setWasherCount(Number(event.target.value))} className="w-16 border-none bg-transparent outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">Dryers</span>
              <input type="number" min="1" max="20" value={dryerCount} onChange={(event) => setDryerCount(Number(event.target.value))} className="w-16 border-none bg-transparent outline-none" />
            </label>
            <button onClick={handleConfigSave} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Apply</button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Daily Cycle Entry</h3>
                <p className="text-sm text-slate-500">Enter yesterday and today meter readings to auto-calculate actual cycles.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Total: {formatNumber(washerCycleTotal + dryerCycleTotal)}</div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Washers</div>
                <div className="divide-y divide-slate-100">
                  {washers.map((machine) => {
                    const actualCycles = machine.today - machine.yesterday
                    const cyclesRemaining = machine.interval - (actualCycles % machine.interval)
                    return (
                      <div key={machine.id} className="grid gap-3 p-4 lg:grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr_1fr_0.8fr] lg:items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{machine.name}</p>
                          <p className="text-xs text-slate-500">Maintenance interval: every {machine.interval} cycles</p>
                        </div>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Yesterday</span>
                          <input type="number" value={machine.yesterday} onChange={(event) => updateMachine('washer', machine.id, 'yesterday', Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Today</span>
                          <input type="number" value={machine.today} onChange={(event) => updateMachine('washer', machine.id, 'today', Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
                        </label>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Actual Cycle</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{actualCycles}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</p>
                          <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(machine.status)}`}>{machine.status}</div>
                        </div>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Remarks</span>
                          <input value={machine.remarks} onChange={(event) => updateMachine('washer', machine.id, 'remarks', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
                        </label>
                        <div className="lg:col-span-6 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                          <span className={`font-semibold ${maintenanceTone(cyclesRemaining)}`}>Cycles Remaining: {cyclesRemaining}</span> • Next Maintenance Due: {machine.interval - (actualCycles % machine.interval) <= 100 ? 'Immediate' : `After ${cyclesRemaining} cycles`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Dryers</div>
                <div className="divide-y divide-slate-100">
                  {dryers.map((machine) => {
                    const actualCycles = machine.today - machine.yesterday
                    const cyclesRemaining = machine.interval - (actualCycles % machine.interval)
                    return (
                      <div key={machine.id} className="grid gap-3 p-4 lg:grid-cols-[1.1fr_0.8fr_0.8fr_0.6fr_1fr_0.8fr] lg:items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{machine.name}</p>
                          <p className="text-xs text-slate-500">Maintenance interval: every {machine.interval} cycles</p>
                        </div>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Yesterday</span>
                          <input type="number" value={machine.yesterday} onChange={(event) => updateMachine('dryer', machine.id, 'yesterday', Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Today</span>
                          <input type="number" value={machine.today} onChange={(event) => updateMachine('dryer', machine.id, 'today', Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
                        </label>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Actual Cycle</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{actualCycles}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</p>
                          <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(machine.status)}`}>{machine.status}</div>
                        </div>
                        <label className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Remarks</span>
                          <input value={machine.remarks} onChange={(event) => updateMachine('dryer', machine.id, 'remarks', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none" />
                        </label>
                        <div className="lg:col-span-6 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                          <span className={`font-semibold ${maintenanceTone(cyclesRemaining)}`}>Cycles Remaining: {cyclesRemaining}</span> • Next Maintenance Due: {machine.interval - (actualCycles % machine.interval) <= 100 ? 'Immediate' : `After ${cyclesRemaining} cycles`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <h3 className="text-lg font-semibold text-slate-900">Monthly Summary</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">Average Washer Cycles / Day <span className="mt-1 block text-xl font-semibold text-slate-900">{washerAvgPerDay.toFixed(1)}</span></div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">Average Dryer Cycles / Day <span className="mt-1 block text-xl font-semibold text-slate-900">{dryerAvgPerDay.toFixed(1)}</span></div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">Most Used Washer <span className="mt-1 block text-xl font-semibold text-slate-900">{mostUsedWasher?.name ?? 'None'}</span></div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">Most Used Dryer <span className="mt-1 block text-xl font-semibold text-slate-900">{mostUsedDryer?.name ?? 'None'}</span></div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">Least Used Washer <span className="mt-1 block text-xl font-semibold text-slate-900">{leastUsedWasher?.name ?? 'None'}</span></div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">Least Used Dryer <span className="mt-1 block text-xl font-semibold text-slate-900">{leastUsedDryer?.name ?? 'None'}</span></div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
            <h3 className="text-lg font-semibold text-slate-900">Machine Status</h3>
            <div className="mt-4 space-y-2">
              {['Running', 'Maintenance', 'Out of Service', 'Idle'].map((status) => (
                <div key={status} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  <span>{status}</span>
                  <span className="font-semibold text-slate-900">{[...washers, ...dryers].filter((item) => item.status === status).length}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-slate-900">Daily Washer Cycle Chart</h3>
          <div className="mt-4 space-y-3">
            {washers.map((machine) => (
              <div key={machine.id}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                  <span>{machine.name}</span>
                  <span className="font-semibold text-slate-900">{formatNumber(machine.today - machine.yesterday)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(((machine.today - machine.yesterday) / 25) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-slate-900">Daily Dryer Cycle Chart</h3>
          <div className="mt-4 space-y-3">
            {dryers.map((machine) => (
              <div key={machine.id}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                  <span>{machine.name}</span>
                  <span className="font-semibold text-slate-900">{formatNumber(machine.today - machine.yesterday)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(((machine.today - machine.yesterday) / 25) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-slate-900">Monthly Cycle Trend</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-sm text-blue-700">Washer Trend</p>
              <p className="mt-2 text-3xl font-semibold text-blue-900">{formatNumber(monthlyWasherTotal)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">Dryer Trend</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-900">{formatNumber(monthlyDryerTotal)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-slate-900">Machine Usage Comparison</h3>
          <div className="mt-4 space-y-3">
            {[...washers, ...dryers].slice(0, 6).map((machine) => (
              <div key={machine.id}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                  <span>{machine.name}</span>
                  <span className="font-semibold text-slate-900">{machine.monthlyCycles}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-violet-600" style={{ width: `${Math.min((machine.monthlyCycles / 500) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
