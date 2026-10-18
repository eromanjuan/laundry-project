import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useShopId } from '../context/ShopContext'
import { clampMinutes, DEFAULT_TIMER_MINUTES } from '../lib/timers'

/** Default cycle lengths a shop starts with, in minutes. */
export interface TimerSettings {
  washMinutes: number
  dryMinutes: number
}

export const defaultTimerSettings: TimerSettings = {
  washMinutes: DEFAULT_TIMER_MINUTES,
  dryMinutes: DEFAULT_TIMER_MINUTES,
}

/**
 * Wash / dry cycle defaults, stored in `shops/{shopId}/settings/timers`.
 *
 * These are only the starting point: staff can override the length for an
 * individual order when they move it into Washing or Drying. Changing a default
 * never rewrites a cycle that is already running.
 */
export function useTimerSettings() {
  const shopId = useShopId()
  const [timers, setTimers] = useState<TimerSettings>(defaultTimerSettings)

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !shopId) return
    const unsubscribe = onSnapshot(
      doc(db, 'shops', shopId, 'settings', 'timers'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<TimerSettings>
          setTimers({
            washMinutes: clampMinutes(data.washMinutes),
            dryMinutes: clampMinutes(data.dryMinutes),
          })
        } else {
          setTimers(defaultTimerSettings)
        }
      },
      (error) => console.error('[Firestore] listen(settings/timers) failed:', error),
    )
    return unsubscribe
  }, [shopId])

  const save = async (next: TimerSettings) => {
    const clean: TimerSettings = {
      washMinutes: clampMinutes(next.washMinutes),
      dryMinutes: clampMinutes(next.dryMinutes),
    }
    setTimers(clean)
    if (isFirebaseConfigured && db && shopId) {
      await setDoc(doc(db, 'shops', shopId, 'settings', 'timers'), clean)
    }
  }

  return { timers, save }
}