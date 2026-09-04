import { useEffect, useRef } from 'react'

interface StepperProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
  /** Kompakte Variante für enge Raster (z. B. Zimmer-Pills). */
  size?: 'md' | 'sm'
  /** Optionaler Schritt (z. B. 5 m² je Klick). Standard: 1. */
  step?: number
  /** Optionale Einheit, dezent neben dem Wert. */
  unit?: string
}

/** Verzögerung, bevor gehaltenes Drücken zu automatischem Weiterzählen wird (ms). */
const HOLD_DELAY_MS = 400
/** Intervall des ersten automatischen Schritts (ms). */
const HOLD_START_INTERVAL_MS = 220
/** Schnellstes Intervall, auf das sich das Weiterzählen einpendelt (ms). */
const HOLD_MIN_INTERVAL_MS = 50
/** Verkürzung des Intervalls je weiterem Schritt (ms) – sorgt für die Beschleunigung. */
const HOLD_ACCEL_STEP_MS = 18

export function Stepper({
  value,
  min,
  max,
  onChange,
  className = '',
  size = 'md',
  step = 1,
  unit,
}: StepperProps) {
  const btn =
    size === 'sm'
      ? 'w-7 h-7 text-base rounded-xl'
      : 'w-9 h-9 text-lg rounded-2xl'
  const num = size === 'sm' ? 'min-w-7 text-sm' : 'min-w-10'

  const clamp = (v: number) => Math.max(min, Math.min(max, v))

  // Der Halte-Timer läuft über mehrere Ticks und darf dabei nie mit einem
  // veralteten `value`/`min`/`max` aus der Render-Closure rechnen, in der das
  // Halten begonnen hat – sonst würde er bei jedem Tick denselben Schritt vom
  // Ausgangswert aus wiederholen statt vom zuletzt gemeldeten Stand.
  const latest = useRef({ value, min, max, step, onChange })
  useEffect(() => {
    latest.current = { value, min, max, step, onChange }
  })

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdDirection = useRef<1 | -1>(1)
  const holdRepeats = useRef(0)
  // Wird erst wahr, wenn der Halte-Timer tatsächlich einen automatischen
  // Schritt ausgelöst hat – nur dann soll der abschließende Klick beim
  // Loslassen unterdrückt werden, damit ein normaler kurzer Klick unverändert
  // genau einen Schritt macht.
  const suppressClick = useRef(false)
  const holdFirstTick = useRef(true)

  function stopHold() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  useEffect(() => stopHold, [])

  function holdTick() {
    if (holdFirstTick.current) {
      holdFirstTick.current = false
      suppressClick.current = true
    }
    const { value: v, min: lo, max: hi, step: s, onChange: change } = latest.current
    const next = Math.max(lo, Math.min(hi, v + holdDirection.current * s))
    if (next === v) {
      stopHold()
      return
    }
    change(next)
    holdRepeats.current += 1
    const delay = Math.max(
      HOLD_MIN_INTERVAL_MS,
      HOLD_START_INTERVAL_MS - holdRepeats.current * HOLD_ACCEL_STEP_MS,
    )
    holdTimer.current = setTimeout(holdTick, delay)
  }

  /** Klicken und Halten zählt automatisch weiter – erleichtert große Eingaben. */
  function beginHold(direction: 1 | -1) {
    holdDirection.current = direction
    holdRepeats.current = 0
    holdFirstTick.current = true
    holdTimer.current = setTimeout(holdTick, HOLD_DELAY_MS)
  }

  function endClick(direction: 1 | -1) {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    onChange(clamp(value + direction * step))
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => endClick(-1)}
        onPointerDown={(e) => {
          if (e.button === 0) beginHold(-1)
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        disabled={value <= min}
        className={`focus-ring ${btn} glass text-foreground font-bold flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform select-none touch-manipulation`}
        aria-label="decrease"
      >
        −
      </button>
      <span className={`${num} px-1 text-center font-semibold text-foreground tabular-nums`}>
        {value}
        {unit && <span className="text-muted font-normal text-xs ml-0.5">{unit}</span>}
      </span>
      <button
        type="button"
        onClick={() => endClick(1)}
        onPointerDown={(e) => {
          if (e.button === 0) beginHold(1)
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        disabled={value >= max}
        className={`focus-ring ${btn} glass text-foreground font-bold flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform select-none touch-manipulation`}
        aria-label="increase"
      >
        +
      </button>
    </div>
  )
}
