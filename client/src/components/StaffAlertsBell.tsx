import { useEffect, useRef, useState } from 'react'
import { FaBell, FaCheckDouble, FaTimes } from 'react-icons/fa'
import { alertAccent, useStaffAlerts, type StaffAlertKind } from '../hooks/useStaffAlerts'

const kindLabels: Record<StaffAlertKind, string> = {
  'timer-done': 'Cycle done',
  'order-change': 'Status change',
}

/** Relative age, e.g. "just now", "12m ago", "3h ago". */
function ago(at?: number): string {
  if (!at) return ''
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * Notification bell for staff: a live count of unseen shop alerts, and a panel
 * listing the most recent ones.
 *
 * Opening the panel marks everything visible as seen for this user. Alerts are
 * shop-wide, so one alert is one document shared by all staff — clearing it for
 * one person never hides it from the others.
 */
export function StaffAlertsBell() {
  const { alerts, unreadCount, acknowledge, acknowledgeAll, dismiss } = useStaffAlerts()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click / Escape, the usual behaviour for a dropdown.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    // Opening is the "I've seen it" gesture for the whole visible list.
    if (next) void acknowledgeAll()
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100"
      >
        <FaBell />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {alerts.length > 0 ? (
              <button
                type="button"
                onClick={() => void acknowledgeAll()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                <FaCheckDouble /> Mark all read
              </button>
            ) : null}
          </div>

          {alerts.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <li key={alert._docId ?? alert.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${alertAccent[alert.kind] ?? 'bg-slate-100 text-slate-700'}`}>
                      {kindLabels[alert.kind] ?? 'Alert'}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-[11px] text-slate-400">{ago(alert.createdAt)}</span>
                      <button
                        type="button"
                        onClick={() => void dismiss(alert)}
                        aria-label="Dismiss notification"
                        title="Dismiss"
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{alert.title}</p>
                  {alert.body ? <p className="mt-0.5 text-xs text-slate-600">{alert.body}</p> : null}
                  {!alert.acknowledgedBy?.length ? (
                    <button
                      type="button"
                      onClick={() => void acknowledge(alert)}
                      className="mt-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}