import { FaHourglassHalf } from 'react-icons/fa'
import { isOverdue, timerLabel, type OrderTimer } from '../lib/timers'

/**
 * Countdown chip for an order card.
 *
 * Green while running, amber once it has run out. Purely a countdown — the
 * order never advances on its own when the timer ends; staff decide that.
 */
export function TimerBadge({ timer, now }: { timer: OrderTimer; now: number }) {
  const late = isOverdue(timer, now)
  const noun = timer.stage === 'Washing' ? 'Wash' : 'Dry'
  return (
    <span
      title={`${noun} timer: ${timer.minutes} min`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        late ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      <FaHourglassHalf />
      {noun} {timerLabel(timer, now)}
    </span>
  )
}