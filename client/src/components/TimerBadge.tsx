import { useEffect, useState } from 'react'
import { FaHourglassHalf } from 'react-icons/fa'
import { isOverdue, timerLabel, type OrderTimer } from '../lib/timers'

/**
 * A single shared clock for every countdown on screen.
 *
 * Each badge asking React for its own interval would mean one timer per card;
 * one 15-second tick for the whole board keeps the re-renders aligned and cheap.
 * Returns the current epoch ms.
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

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