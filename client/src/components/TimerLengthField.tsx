import { FaRedo } from 'react-icons/fa'
import { clampMinutes, MAX_TIMER_MINUTES, type TimerStage } from '../lib/timers'

interface TimerLengthFieldProps {
  stage: TimerStage
  /** Current length in minutes. */
  value: number
  onChange: (minutes: number) => void
  /** The shop's configured default, offered as a one-tap reset. */
  defaultMinutes: number
}

const quickChoices = [15, 30, 40, 60, 90]

/**
 * Cycle-length picker shown before an order enters Washing or Drying.
 *
 * Staff usually take the shop default, so it is pre-filled and offered as a
 * quick chip; anything unusual can be typed directly. The countdown only ever
 * reminds — it never advances the order on its own.
 */
export function TimerLengthField({ stage, value, onChange, defaultMinutes }: TimerLengthFieldProps) {
  const noun = stage === 'Washing' ? 'wash' : 'dry'

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {stage === 'Washing' ? 'Wash' : 'Dry'} timer
          <input
            type="number"
            min={1}
            max={MAX_TIMER_MINUTES}
            value={value}
            onChange={(event) => onChange(clampMinutes(event.target.value, value))}
            aria-label={`${noun} timer in minutes`}
            className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-400"
          />
          <span className="text-xs font-normal text-slate-500">minutes</span>
        </label>
        {value !== defaultMinutes ? (
          <button
            type="button"
            onClick={() => onChange(defaultMinutes)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            <FaRedo /> Use default ({defaultMinutes}m)
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {quickChoices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => onChange(choice)}
            aria-pressed={value === choice}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              value === choice ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 hover:bg-amber-100'
            }`}
          >
            {choice}m
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        When the {noun} time is up, staff and the customer get notified. The order will
        <span className="font-semibold"> not </span>
        move on by itself — a person still moves it on.
      </p>
    </div>
  )
}