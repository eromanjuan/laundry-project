import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { FaTshirt, FaWind, FaBoxOpen, FaCheckCircle, FaClock, FaHourglassHalf, FaBell, FaBellSlash } from 'react-icons/fa'
import { db, isFirebaseConfigured } from '../lib/firebase'

/** Public, sign-in-free laundry status page reached by scanning a receipt QR. */

interface TrackingDoc {
  id: string
  status: string
  updatedAt?: number
}

const STAGES = [
  { key: 'Pending', label: 'Received', hint: 'We have your laundry — it will be washed shortly.', icon: FaHourglassHalf },
  { key: 'Washing', label: 'Washing', hint: 'Your laundry is in the wash.', icon: FaTshirt },
  { key: 'Drying', label: 'Drying', hint: 'Your laundry is drying.', icon: FaWind },
  { key: 'Ready', label: 'Ready for Pickup', hint: 'All done! Your laundry is ready to be claimed.', icon: FaBoxOpen },
  { key: 'Claimed', label: 'Claimed', hint: 'This order has been picked up. Thank you!', icon: FaCheckCircle },
] as const

/** Some older orders use 'Received' for the first stage — treat it as Pending. */
function normalize(status: string) {
  if (status === 'Received') return 'Pending'
  return status
}

/** Friendly notification body for a given stage. */
function stageMessage(status: string) {
  const stage = STAGES.find((s) => s.key === normalize(status))
  return stage ? `${stage.label} — ${stage.hint}` : `Status: ${status}`
}

/** True where the browser can raise notifications via a service worker. */
const notifySupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator

type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied'

export function TrackOrderPage() {
  const { id = '' } = useParams()
  const [record, setRecord] = useState<TrackingDoc | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'offline'>('loading')
  const [notify, setNotify] = useState<NotifyState>(notifySupported ? (Notification.permission as NotifyState) : 'unsupported')
  // Last status we've already shown, so we only notify on real changes (never on
  // the first load).
  const lastStatus = useRef<string | null>(null)

  // Register the service worker once — needed for showNotification() on mobile.
  useEffect(() => {
    if (notifySupported) navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  const showUpdate = (status: string) => {
    if (!notifySupported || Notification.permission !== 'granted') return
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification('Laundry update', {
          body: stageMessage(status),
          icon: '/brand-logo.png',
          badge: '/brand-logo.png',
          tag: `laundry-${id}`,
          data: { url: window.location.href },
        }),
      )
      .catch(() => {})
  }

  const enableNotifications = async () => {
    if (!notifySupported) return
    const result = await Notification.requestPermission()
    setNotify(result as NotifyState)
  }

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setState('offline')
      return
    }
    const unsubscribe = onSnapshot(
      doc(db, 'tracking', id),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as TrackingDoc
          // Fire a notification only when the status actually changes (not on the
          // initial load and not on unrelated field updates).
          if (lastStatus.current !== null && lastStatus.current !== data.status) {
            showUpdate(data.status)
          }
          lastStatus.current = data.status
          setRecord(data)
          setState('ready')
        } else {
          setState('notfound')
        }
      },
      () => setState('notfound'),
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const status = record ? normalize(record.status) : ''
  const currentIndex = STAGES.findIndex((s) => s.key === status)
  const active = currentIndex >= 0 ? STAGES[currentIndex] : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-100/60">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">Laundry Status</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Track your order</h1>
        </div>

        {state === 'loading' ? (
          <div className="mt-8 flex flex-col items-center gap-3 py-8 text-slate-500">
            <FaClock className="animate-pulse text-3xl text-blue-400" />
            <p className="text-sm">Checking the latest status…</p>
          </div>
        ) : null}

        {state === 'offline' ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-700">
            Live tracking isn't available right now. Please check with the store.
          </div>
        ) : null}

        {state === 'notfound' ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            We couldn't find an order for <span className="font-semibold text-slate-700">#{id}</span>. Double-check the code on your receipt, or ask the store.
          </div>
        ) : null}

        {state === 'ready' && record ? (
          <>
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center">
              <p className="text-sm text-slate-500">Job Order</p>
              <p className="text-2xl font-bold text-slate-900">{record.id}</p>
              {active ? (
                <>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white">
                    <active.icon /> {active.label}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">{active.hint}</p>
                </>
              ) : (
                <p className="mt-3 text-sm font-semibold text-slate-700">{record.status}</p>
              )}
            </div>

            {/* Stage progress */}
            <ol className="mt-6 space-y-3">
              {STAGES.map((stage, index) => {
                const done = currentIndex >= 0 && index < currentIndex
                const current = index === currentIndex
                return (
                  <li key={stage.key} className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                        current
                          ? 'bg-blue-600 text-white'
                          : done
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {done ? <FaCheckCircle /> : <stage.icon />}
                    </span>
                    <span className={`text-sm font-semibold ${current ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {stage.label}
                    </span>
                  </li>
                )
              })}
            </ol>

            {/* Notify-me — while this page stays open we raise a phone notification
                on every status change. */}
            {notify === 'granted' ? (
              <p className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <FaBell /> Notifications on — keep this page open to get updates.
              </p>
            ) : notify === 'default' ? (
              <button
                onClick={enableNotifications}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <FaBell /> Notify me when my laundry updates
              </button>
            ) : notify === 'denied' ? (
              <p className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <FaBellSlash /> Notifications are blocked — enable them in your browser settings.
              </p>
            ) : null}

            {record.updatedAt ? (
              <p className="mt-4 text-center text-xs text-slate-400">
                Last updated {new Date(record.updatedAt).toLocaleString()}
              </p>
            ) : null}
            <p className="mt-1 text-center text-xs text-slate-400">This page updates automatically.</p>
          </>
        ) : null}
      </div>
    </div>
  )
}
