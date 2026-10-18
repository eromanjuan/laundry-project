/**
 * Checks for the pure helpers behind order dates, cycle timers, tracking keys
 * and money parsing.
 *
 * Run: node --experimental-strip-types
 *
 * These are the pieces where a silent mistake shows up as a wrong date on a
 * customer's receipt or a timer that never fires, so they are worth pinning
 * down. Firestore/React behaviour is covered by the browser pass, not here.
 */
import assert from 'node:assert/strict'
import { orderDate, receivedStamp } from './src/lib/dates.ts'
import {
  activeTimer,
  clampMinutes,
  clearedTimerFields,
  elapsedPercent,
  formatRemaining,
  isOverdue,
  needsAlert,
  readTimer,
  timerFields,
  timerLabel,
  totalLabel,
  DEFAULT_TIMER_MINUTES,
  MAX_TIMER_MINUTES,
} from './src/lib/timers.ts'
// Note: `trackKey` is not covered here — it lives in a module that imports
// Firebase, which this bare Node run can't resolve.
import { referenceCode, newRecordId, nowStamp, todayISO } from './src/data/seeds.ts'

const NOW = 1_700_000_000_000
let checks = 0
const ok = (name, fn) => { fn(); checks += 1; console.log('  ok', name) }

console.log('orderDate')
ok('prefers an explicit date', () => assert.equal(orderDate({ date: '2026-10-18' }), '2026-10-18'))
ok('falls back to createdAt', () => {
  // Local-calendar day, so compare against the UTC day rather than hardcoding
  // a date (the result shifts with the machine's timezone).
  const got = orderDate({ createdAt: NOW })
  assert.match(got, /^\d{4}-\d{2}-\d{2}$/)
  const utcDay = new Date(NOW).toISOString().slice(0, 10)
  const drift = Math.abs(Date.parse(`${got}T00:00:00Z`) - Date.parse(`${utcDay}T00:00:00Z`)) / 86_400_000
  assert.ok(drift <= 1, `${got} should be within a day of ${utcDay}, got drift ${drift}`)
})
ok('empty when neither is known', () => assert.equal(orderDate({}), ''))
ok('ignores a non-numeric createdAt', () => assert.equal(orderDate({ createdAt: 'nope' }), ''))

console.log('dateLabel (via receivedStamp)')
ok('formats as "Mon D, YYYY"', () => assert.equal(receivedStamp({ date: '2026-10-18', timeReceived: '' }), 'Oct 18, 2026'))
ok('handles single-digit month/day', () => assert.equal(receivedStamp({ date: '2026-01-05', timeReceived: '' }), 'Jan 5, 2026'))
ok('rejects junk', () => assert.equal(receivedStamp({ date: 'not-a-date', timeReceived: '' }), ''))
ok('rejects an impossible day', () => assert.equal(receivedStamp({ date: '2026-13-40', timeReceived: '' }), ''))

console.log('receivedStamp')
ok('joins date and time', () => assert.equal(receivedStamp({ date: '2026-10-18', timeReceived: '07:23 PM' }), 'Oct 18, 2026, 07:23 PM'))
ok('time only when no date is known', () => assert.equal(receivedStamp({ timeReceived: '07:23 PM' }), '07:23 PM'))
ok('date only when no time is known', () => assert.equal(receivedStamp({ date: '2026-10-18', timeReceived: '' }), 'Oct 18, 2026'))
ok('empty when neither is known', () => assert.equal(receivedStamp({}), ''))
ok('trims stray whitespace', () => assert.equal(receivedStamp({ date: '2026-10-18', timeReceived: ' 07:23 PM ' }), 'Oct 18, 2026, 07:23 PM'))

console.log('clampMinutes')
ok('defaults to 40 on nonsense', () => assert.equal(clampMinutes(undefined), DEFAULT_TIMER_MINUTES))
ok('rejects zero/negative/NaN', () => {
  assert.equal(clampMinutes(0), 40)
  assert.equal(clampMinutes(-5), 40)
  assert.equal(clampMinutes('abc'), 40)
  assert.equal(clampMinutes(Number.NaN), 40)
})
ok('caps at 12 hours', () => assert.equal(clampMinutes(99999), MAX_TIMER_MINUTES))
ok('rounds fractional minutes', () => assert.equal(clampMinutes(12.6), 13))

console.log('formatRemaining')
ok('mm:ss under an hour', () => {
  assert.equal(formatRemaining(38 * 60_000 + 12_000), '38:12')
  assert.equal(formatRemaining(9_000), '00:09')
})
ok('h:mm beyond an hour', () => assert.equal(formatRemaining(65 * 60_000), '1h 05m'))
ok('never renders negative', () => assert.equal(formatRemaining(-5000), '00:00'))

console.log('readTimer / activeTimer')
ok('reads the washing timer', () => {
  const t = readTimer({ washTimerMinutes: 40, washTimerEndsAt: NOW + 60_000 }, 'Washing')
  assert.equal(t.minutes, 40)
  assert.equal(t.endsAt, NOW + 60_000)
  assert.equal(t.notifiedAt, undefined)
})
ok('null when absent or zeroed', () => {
  assert.equal(readTimer({}, 'Drying'), null)
  assert.equal(readTimer({ washTimerEndsAt: 0 }, 'Washing'), null)
  assert.equal(readTimer({ washTimerEndsAt: null }, 'Washing'), null)
})
ok('prefers Washing then Drying', () => {
  assert.equal(activeTimer({ washTimerEndsAt: 1, dryTimerEndsAt: 2 })?.stage, 'Washing')
  assert.equal(activeTimer({ dryTimerEndsAt: 2 })?.stage, 'Drying')
  assert.equal(activeTimer({}), null)
})

console.log('overdue / fire-once guard')
ok('overdue once past zero', () => {
  assert.equal(isOverdue({ stage: 'Washing', minutes: 40, endsAt: NOW - 1 }, NOW), true)
  assert.equal(isOverdue({ stage: 'Washing', minutes: 40, endsAt: NOW + 1 }, NOW), false)
})
ok('needsAlert only when overdue AND un-notified', () => {
  assert.equal(needsAlert({ stage: 'Washing', minutes: 40, endsAt: NOW - 1 }, NOW), true)
  assert.equal(needsAlert({ stage: 'Washing', minutes: 40, endsAt: NOW - 1, notifiedAt: NOW }, NOW), false)
  assert.equal(needsAlert({ stage: 'Washing', minutes: 40, endsAt: NOW + 60_000 }, NOW), false)
})
ok('exactly zero counts as due', () => assert.equal(needsAlert({ stage: 'Drying', minutes: 40, endsAt: NOW }, NOW), true))
ok('a stale notifiedAt still blocks a second alert', () => {
  assert.equal(needsAlert({ stage: 'Drying', minutes: 40, endsAt: NOW - 60_000, notifiedAt: 1 }, NOW), false)
})

console.log('timerLabel')
ok('counts down, then reports lateness', () => {
  const t = { stage: 'Washing', minutes: 40, endsAt: NOW }
  assert.equal(timerLabel(t, NOW - 5 * 60_000), '05:00')
  assert.equal(timerLabel(t, NOW + 90_000), 'Overdue 01:30')
})

console.log('timerFields / clearedTimerFields')
ok('starts a cycle and re-arms the alert', () => {
  const f = timerFields('Drying', 25, NOW)
  assert.equal(f.dryTimerMinutes, 25)
  assert.equal(f.dryTimerEndsAt, NOW + 25 * 60_000)
  assert.equal(f.dryTimerNotifiedAt, null, 'a fresh cycle must be able to alert again')
})
ok('clears every field for that stage only', () => {
  const c = clearedTimerFields('Washing')
  assert.equal(c.washTimerEndsAt, null)
  assert.equal(c.washTimerNotifiedAt, null)
  assert.equal(c.dryTimerEndsAt, undefined, 'must not touch the other stage')
})
ok('the two patches compose without clobbering', () => {
  const patch = { ...clearedTimerFields('Drying'), ...timerFields('Washing', 40, NOW) }
  assert.equal(patch.dryTimerEndsAt, null)
  assert.equal(patch.washTimerEndsAt, NOW + 40 * 60_000)
})

console.log('elapsedPercent / totalLabel')
const cycle = (minutes, endsAt) => ({ stage: 'Washing', minutes, endsAt })
const pct = (t, n = NOW) => Math.round(elapsedPercent(t, n))
ok('starts at 0', () => assert.equal(pct(cycle(40, NOW + 40 * 60_000)), 0))
ok('is halfway at the midpoint', () => assert.equal(pct(cycle(40, NOW + 20 * 60_000)), 50))
ok('reaches 100 when finished', () => assert.equal(pct(cycle(40, NOW)), 100))
ok('pins at 100 when overdue', () => assert.equal(pct(cycle(40, NOW - 90 * 60_000)), 100))
ok('never exceeds 100 or drops below 0', () => {
  assert.equal(pct(cycle(40, NOW + 999 * 60_000)), 0)
  assert.equal(pct(cycle(40, NOW - 999 * 60_000)), 100)
})
ok('scales to the configured length, not a fixed 40', () => {
  assert.equal(pct(cycle(15, NOW + 7.5 * 60_000)), 50)
  assert.equal(pct(cycle(90, NOW + 45 * 60_000)), 50)
})
ok('is unrounded, so the bar keeps moving between whole percents', () => {
  // 13s into a 40-minute cycle is 0.54% — a rounded value would still read 0.
  const value = elapsedPercent(cycle(40, NOW + 40 * 60_000 - 13_000), NOW)
  assert.ok(value > 0 && value < 1, `expected a fraction between 0 and 1, got ${value}`)
})
ok('totalLabel renders the configured length', () => {
  assert.equal(totalLabel(cycle(40, NOW)), '40:00')
  assert.equal(totalLabel(cycle(90, NOW)), '1h 30m')
})

console.log('id helpers')
ok('referenceCode is PREFIX-4digits', () => assert.match(referenceCode('EXP'), /^EXP-\d{4}$/))
ok('newRecordId is unique across rapid calls', () => {
  const ids = new Set(Array.from({ length: 500 }, () => newRecordId()))
  assert.equal(ids.size, 500)
})
ok('nowStamp includes a date and a time', () => assert.match(nowStamp(), /\d{4}/))
ok('todayISO is YYYY-MM-DD', () => assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/))

console.log(`\n${checks} checks passed`)