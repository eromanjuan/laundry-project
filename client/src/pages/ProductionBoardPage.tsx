import { useEffect, useMemo, useRef, useState } from 'react'
import { FaSearch, FaHistory, FaTimes, FaCopy, FaExternalLinkAlt } from 'react-icons/fa'
import { ProductionCard, CARD_FIELDS } from '../components/ProductionCard'
import { ProductionColumn } from '../components/ProductionColumn'
import { OrderDetailsModal, type WasherOption } from '../components/OrderDetailsModal'
import { ActivityLogModal } from '../components/ActivityLogModal'
import { RevertStageModal } from '../components/RevertStageModal'
import { CollectPaymentModal, type PaymentResult } from '../components/CollectPaymentModal'
import { SummaryStat } from '../components/SummaryStat'
import { useCollection, type WithDocId } from '../hooks/useCollection'
import { useLgStatus } from '../hooks/useLgStatus'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'
import { useBusiness } from '../hooks/useBusiness'
import { usePricing } from '../hooks/usePricing'
import { usePaymentSettings } from '../hooks/usePaymentSettings'
import { seedActivity, seedMachines, seedOrders, todayISO, nowStamp, type ActivityRecord, type MachineRecord, type OrderRecord } from '../data/seeds'
import { findFreeWasher, findFreeDryer, oldestPending } from '../lib/machines'
import { publishStatus, trackUrl, trackKey } from '../lib/tracking'
import type { PaymentProof } from '../lib/paymentProof'
import { printReceipt } from '../lib/printReceipt'
import { buildOrderReceipt, buildOrderClaimStub, trackQrDataUrl } from '../lib/receipts'

const statuses = ['Pending', 'Washing', 'Drying', 'Ready', 'Claimed']
// Stage filter — mirrors the workflow columns.
const stageFilters = ['All', 'Pending', 'Washing', 'Drying', 'Ready', 'Claimed']

/** Colour chip per workflow column. */
const columnAccent: Record<string, string> = {
  Pending: 'bg-rose-100 text-rose-700',
  Washing: 'bg-amber-100 text-amber-700',
  Drying: 'bg-orange-100 text-orange-700',
  Ready: 'bg-emerald-100 text-emerald-700',
  Claimed: 'bg-blue-100 text-blue-700',
}

/** Parse a peso string ("₱1,250") to a number. */
function parsePeso(value?: string): number {
  return Number.parseFloat((value ?? '').replace(/[^\d.]/g, '')) || 0
}
/** Format a number as a peso string. */
function peso(n: number): string {
  return `₱${(Math.round(n * 100) / 100).toLocaleString('en-PH')}`
}

/** Creation time (ms) for FIFO ordering; 0 when unknown. */
function createdMs(job: OrderRecord & WithDocId): number {
  const created = (job as unknown as Record<string, unknown>).createdAt
  return typeof created === 'number' ? created : 0
}

/** Resolve an order's calendar date: explicit `date`, else derived from createdAt. */
function orderDate(job: OrderRecord & WithDocId): string {
  if (job.date) return job.date
  const created = (job as unknown as Record<string, unknown>).createdAt
  if (typeof created === 'number') {
    const offset = new Date(created).getTimezoneOffset()
    return new Date(created - offset * 60_000).toISOString().slice(0, 10)
  }
  return ''
}

export function ProductionBoardPage() {
  const { data: jobs, update } = useCollection<OrderRecord>('orders', seedOrders)
  const { data: machines, update: updateMachine } = useCollection<MachineRecord>('machines', seedMachines)
  const { data: activity, add: addActivity } = useCollection<ActivityRecord>('activity', seedActivity)
  const { data: paymentProofs, update: updateProof } = useCollection<PaymentProof>('paymentProofs', [])
  const lgStatus = useLgStatus()
  const { user, verifyPassword } = useAuth()
  const { logoUrl } = useBranding()
  const { business } = useBusiness()
  const { pricing } = usePricing()
  const { payment } = usePaymentSettings()
  const [showLog, setShowLog] = useState(false)
  const [query, setQuery] = useState('')

  const logActivity = (action: string) => {
    void addActivity({ id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, action, user: user?.name ?? 'Unknown', at: nowStamp() })
  }
  // Stage filter (workflow columns) + a secondary detail filter.
  const [stageFilter, setStageFilter] = useState('All')
  const [serviceFilter, setServiceFilter] = useState('All')
  const [loadTypeFilter, setLoadTypeFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [addOnFilter, setAddOnFilter] = useState('All')
  const [fromDate, setFromDate] = useState(todayISO())
  const [toDate, setToDate] = useState(todayISO())
  // Which fields show on each card — persisted so the choice sticks.
  const [visibleFields, setVisibleFields] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('board.cardFields')
      if (saved) return JSON.parse(saved) as string[]
    } catch {
      /* ignore */
    }
    return CARD_FIELDS.map((f) => f.key)
  })
  const toggleField = (key: string) =>
    setVisibleFields((current) => {
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
      try {
        localStorage.setItem('board.cardFields', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  const [selectedJob, setSelectedJob] = useState<(OrderRecord & WithDocId) | null>(null)
  const [codeJob, setCodeJob] = useState<{ job: OrderRecord & WithDocId; url: string; qr?: string } | null>(null)
  const [payJob, setPayJob] = useState<(OrderRecord & WithDocId) | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  // A pending backward move awaiting reason + password confirmation.
  const [pendingRevert, setPendingRevert] = useState<
    { job: OrderRecord & WithDocId; target: string; closeModal: boolean } | null
  >(null)
  const dragId = useRef<string | null>(null)

  const filteredJobs = useMemo(() => {
    const search = query.trim().toLowerCase()
    const svc = (job: OrderRecord) => (job.service ?? '').toLowerCase()

    return jobs
      .filter((job) => {
        const date = orderDate(job)
        // Only apply date bounds to orders that have a resolvable date.
        const matchesDate = !date || ((!fromDate || date >= fromDate) && (!toDate || date <= toDate))
        const matchesStage = stageFilter === 'All' || job.status === stageFilter
        const matchesService = serviceFilter === 'All' || svc(job).includes(serviceFilter.toLowerCase())
        const matchesLoadType = loadTypeFilter === 'All' || svc(job).includes(loadTypeFilter.toLowerCase())
        const matchesPriority = priorityFilter === 'All' || job.priority === priorityFilter
        const matchesAddOn = addOnFilter === 'All' || (job.addOns ?? '').toLowerCase().includes(addOnFilter.toLowerCase())
        const matchesSearch = !search || [job.id, job.customer].join(' ').toLowerCase().includes(search)
        return matchesDate && matchesStage && matchesService && matchesLoadType && matchesPriority && matchesAddOn && matchesSearch
      })
      // Oldest order first (first come, first served); job number breaks ties.
      .sort((a, b) => {
        const byTime = createdMs(a) - createdMs(b)
        if (byTime !== 0) return byTime
        const num = (id: string) => Number.parseInt(String(id).replace(/\D/g, ''), 10) || 0
        return num(a.id) - num(b.id)
      })
  }, [jobs, query, stageFilter, serviceFilter, loadTypeFilter, priorityFilter, addOnFilter, fromDate, toDate])

  const groupedJobs = statuses.reduce((acc, status) => {
    acc[status] = filteredJobs.filter((job) => job.status === status)
    return acc
  }, {} as Record<string, typeof filteredJobs>)

  const machineAvailable = Boolean(findFreeWasher(machines))
  const dryerAvailable = Boolean(findFreeDryer(machines))

  // Washers free right now — manual (Available) + real LG washers (Standby) — for
  // the "where to put the laundry" picker in the order modal (washing stage).
  const washerOptions = useMemo<WasherOption[]>(() => {
    const opts: WasherOption[] = []
    machines
      .filter((m) => m.type === 'Washer' && m.status === 'Available')
      .forEach((m) => opts.push({ name: m.name, source: 'Manual' }))
    ;(lgStatus.machines ?? [])
      .filter((m) => m.type === 'Washer' && m.status === 'Standby')
      .forEach((m) => { if (!opts.some((o) => o.name === m.name)) opts.push({ name: m.name, source: 'LG' }) })
    return opts
  }, [machines, lgStatus])

  // Dryers free right now — same idea, used by the drying stage picker.
  const dryerOptions = useMemo<WasherOption[]>(() => {
    const opts: WasherOption[] = []
    machines
      .filter((m) => m.type === 'Dryer' && m.status === 'Available')
      .forEach((m) => opts.push({ name: m.name, source: 'Manual' }))
    ;(lgStatus.machines ?? [])
      .filter((m) => m.type === 'Dryer' && m.status === 'Standby')
      .forEach((m) => { if (!opts.some((o) => o.name === m.name)) opts.push({ name: m.name, source: 'LG' }) })
    return opts
  }, [machines, lgStatus])

  // Self-heal stale machine links: a manual machine should only stay Busy while
  // it's actually running its job (a washer during Washing, a dryer during
  // Drying). If the linked order has moved on (Ready/Claimed/Pending/deleted) or
  // is assigned elsewhere, free the machine so it stops showing a false "Busy".
  useEffect(() => {
    machines.forEach((m) => {
      if (m.status !== 'Busy' || m.monitorMode === 'Auto') return
      const order = jobs.find((j) => j.id === m.orderId)
      const activeStatus = m.type === 'Washer' ? 'Washing' : 'Drying'
      const stillRunning = Boolean(order && order.status === activeStatus && order.assigned === m.name)
      if (!stillRunning) void updateMachine(m, { status: 'Available', orderId: '' })
    })
    // updateMachine is stable enough; re-run only when machines/jobs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machines, jobs])

  /** Move an order to a different machine, keeping manual machine links consistent. */
  const reassignMachine = (job: OrderRecord & WithDocId, name: string) => {
    if (!name || name === job.assigned) return
    const previous = machines.find((m) => m.orderId === job.id)
    // A Washing/Drying job has a counted cycle to carry over to the new machine.
    const cycleCounted = (job.status === 'Washing' || job.status === 'Drying') && Boolean(previous)
    if (previous && previous.name !== name) {
      // Move the cycle off the machine we're leaving — it didn't finish this wash.
      void updateMachine(previous, {
        status: 'Available',
        orderId: '',
        cycles: cycleCounted ? Math.max(0, (previous.cycles || 0) - 1) : previous.cycles,
      })
    }
    const next = machines.find((m) => m.name === name)
    if (next) {
      // The machine now doing the wash is the one that counts the cycle.
      void updateMachine(next, {
        status: 'Busy',
        orderId: job.id,
        cycles: cycleCounted ? (next.cycles || 0) + 1 : next.cycles,
      })
    }
    void update(job, { assigned: name })
    logActivity(`Reassigned ${job.id} to ${name}`)
  }

  /**
   * Single source of truth for a stage change — used by drag-drop AND the
   * details-modal buttons. Moves work in either direction (to fix mistakes) and
   * keep machine assignments + timestamps consistent. Returns an error message
   * when blocked, or null on success.
   */
  /** Free the washer that just finished, pulling the oldest Pending job into it. */
  const releaseWasher = (washer: MachineRecord & WithDocId, excludeJobId: string) => {
    const nextPending = oldestPending(jobs, excludeJobId)
    if (nextPending) {
      void updateMachine(washer, { status: 'Busy', orderId: nextPending.id, cycles: (washer.cycles || 0) + 1 })
      void update(nextPending, { status: 'Washing', assigned: washer.name, startedAt: nowStamp() })
      void publishStatus(nextPending.id, 'Washing')
    } else {
      void updateMachine(washer, { status: 'Available', orderId: '' })
    }
  }

  const moveOrder = (job: OrderRecord & WithDocId, target: string, preferredWasher?: string): string | null => {
    if (job.status === target) return null
    const ownMachine = machines.find((entry) => entry.orderId === job.id)

    if (target === 'Pending') {
      if (ownMachine) void updateMachine(ownMachine, { status: 'Available', orderId: '' })
      void update(job, { status: 'Pending', assigned: 'Unassigned', startedAt: '', releasedAt: '' })
      return null
    }

    if (target === 'Washing') {
      // Reuse a washer already holding this job; otherwise claim a free one —
      // preferring the one the cashier picked, falling back to the first free.
      let washer = ownMachine && ownMachine.type === 'Washer' ? ownMachine : undefined
      if (!washer) {
        const chosen = preferredWasher
          ? machines.find((m) => m.type === 'Washer' && m.name === preferredWasher && m.status === 'Available')
          : null
        washer = chosen ?? findFreeWasher(machines) ?? undefined
        if (!washer) return 'No available washer — the job stays put until one frees up.'
      }
      // Reverting from Drying: let go of the dryer that was holding this job.
      if (ownMachine && ownMachine.type === 'Dryer') void updateMachine(ownMachine, { status: 'Available', orderId: '' })
      // Occupy the washer if it isn't already this job's machine.
      if (washer !== ownMachine) void updateMachine(washer, { status: 'Busy', orderId: job.id, cycles: (washer.cycles || 0) + 1 })
      void update(job, { status: 'Washing', assigned: washer.name, startedAt: job.startedAt || nowStamp(), releasedAt: '' })
      return null
    }

    if (target === 'Drying') {
      // Washing done → the laundry moves into a dryer. Need a free dryer first.
      let dryer = ownMachine && ownMachine.type === 'Dryer' ? ownMachine : undefined
      if (!dryer) {
        dryer = findFreeDryer(machines) ?? undefined
        if (!dryer) return 'No available dryer — the laundry stays in washing until one frees up.'
      }
      // Free the washer that just finished (and pull the next Pending job into it).
      if (ownMachine && ownMachine.type === 'Washer') releaseWasher(ownMachine, job.id)
      // Occupy the dryer if it isn't already this job's machine.
      if (dryer !== ownMachine) void updateMachine(dryer, { status: 'Busy', orderId: job.id, cycles: (dryer.cycles || 0) + 1 })
      void update(job, { status: 'Drying', assigned: dryer.name, releasedAt: '' })
      return null
    }

    if (target === 'Ready') {
      if (ownMachine) {
        // Washing → Ready directly (drying skipped): keep the washer busy with the
        // next job. Drying → Ready: just free the dryer.
        if (ownMachine.type === 'Washer') releaseWasher(ownMachine, job.id)
        else void updateMachine(ownMachine, { status: 'Available', orderId: '' })
      }
      void update(job, { status: 'Ready', releasedAt: '' })
      return null
    }

    if (target === 'Claimed') {
      if (job.paymentStatus !== 'Paid') return 'The order must be fully paid before it can be claimed.'
      // Free any machine still holding this job (e.g. claimed straight from washing).
      if (ownMachine) {
        if (ownMachine.type === 'Washer') releaseWasher(ownMachine, job.id)
        else void updateMachine(ownMachine, { status: 'Available', orderId: '' })
      }
      void update(job, { status: 'Claimed', releasedAt: nowStamp() })
      return null
    }

    return 'Invalid move.'
  }

  /** True when `target` is an earlier stage than the job's current one. */
  const isBackwardMove = (job: OrderRecord & WithDocId, target: string) =>
    statuses.indexOf(target) >= 0 &&
    statuses.indexOf(job.status) >= 0 &&
    statuses.indexOf(target) < statuses.indexOf(job.status)

  const attemptMove = (job: OrderRecord & WithDocId, target: string, closeModal = false, preferredWasher?: string) => {
    // Moving an order back a stage is easy to do by accident (a stray drag), so
    // require a reason + password before it goes through.
    if (isBackwardMove(job, target)) {
      setPendingRevert({ job, target, closeModal })
      return
    }
    const from = job.status
    const error = moveOrder(job, target, preferredWasher)
    if (error) {
      setFeedback({ tone: 'error', text: error })
    } else {
      logActivity(`${job.id}: ${from} → ${target}`)
      void publishStatus(job.id, target)
      setFeedback(null)
      if (closeModal) setSelectedJob(null)
    }
  }

  /** Verify the password, apply the held-back move, and log the reason. */
  const confirmRevert = async (reason: string, password: string): Promise<string | null> => {
    if (!pendingRevert) return 'Nothing to confirm.'
    const ok = await verifyPassword(password)
    if (!ok) return 'Incorrect password. Please try again.'
    const { job, target, closeModal } = pendingRevert
    const from = job.status
    const error = moveOrder(job, target)
    if (error) return error
    logActivity(`${job.id}: reverted ${from} → ${target} — reason: ${reason}`)
    void publishStatus(job.id, target)
    setFeedback({ tone: 'success', text: `${job.id} moved back to ${target}. The reason has been logged.` })
    setPendingRevert(null)
    if (closeModal) setSelectedJob(null)
    return null
  }

  const handleDrop = (target: string) => {
    const id = dragId.current
    dragId.current = null
    if (!id) return
    const job = jobs.find((entry) => entry.id === id)
    if (job) attemptMove(job, target)
  }

  // Settle the balance so the order can be released. Keeps the modal open, updated.
  // Latest unreviewed GCash proof uploaded by the customer for an order.
  const proofFor = (order: OrderRecord & WithDocId) => {
    const key = trackKey(order.id)
    return (
      paymentProofs
        .filter((p) => p.jobKey === key && !p.reviewed)
        .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))[0] ?? null
    )
  }

  // Staff confirms a customer's uploaded GCash proof → settle the balance as GCash.
  const confirmGcashProof = (order: OrderRecord & WithDocId) => {
    const dueNum = parsePeso(order.balance ?? order.amount)
    const newGcash = parsePeso(order.gcashPaid) + dueNum
    const newCash = parsePeso(order.cashPaid)
    const methods: string[] = []
    if (newCash > 0) methods.push('Cash')
    if (newGcash > 0) methods.push('GCash')
    const patch: Partial<OrderRecord> = {
      paymentStatus: 'Paid',
      amountPaid: order.amount,
      balance: '₱0',
      gcashPaid: peso(newGcash),
      paymentMethod: methods.join('+') || 'GCash',
    }
    void update(order, patch)
    void publishStatus(order.id, order.status, { paymentStatus: 'Paid', balance: '₱0' })
    paymentProofs.filter((p) => p.jobKey === trackKey(order.id) && !p.reviewed).forEach((p) => void updateProof(p, { reviewed: true }))
    logActivity(`${order.id}: GCash payment confirmed from uploaded proof (${peso(dueNum)})`)
    setSelectedJob((current) => (current && current.id === order.id ? { ...current, ...patch } : current))
    setFeedback({ tone: 'success', text: `GCash payment confirmed for ${order.id}. You can now release it.` })
  }

  // Open the Cash / GCash / Split collection modal.
  const handlePay = (job: OrderRecord & WithDocId) => setPayJob(job)

  // Apply a collected payment (full or partial): update paid/balance + method.
  const confirmCollect = (result: PaymentResult) => {
    const job = payJob
    if (!job) return
    const totalNum = parsePeso(job.amount)
    const applied = result.cash + result.gcash
    const newPaidNum = Math.min(totalNum, parsePeso(job.amountPaid) + applied)
    const newBalanceNum = Math.max(0, totalNum - newPaidNum)
    const newCash = parsePeso(job.cashPaid) + result.cash
    const newGcash = parsePeso(job.gcashPaid) + result.gcash
    const payStatus = newBalanceNum <= 0 ? 'Paid' : 'Partial'
    const methods: string[] = []
    if (newCash > 0) methods.push('Cash')
    if (newGcash > 0) methods.push('GCash')
    const patch: Partial<OrderRecord> = {
      paymentStatus: payStatus,
      amountPaid: peso(newPaidNum),
      balance: peso(newBalanceNum),
      cashPaid: peso(newCash),
      gcashPaid: peso(newGcash),
      paymentMethod: methods.join('+') || result.method,
    }
    void update(job, patch)
    void publishStatus(job.id, job.status, { paymentStatus: payStatus, balance: peso(newBalanceNum) })
    logActivity(`${job.id}: ${peso(applied)} collected via ${result.method} — balance ${peso(newBalanceNum)}`)
    setSelectedJob((current) => (current && current.id === job.id ? { ...current, ...patch } : current))
    setPayJob(null)
    setFeedback({
      tone: 'success',
      text: newBalanceNum <= 0
        ? `${job.id} fully paid. You can now release it.`
        : `${peso(applied)} collected for ${job.id}. Remaining balance ${peso(newBalanceNum)}.`,
    })
  }

  // Reprints (always a COPY; provisional until fully paid) built from the order.
  const reprintReceipt = async (job: OrderRecord & WithDocId) => {
    const qr = await trackQrDataUrl(job.id)
    printReceipt(buildOrderReceipt(job, business, logoUrl, qr, true))
    logActivity(`${job.id}: receipt reprinted`)
  }
  const reprintClaim = async (job: OrderRecord & WithDocId) => {
    const qr = await trackQrDataUrl(job.id)
    printReceipt(buildOrderClaimStub(job, business, logoUrl, qr, true))
    logActivity(`${job.id}: claim stub reprinted`)
  }

  // Open the scannable tracking code for a card's barcode icon.
  const showCode = async (job: OrderRecord & WithDocId) => {
    const url = trackUrl(job.id)
    setCodeJob({ job, url })
    const qr = await trackQrDataUrl(job.id)
    setCodeJob((current) => (current && current.job.id === job.id ? { ...current, qr } : current))
  }
  const copyCodeLink = (url: string) => {
    void navigator.clipboard?.writeText(url).then(
      () => setFeedback({ tone: 'success', text: 'Tracking link copied.' }),
      () => setFeedback({ tone: 'error', text: 'Could not copy the link.' }),
    )
  }

  // Release an unpaid order — it's claimed but its balance stays outstanding.
  const handleReleaseUnpaid = (job: OrderRecord & WithDocId) => {
    void update(job, { status: 'Claimed', releasedAt: nowStamp() })
    void publishStatus(job.id, 'Claimed')
    logActivity(`${job.id}: released UNPAID (balance ${job.amount})`)
    setSelectedJob(null)
    setFeedback({ tone: 'success', text: `${job.id} released with an outstanding balance of ${job.amount}. Collect it anytime from Claim Laundry.` })
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLog(true)}
              className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              <FaHistory /> View Log
            </button>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-sm text-blue-100">Active Workload</p>
              <p className="text-xl font-semibold">{filteredJobs.length} jobs</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryStat label="Pending (no machine)" value={`${groupedJobs['Pending'].length} jobs`} accent="bg-rose-100 text-rose-700" />
        <SummaryStat label="In Washing" value={`${groupedJobs['Washing'].length} jobs`} accent="bg-amber-100 text-amber-700" />
        <SummaryStat label="In Drying" value={`${groupedJobs['Drying'].length} jobs`} accent="bg-orange-100 text-orange-700" />
        <SummaryStat label="Ready for Claim" value={`${groupedJobs['Ready'].length} jobs`} accent="bg-emerald-100 text-emerald-700" />
        <SummaryStat label="Completed" value={`${groupedJobs['Claimed'].length} jobs`} accent="bg-blue-100 text-blue-700" />
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
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">From</span>
                <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="border-none bg-transparent outline-none" />
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <span className="font-semibold text-slate-600">To</span>
                <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="border-none bg-transparent outline-none" />
              </label>
              <button
                type="button"
                onClick={() => { setFromDate(todayISO()); setToDate(todayISO()) }}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Today
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {stageFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStageFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    stageFilter === filter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detail filters — service, load type, priority, additional option. */}
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Service</span>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400">
              <option value="All">All services</option>
              {pricing.services.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Load type</span>
            <select value={loadTypeFilter} onChange={(e) => setLoadTypeFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400">
              <option value="All">All load types</option>
              {pricing.loadTypes.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Priority</span>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400">
              <option value="All">All priorities</option>
              <option value="Express">Express</option>
              <option value="Normal">Normal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Additional option</span>
            <select value={addOnFilter} onChange={(e) => setAddOnFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400">
              <option value="All">Any option</option>
              {pricing.addOns.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </label>
        </div>

        {/* Choose which fields appear on each order card. */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">Card fields</p>
          <div className="flex flex-wrap gap-2">
            {CARD_FIELDS.map((field) => {
              const on = visibleFields.includes(field.key)
              return (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => toggleField(field.key)}
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    on ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {field.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {feedback ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="rounded-lg px-2 py-1 text-xs transition hover:bg-white/60">Dismiss</button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              accent={columnAccent[status] ?? 'bg-slate-100 text-slate-700'}
            >
              {groupedJobs[status].map((job) => (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => { dragId.current = job.id }}
                  onClick={() => setSelectedJob(job)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <ProductionCard job={job} onShowCode={() => showCode(job)} fields={visibleFields} />
                </div>
              ))}
            </ProductionColumn>
          </div>
        ))}
      </div>

      <OrderDetailsModal
        order={selectedJob}
        machineAvailable={machineAvailable}
        dryerAvailable={dryerAvailable}
        washerOptions={washerOptions}
        dryerOptions={dryerOptions}
        onClose={() => setSelectedJob(null)}
        onStart={(job, washer) => attemptMove(job, 'Washing', true, washer)}
        onDry={(job) => attemptMove(job, 'Drying', true)}
        onReady={(job) => attemptMove(job, 'Ready', true)}
        onClaim={(job) => attemptMove(job, 'Claimed', true)}
        onPay={handlePay}
        onReleaseUnpaid={handleReleaseUnpaid}
        onReassign={reassignMachine}
        onReprintReceipt={reprintReceipt}
        onReprintClaim={reprintClaim}
        paymentProof={selectedJob ? proofFor(selectedJob) : null}
        onConfirmGcashProof={confirmGcashProof}
      />

      <CollectPaymentModal
        isOpen={Boolean(payJob)}
        due={payJob ? parsePeso(payJob.balance ?? payJob.amount) : 0}
        label={payJob ? `${payJob.id} • ${payJob.customer}` : ''}
        gcash={payment}
        onClose={() => setPayJob(null)}
        onConfirm={confirmCollect}
      />

      {/* Scannable tracking code popover for a card's barcode icon. */}
      {codeJob ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm" onClick={() => setCodeJob(null)}>
          <div className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Track {codeJob.job.id}</h3>
              <button onClick={() => setCodeJob(null)} className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"><FaTimes /></button>
            </div>
            {codeJob.qr ? (
              <img src={codeJob.qr} alt="Tracking QR code" className="mx-auto mt-4 h-52 w-52" />
            ) : (
              <div className="mx-auto mt-4 flex h-52 w-52 items-center justify-center text-sm text-slate-400">Generating…</div>
            )}
            <p className="mt-3 break-all text-xs text-slate-500">{codeJob.url}</p>
            <div className="mt-4 grid gap-2">
              <button onClick={() => copyCodeLink(codeJob.url)} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                <FaCopy /> Copy link
              </button>
              <a href={codeJob.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <FaExternalLinkAlt /> Open in new tab
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <RevertStageModal
        isOpen={Boolean(pendingRevert)}
        fromStage={pendingRevert?.job.status ?? ''}
        toStage={pendingRevert?.target ?? ''}
        jobLabel={pendingRevert?.job.id ?? ''}
        onConfirm={confirmRevert}
        onClose={() => setPendingRevert(null)}
      />

      <ActivityLogModal isOpen={showLog} entries={activity} onClose={() => setShowLog(false)} />
    </div>
  )
}
