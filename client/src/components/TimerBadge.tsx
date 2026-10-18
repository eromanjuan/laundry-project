import { useEffect, useState } from 'react'
import { FaHourglassHalf } from 'react-icons/fa'
import { elapsedPercent, isOverdue, timerLabel, totalLabel, type OrderTimer } from '../lib/timers'

/** One-second clock. */
const TICK_MS = 1_000

/**
 * Re-render once a second while a cycle is running.
 *
 * The tick lives in the badge rather than in the board on purpose: a shared
 * board-level clock would re-render every card, every filter and the search
 * box once a second — noticeable while someone is typing. Each badge re-renders
 * only itself, and only the handful of cards actually mid-cycle pay for it.
 */
function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

/**
 * Live wash/dry countdown for an order card.
 *
 * Shows the time remaining (ticking every second), the stage's full length, and
 * a bar that fills as the cycle runs so progress is readable at a glance. Amber
 * while running, red once the time is up.
 *
 * Purely a countdown — when it ends it notifies staff and the customer, but the
 * order never advances on its own. Staff move it on.
 */
export function TimerBadge({ timer, compact = false }: { timer: OrderTimer; compact?: boolean }) {
  const now = useTick(true)
  const late = isOverdue(timer, now)
  const noun = timer.stage === 'Washing' ? 'Wash' : 'Dry'
  const percent = elapsedPercent(timer, now)

  return (
    <div
      className={`rounded-xl px-2.5 py-1.5 ${late ? 'bg-rose-50' : 'bg-amber-50'}`}
      title={
        late
          ? `${noun} time is up — ${timerLabel(timer, now)}`
          : `${noun} timer: ${totalLabel(timer)} total, ${timerLabel(timer, now)} left`
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${late ? 'text-rose-700' : 'text-amber-700'}`}
        >
          <FaHourglassHalf className={late ? '' : 'animate-pulse'} />
          {noun}
        </span>
        <span
          aria-live="off"
          className={`font-mono text-sm font-bold tabular-nums ${late ? 'text-rose-700' : 'text-amber-800'}`}
        >
          {timerLabel(timer, now)}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
            late ? 'bg-rose-500' : percent > 80 ? 'bg-orange-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percent.toFixed(2)}%` }}
        />
      </div>

      {compact ? null : (
        <p className={`mt-1 text-[10px] ${late ? 'text-rose-600' : 'text-amber-700/80'}`}>
          {late ? 'Time is up — move it on' : `${Math.round(percent)}% • ${totalLabel(timer)} total`}
        </p>
      )}
      {/* Screen readers get the state, but not a per-second announcement. */}
      <span className="sr-only">
        {noun} timer, {late ? 'finished' : `${timerLabel(timer, now)} remaining`}
      </span>
    </div>
  )
}