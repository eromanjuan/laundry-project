import { useState } from 'react'

/**
 * Run `reset` during render whenever `key` changes.
 *
 * The React-sanctioned way to "reset state when something changes" without an
 * extra commit. Calling it from an effect instead paints once with the previous
 * values still on screen and then re-renders, which the compiler flags as a
 * cascading render.
 *
 * `key` should capture everything the reset depends on (an id, a shop id, an
 * enabled flag), so any real change re-runs it and nothing else does.
 *
 * @example
 * const [alerts, setAlerts] = useState<Alert[]>([])
 * useResetOnChange(shopId, () => setAlerts([]))
 */
export function useResetOnChange(key: string, reset: () => void): void {
  const [prevKey, setPrevKey] = useState(key)
  if (prevKey !== key) {
    setPrevKey(key)
    reset()
  }
}