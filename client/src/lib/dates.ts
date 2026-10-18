/**
 * Order date/time helpers.
 *
 * Orders store when they came in across two fields: `date` (the local calendar
 * day, YYYY-MM-DD) and `timeReceived` (a locale time string such as "07:23 PM").
 * Stage changes instead store one combined stamp via `nowStamp()`. These helpers
 * present both shapes the same way so a job order reads consistently.
 */
import type { OrderRecord } from '../data/seeds'

/** An order as the app sees it — `createdAt` is stamped on by `useCollection`. */
export type DatedOrder = Pick<OrderRecord, 'date' | 'timeReceived'> & { createdAt?: unknown }

/** Resolve an order's calendar date: explicit `date`, else derived from createdAt. */
export function orderDate(order: DatedOrder): string {
  if (order.date) return order.date
  const created = order.createdAt
  if (typeof created === 'number') {
    const offset = new Date(created).getTimezoneOffset()
    return new Date(created - offset * 60_000).toISOString().slice(0, 10)
  }
  return ''
}

/**
 * "Oct 18, 2026" for a YYYY-MM-DD string, or '' when it can't be read.
 *
 * The round-trip check matters: `new Date(2026, 12, 40)` does not throw, it
 * silently rolls over to a real but wrong day. Comparing the constructed date
 * back to the parts rejects "2026-13-40" and "2026-02-31" instead of filing an
 * order under a plausible-looking wrong date.
 */
function dateLabel(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return ''
  const [y, m, d] = parts.map(Number)
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return ''
  if (m < 1 || m > 12 || d < 1 || d > 31) return ''
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return ''
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * The order's receive date *and* time, e.g. "Oct 18, 2026, 07:23 PM".
 *
 * Falls back to whichever half is known, so legacy rows that only stored a time
 * (or only a date) still render something useful.
 */
export function receivedStamp(order: DatedOrder): string {
  const time = (order.timeReceived ?? '').trim()
  const label = dateLabel(orderDate(order))
  if (!label) return time
  return time ? `${label}, ${time}` : label
}