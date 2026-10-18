/**
 * Wash / dry cycle timers.
 *
 * When an order moves into Washing or Drying it gets a countdown. The duration
 * defaults to the shop's configured value (40 minutes out of the box) but staff
 * can override it per order at the moment they start the cycle.
 *
 * The timer is deliberately *advisory*: when it reaches zero it raises an alert
 * for staff and a notification for the customer, but it never moves the order
 * on its own. A timer is a reminder set by a person, so it is not authoritative
 * about the physical cycle having finished — a wrong timer must never silently
 * skip a real wash.
 *
 * Fields live on the order document itself (no extra read to render a card):
 *   washTimerMinutes / washTimerEndsAt / washTimerNotifiedAt
 *   dryTimerMinutes  / dryTimerEndsAt  / dryTimerNotifiedAt
 */

/** The two stages that run a countdown. */
export type TimerStage = 'Washing' | 'Drying'

/** Out-of-the-box cycle length when a shop has not configured its own. */
export const DEFAULT_TIMER_MINUTES = 40

/** Longest single cycle a staff member may set from the UI (12 hours). */
export const MAX_TIMER_MINUTES = 12 * 60

/**
 * The order fields the timer helpers read.
 *
 * Kept structural (and optional) so both a full `OrderRecord` and the smaller
 * shape a board card passes in satisfy it. All state lives on the order itself,
 * so rendering a countdown costs no extra read.
 */
export interface TimerSource {
  /** Local calendar date the order was received (YYYY-MM-DD). */
  date?: string
  /** Epoch ms the record was created (stamped by `useCollection`). */
  createdAt?: unknown
  washTimerMinutes?: number
  washTimerEndsAt?: number
  washTimerNotifiedAt?: number
  dryTimerMinutes?: number
  dryTimerEndsAt?: number
  dryTimerNotifiedAt?: number
}

/** A countdown attached to one order, resolved from its flat order fields. */
export interface OrderTimer {
  stage: TimerStage
  /** Total length the staff member chose, in minutes. */
  minutes: number
  /** Epoch ms when the cycle is due to end. */
  endsAt: number
  /** Epoch ms when staff/customer were already alerted, so we only fire once. */
  notifiedAt?: number
}

/** Keep a configured duration inside a sane range. */
export function clampMinutes(minutes: unknown, fallback = DEFAULT_TIMER_MINUTES): number {
  const value = Math.round(Number(minutes))
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(value, MAX_TIMER_MINUTES)
}

/** When a cycle started now with this length is due. */
export function endsAtFromNow(minutes: number, from = Date.now()): number {
  return from + clampMinutes(minutes) * 60_000
}

/** Read an order's timer for a stage, or null when it has none. */
export function readTimer(order: TimerSource, stage: TimerStage): OrderTimer | null {
  const prefix = stage === 'Washing' ? 'wash' : 'dry'
  const fields = order as unknown as Record<string, unknown>
  const endsAt = Number(fields[`${prefix}TimerEndsAt`])
  if (!Number.isFinite(endsAt) || endsAt <= 0) return null
  const notifiedAt = Number(fields[`${prefix}TimerNotifiedAt`])
  return {
    stage,
    minutes: clampMinutes(fields[`${prefix}TimerMinutes`]),
    endsAt,
    notifiedAt: Number.isFinite(notifiedAt) && notifiedAt > 0 ? notifiedAt : undefined,
  }
}

/** The timer an order is currently running, if any. */
export function activeTimer(order: TimerSource): OrderTimer | null {
  return readTimer(order, 'Washing') ?? readTimer(order, 'Drying')
}

/** Ms left before the cycle is due; negative once it is overdue. */
export function remainingMs(timer: OrderTimer, now = Date.now()): number {
  return timer.endsAt - now
}

/** True once the countdown has passed zero. */
export function isOverdue(timer: OrderTimer, now = Date.now()): boolean {
  return remainingMs(timer, now) <= 0
}

/**
 * True when the timer has run out and nobody has been told yet — the exact
 * condition the background sweep looks for, so it fires once and only once.
 */
export function needsAlert(timer: OrderTimer, now = Date.now()): boolean {
  return isOverdue(timer, now) && !timer.notifiedAt
}

/** "38:12" under an hour, "1h 05m" beyond it. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Countdown label, including how late a cycle is once it is overdue. */
export function timerLabel(timer: OrderTimer, now = Date.now()): string {
  const left = remainingMs(timer, now)
  if (left <= 0) return `Overdue ${formatRemaining(-left)}`
  return formatRemaining(left)
}

/** Clear every timer field for a stage — used when an order leaves that stage. */
export function clearedTimerFields(stage: TimerStage): Record<string, unknown> {
  const prefix = stage === 'Washing' ? 'wash' : 'dry'
  return {
    [`${prefix}TimerMinutes`]: null,
    [`${prefix}TimerEndsAt`]: null,
    [`${prefix}TimerNotifiedAt`]: null,
  }
}

/** Fields that start a cycle for a stage. */
export function timerFields(stage: TimerStage, minutes: number, from = Date.now()): Record<string, unknown> {
  const prefix = stage === 'Washing' ? 'wash' : 'dry'
  return {
    [`${prefix}TimerMinutes`]: clampMinutes(minutes),
    [`${prefix}TimerEndsAt`]: endsAtFromNow(minutes, from),
    // Re-arm the alert so a re-entered stage alerts again on its own cycle.
    [`${prefix}TimerNotifiedAt`]: null,
  }
}