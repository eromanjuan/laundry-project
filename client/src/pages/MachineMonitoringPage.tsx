import { useMemo, useState, type FormEvent } from 'react'
import { FaFileExcel, FaPlus, FaPrint, FaTrash, FaWrench, FaCheckCircle, FaRedo, FaRobot, FaHandPaper, FaSyncAlt, FaPen, FaSave, FaTimes, FaHistory } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { SummaryStat } from '../components/SummaryStat'
import { ActivityLogModal } from '../components/ActivityLogModal'
import { PasswordPromptModal } from '../components/PasswordPromptModal'
import { useCollection } from '../hooks/useCollection'
import { usePermissions } from '../hooks/usePermissions'
import { useLgConnection } from '../hooks/useLgConnection'
import { useLgStatus } from '../hooks/useLgStatus'
import { useAuth } from '../context/AuthContext'
import { nextId, nowStamp, seedActivity, seedMachines, seedOrders, type ActivityRecord, type MachineRecord, type OrderRecord } from '../data/seeds'
import { printReport } from '../lib/exports'

function statusTone(status: MachineRecord['status']) {
  switch (status) {
    case 'Available':
      return 'bg-emerald-100 text-emerald-700'
    case 'Busy':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-rose-100 text-rose-700'
  }
}

/** Colour for the LG live machine statuses (In Use / Standby / Offline / Error). */
function lgTone(status: string) {
  switch (status) {
    case 'Standby':
      return 'bg-emerald-100 text-emerald-700'
    case 'In Use':
      return 'bg-amber-100 text-amber-700'
    case 'Error':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-200 text-slate-600' // Offline
  }
}

export function MachineMonitoringPage() {
  const { data: machines, add, update, remove } = useCollection<MachineRecord>('machines', seedMachines)
  const { data: orders } = useCollection<OrderRecord>('orders', seedOrders)
  const { data: activity, add: addActivity } = useCollection<ActivityRecord>('activity', seedActivity)
  const { manageMachines, editMachines } = usePermissions()
  const { user, verifyPassword } = useAuth()

  const logActivity = (action: string) =>
    void addActivity({ id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, action, user: user?.name ?? 'Unknown', at: nowStamp() })
  const { connection: lg } = useLgConnection()
  const lgStatus = useLgStatus()

  const [name, setName] = useState('')
  const [type, setType] = useState<MachineRecord['type']>('Washer')
  const [interval, setIntervalValue] = useState('500')
  const [lgLink, setLgLink] = useState('')
  const [pendingDelete, setPendingDelete] = useState<(MachineRecord & { _docId?: string }) | null>(null)
  const [clearPrompt, setClearPrompt] = useState(false)
  const [savePrompt, setSavePrompt] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; type: MachineRecord['type']; cycles: string; interval: string; lgDeviceId: string } | null>(null)

  const startEdit = (machine: MachineRecord & { _docId?: string }) =>
    setEditing({ id: machine.id, name: machine.name, type: machine.type, cycles: String(machine.cycles || 0), interval: String(machine.interval || 500), lgDeviceId: machine.lgDeviceId ?? '' })

  // Saving an edit needs a password — verify, then apply the change and log it.
  const confirmSaveEdit = async (password: string): Promise<string | null> => {
    if (!editing) return 'Nothing to save.'
    const machine = machines.find((m) => m.id === editing.id)
    if (!machine) return 'Machine not found.'
    const ok = await verifyPassword(password)
    if (!ok) return 'Incorrect password. Please try again.'
    const nextName = editing.name.trim() || machine.name
    void update(machine, {
      name: nextName,
      type: editing.type,
      cycles: Number(editing.cycles) || 0,
      interval: Number(editing.interval) || 500,
      lgDeviceId: editing.lgDeviceId || '',
    })
    logActivity(`Machine ${nextName}: edited (type ${editing.type}, cycles ${Number(editing.cycles) || 0}, interval ${Number(editing.interval) || 500}${editing.lgDeviceId ? ', LG-tallied' : ''})`)
    setSavePrompt(false)
    setEditing(null)
    return null
  }

  // Deleting a machine also needs a password.
  const confirmDelete = async (password: string): Promise<string | null> => {
    if (!pendingDelete) return 'Nothing to delete.'
    const ok = await verifyPassword(password)
    if (!ok) return 'Incorrect password. Please try again.'
    logActivity(`Machine ${pendingDelete.name}: deleted`)
    void remove(pendingDelete)
    setPendingDelete(null)
    return null
  }

  const lgActive = lg.connected && lg.enabled
  const lgMachines = lgStatus.machines ?? []
  const usingLg = lgMachines.length > 0

  // The top counts reflect the REAL LG machines when connected (mapped:
  // Standby → Available, In Use → Busy, Offline/Error → Maintenance), otherwise
  // they fall back to any manually-added machines.
  const stats = useMemo(() => {
    if (usingLg) {
      const washers = lgMachines.filter((m) => m.type === 'Washer').length
      const available = lgMachines.filter((m) => m.status === 'Standby').length
      const busy = lgMachines.filter((m) => m.status === 'In Use').length
      const maintenance = lgMachines.filter((m) => m.status === 'Offline' || m.status === 'Error').length
      const cycles = lgMachines.reduce((sum, m) => sum + (m.cycles || 0), 0)
      return { total: lgMachines.length, washers, available, busy, maintenance, cycles }
    }
    const washers = machines.filter((machine) => machine.type === 'Washer')
    const available = machines.filter((machine) => machine.status === 'Available').length
    const busy = machines.filter((machine) => machine.status === 'Busy').length
    const maintenance = machines.filter((machine) => machine.status === 'Maintenance').length
    const cycles = machines.reduce((sum, machine) => sum + (machine.cycles || 0), 0)
    return { total: machines.length, washers: washers.length, available, busy, maintenance, cycles }
  }, [usingLg, lgMachines, machines])

  const handleAdd = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    void add({
      id: nextId(machines, 'M-', 1),
      name: name.trim(),
      type,
      status: 'Available',
      orderId: '',
      cycles: 0,
      interval: Number(interval) || 500,
      lgDeviceId: lgLink || '',
    })
    setName('')
    setIntervalValue('500')
    setLgLink('')
  }

  /** The live LG machine a manual record is tallied against, if any. */
  const lgLinkFor = (machine: MachineRecord) =>
    (machine.lgDeviceId ? lgMachines.find((m) => m.deviceId === machine.lgDeviceId) ?? null : null)

  const toggleMaintenance = (machine: MachineRecord & { _docId?: string }) => {
    if (machine.status === 'Busy') return
    const next = machine.status === 'Maintenance' ? 'Available' : 'Maintenance'
    void update(machine, { status: next })
    logActivity(`Machine ${machine.name}: set ${next === 'Maintenance' ? 'to Maintenance' : 'Available'}`)
  }

  const clearCycles = async (enteredPassword: string): Promise<string | null> => {
    const ok = await verifyPassword(enteredPassword)
    if (!ok) return 'Incorrect password. Please try again.'
    machines.forEach((machine) => {
      // Auto machines report their real lifetime count from LG — don't zero those.
      if (machine.monitorMode === 'Auto') return
      if ((machine.cycles || 0) !== 0) void update(machine, { cycles: 0 })
    })
    void addActivity({
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      action: `Cleared all machine cycle counts`,
      user: user?.name ?? 'Unknown',
      at: nowStamp(),
    })
    return null
  }

  const printReportDoc = () => {
    const rows = machines
      .map((m) => `<tr><td>${m.name}</td><td>${m.type}</td><td>${m.status}</td><td>${m.orderId || '—'}</td><td>${m.cycles || 0}</td></tr>`)
      .join('')
    printReport(
      'Machine Report',
      `<table><thead><tr><th>Machine</th><th>Type</th><th>Status</th><th>Order</th><th>Cycles</th></tr></thead><tbody>${rows}</tbody></table>`,
    )
  }

  const exportCsv = () => {
    const header = ['ID', 'Name', 'Type', 'Status', 'Assigned Order', 'Cycles', 'Interval']
    const rows = machines.map((m) => [m.id, m.name, m.type, m.status, m.orderId || '', String(m.cycles || 0), String(m.interval)])
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'machines.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white shadow-xl shadow-blue-200/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-100">Machine Monitoring</p>
            <h2 className="mt-2 text-3xl font-semibold">Equipment capacity & availability</h2>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Add machines, track availability, and let job orders auto-assign to a free washer — orders queue as Pending when every machine is busy.
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
            <p className="text-sm text-blue-100">Available Now</p>
            <p className="text-xl font-semibold">{stats.available} of {stats.total}</p>
          </div>
        </div>
      </section>

      {/* Live per-store availability pulled from the LG account by the sync backend. */}
      {lgActive || (lgStatus.stores && lgStatus.stores.length > 0) ? (
        <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaRobot className="text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">LG Live Machine Status</h3>
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FaSyncAlt className="text-[0.7rem]" />
              {lgStatus.syncedAt ? `Synced ${new Date(lgStatus.syncedAt).toLocaleTimeString()}` : 'awaiting first sync'}
            </span>
          </div>
          {lgStatus.error ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Last sync error: {lgStatus.error}</p>
          ) : null}
          {lgStatus.machines && lgStatus.machines.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lgStatus.machines.map((m) => (
                <div key={m.deviceId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{m.name}</p>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{m.type}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${lgTone(m.status)}`}>
                      {m.status}{m.course ? ` · ${m.course}` : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Cycle: <span className="font-semibold text-slate-700">{m.cycles.toLocaleString()}</span>
                    {m.status === 'In Use' && m.remainingMin ? ` • ${m.remainingMin} min left` : ''}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-slate-400">{m.storeName}</p>
                </div>
              ))}
            </div>
          ) : lgStatus.stores && lgStatus.stores.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lgStatus.stores.map((store) => (
                <div key={store.storeId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{store.storeName}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Washers</span>
                      <span className="font-semibold text-emerald-600">{store.washer.standby}/{store.washer.total} free</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Dryers</span>
                      <span className="font-semibold text-emerald-600">{store.dryer.standby}/{store.dryer.total} free</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Waiting for the first sync from your LG account…
            </p>
          )}
        </section>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <FaHandPaper className="text-slate-400" />
            LG account not connected — showing your manually-managed machines below.
          </span>
          {manageMachines ? (
            <Link to="/settings" className="font-semibold text-blue-600 hover:underline">
              Connect your LG account in Settings → Machine Sync →
            </Link>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryStat label="Total Machines" value={String(stats.total)} accent="bg-blue-100 text-blue-700" />
        <SummaryStat label="Available" value={String(stats.available)} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Busy" value={String(stats.busy)} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="Maintenance" value={String(stats.maintenance)} accent="bg-rose-100 text-rose-700" />
        <SummaryStat label="Total Cycles" value={stats.cycles.toLocaleString()} accent="bg-violet-100 text-violet-700" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <FaFileExcel /> Export CSV
        </button>
        <button onClick={printReportDoc} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <FaPrint /> Print Report
        </button>
        <button onClick={() => setShowLog(true)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <FaHistory /> View Log
        </button>
        {manageMachines ? (
          <button onClick={() => setClearPrompt(true)} className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100">
            <FaRedo /> Clear Cycle Count
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {manageMachines ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FaPlus className="text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Add Machine</h3>
            </div>
            <form className="space-y-4" onSubmit={handleAdd}>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Machine Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="e.g. Washer 1" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Type</span>
                  <select value={type} onChange={(event) => setType(event.target.value as MachineRecord['type'])} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400">
                    <option value="Washer">Washer</option>
                    <option value="Dryer">Dryer</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Maint. Interval (cycles)</span>
                  <input type="number" value={interval} onChange={(event) => setIntervalValue(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400" />
                </label>
              </div>
              {lgMachines.length > 0 ? (
                <label className="block space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Tally with LG live machine <span className="font-normal text-slate-400">(optional)</span></span>
                  <select value={lgLink} onChange={(event) => setLgLink(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-400">
                    <option value="">Don't match — manual count only</option>
                    {lgMachines.map((m) => (
                      <option key={m.deviceId} value={m.deviceId}>{m.name} · LG cycles {m.cycles.toLocaleString()}</option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">Link this record to a real LG machine to compare their cycle counts.</span>
                </label>
              ) : null}
              <button className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                <FaPlus /> Add Machine
              </button>
            </form>
            <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <span className="font-semibold">Washers</span> are auto-assigned for the washing stage and <span className="font-semibold">Dryers</span> for the drying stage. Add a dryer here to make it selectable when an order moves into drying.
            </p>
          </div>
        ) : null}

        <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${manageMachines ? '' : 'xl:col-span-2'}`}>
          <h3 className="text-lg font-semibold text-slate-900">{usingLg ? 'Manual Machines' : 'Machines'}</h3>
          {usingLg ? (
            <p className="mb-4 mt-1 text-xs text-slate-500">
              Your live counts above come from your real LG machines (shown in <span className="font-semibold">LG Live Machine Status</span>). These are any extra machines you add by hand.
            </p>
          ) : <div className="mb-4" />}
          {machines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              {usingLg
                ? 'No manual machines — your machines are synced from LG above.'
                : (manageMachines ? 'No machines yet. Add your first machine to start assigning job orders.' : 'Ask an administrator to add machines.')}
            </div>
          ) : (
            <div className="space-y-3">
              {machines.map((machine) => {
                const order = orders.find((entry) => entry.id === machine.orderId)
                const remaining = machine.interval - ((machine.cycles || 0) % machine.interval)
                const isEditing = editing?.id === machine.id
                return (
                  <div key={machine._docId ?? machine.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Machine Name</span>
                            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Type</span>
                            <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as MachineRecord['type'] })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                              <option value="Washer">Washer</option>
                              <option value="Dryer">Dryer</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Cycle Count</span>
                            <input type="number" value={editing.cycles} onChange={(e) => setEditing({ ...editing, cycles: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Maint. Interval (cycles)</span>
                            <input type="number" value={editing.interval} onChange={(e) => setEditing({ ...editing, interval: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                          </label>
                          {lgMachines.length > 0 ? (
                            <label className="space-y-1 sm:col-span-2">
                              <span className="text-xs font-semibold text-slate-500">Tally with LG live machine</span>
                              <select value={editing.lgDeviceId} onChange={(e) => setEditing({ ...editing, lgDeviceId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                                <option value="">Don't match — manual count only</option>
                                {lgMachines.map((m) => (
                                  <option key={m.deviceId} value={m.deviceId}>{m.name} · LG cycles {m.cycles.toLocaleString()}</option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setSavePrompt(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                            <FaSave /> Save
                          </button>
                          <button onClick={() => setEditing(null)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                            <FaTimes /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{machine.name}</p>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{machine.type}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(machine.status)}`}>{machine.status}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Cycles: {machine.cycles || 0} • {remaining} until maintenance
                            {machine.status === 'Busy' && order ? ` • Processing ${order.id} (${order.customer})` : ''}
                          </p>
                          {machine.lgDeviceId ? (() => {
                            const lg = lgLinkFor(machine)
                            if (!lg) {
                              return <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Linked to LG · no live data</p>
                            }
                            const diff = (machine.cycles || 0) - lg.cycles
                            const matched = diff === 0
                            return (
                              <p className={`mt-1.5 inline-flex flex-wrap items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${matched ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                LG {lg.name}: {lg.cycles.toLocaleString()} vs yours {(machine.cycles || 0).toLocaleString()} —{' '}
                                {matched ? 'Matched ✓' : `Mismatch (${diff > 0 ? '+' : ''}${diff})`}
                              </p>
                            )
                          })() : null}
                        </div>
                        {editMachines ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startEdit(machine)}
                              title="Edit machine"
                              aria-label="Edit machine"
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                            >
                              <FaPen />
                            </button>
                            <button
                              onClick={() => toggleMaintenance(machine)}
                              disabled={machine.status === 'Busy'}
                              title={machine.status === 'Maintenance' ? 'Set available' : 'Set to maintenance'}
                              aria-label={machine.status === 'Maintenance' ? 'Set available' : 'Set to maintenance'}
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                            >
                              {machine.status === 'Maintenance' ? <FaCheckCircle /> : <FaWrench />}
                            </button>
                            {manageMachines ? (
                              <button
                                onClick={() => setPendingDelete(machine)}
                                disabled={machine.status === 'Busy'}
                                title="Delete machine"
                                aria-label="Delete machine"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
                              >
                                <FaTrash />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <PasswordPromptModal
        isOpen={Boolean(pendingDelete)}
        title="Delete machine"
        message={pendingDelete ? `Remove ${pendingDelete.name}? Enter your password to confirm — this cannot be undone.` : ''}
        confirmLabel="Delete"
        onSubmit={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      <PasswordPromptModal
        isOpen={savePrompt}
        title="Save machine changes"
        message={editing ? `Confirm your password to save changes to ${editing.name.trim() || 'this machine'}.` : ''}
        confirmLabel="Save Changes"
        onSubmit={confirmSaveEdit}
        onClose={() => setSavePrompt(false)}
      />

      <PasswordPromptModal
        isOpen={clearPrompt}
        title="Clear cycle count"
        message="Reset the cycle count of ALL machines to zero. Enter your password to confirm."
        confirmLabel="Clear Cycles"
        onSubmit={clearCycles}
        onClose={() => setClearPrompt(false)}
      />

      <ActivityLogModal
        isOpen={showLog}
        entries={activity.filter((entry) => /machine|cycle/i.test(entry.action))}
        onClose={() => setShowLog(false)}
      />
    </div>
  )
}
