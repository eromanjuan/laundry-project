import { useEffect, useState } from 'react'

/**
 * A single shared clock for every countdown on screen.
 *
 * Each badge asking React for its own interval would mean one timer per card;
 * one 15-second tick for the whole board keeps the re-renders aligned and cheap.
 * Returns the current epoch ms.
 *
 * Lives here rather than beside `<TimerBadge>` so that module exports only a
 * component, which keeps React Fast Refresh working.
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}