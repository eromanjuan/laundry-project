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

/** "Oct 18, 2026" for a YYYY-MM-DD string, or '' when it can't be read. */
function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString([], {
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