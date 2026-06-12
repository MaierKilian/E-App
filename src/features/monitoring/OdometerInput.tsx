import { useEffect, useRef, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { clampInt, toDigits } from './odometer'

interface OdometerInputProps {
  /** Anzahl der Ganzzahl-Stellen (z. B. 6). */
  digits: number
  /** Aktueller Ganzzahl-Wert. */
  value: number
  /** Wird mit dem neuen Ganzzahl-Wert aufgerufen. */
  onChange: (value: number) => void
  /** Optionaler typ-eigener Akzent für die aktive Ziffer. */
  accent?: string
}

const DRAG_STEP_PX = 28 // Pixel je Schritt beim vertikalen Ziehen

/**
 * Zählwerk-Eingabe: eine Reihe großer Ziffern-Rollen. Jede Ziffer lässt sich
 * per Pfeil (mit Übertrag), vertikalem Ziehen oder über die manuelle Tastatur
 * (in der übergeordneten Komponente) verändern. Bereich/NaN-sicher.
 */
export function OdometerInput({ digits, value, onChange, accent }: OdometerInputProps) {
  const max = 10 ** digits - 1
  const safeValue = clampInt(value, max)
  const cells = toDigits(safeValue, digits)

  /** Erhöht/erniedrigt den Gesamtwert um den Stellenwert der Position. */
  function step(index: number, dir: 1 | -1) {
    const place = 10 ** (digits - 1 - index)
    onChange(clampInt(safeValue + dir * place, max))
  }

  return (
    <div className="flex items-stretch justify-center gap-1.5">
      {cells.map((digit, index) => (
        <OdometerCell
          key={index}
          digit={digit}
          accent={accent}
          onStep={(dir) => step(index, dir)}
        />
      ))}
    </div>
  )
}

interface OdometerCellProps {
  digit: number
  accent?: string
  onStep: (dir: 1 | -1) => void
}

/** Einzelne Ziffern-Rolle mit Pfeilen und Drag-Geste. */
function OdometerCell({ digit, accent, onStep }: OdometerCellProps) {
  const startY = useRef<number | null>(null)
  const accum = useRef(0)
  const [dragging, setDragging] = useState(false)

  // Drag-Cleanup: globale Listener nur während einer aktiven Geste.
  useEffect(() => {
    if (!dragging) return

    function handleMove(e: PointerEvent) {
      if (startY.current === null) return
      const delta = startY.current - e.clientY + accum.current
      const steps = Math.trunc(delta / DRAG_STEP_PX)
      if (steps !== 0) {
        for (let i = 0; i < Math.abs(steps); i++) onStep(steps > 0 ? 1 : -1)
        accum.current = delta - steps * DRAG_STEP_PX
        startY.current = e.clientY
      }
    }
    function handleUp() {
      setDragging(false)
      startY.current = null
      accum.current = 0
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [dragging, onStep])

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <button
        type="button"
        onClick={() => onStep(1)}
        aria-label="+1"
        className="grid place-items-center w-9 h-7 rounded-lg text-muted hover:text-foreground hover:bg-surface-2/70 transition-colors"
      >
        <ChevronUp className="w-5 h-5" />
      </button>
      <div
        onPointerDown={(e) => {
          startY.current = e.clientY
          accum.current = 0
          setDragging(true)
        }}
        style={
          dragging && accent
            ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` }
            : undefined
        }
        className={`grid place-items-center w-11 h-14 rounded-xl border bg-surface-2/40 text-3xl font-bold tabular-nums text-foreground cursor-ns-resize touch-none transition-colors ${
          dragging ? 'border-primary' : 'border-border'
        }`}
      >
        {digit}
      </div>
      <button
        type="button"
        onClick={() => onStep(-1)}
        aria-label="-1"
        className="grid place-items-center w-9 h-7 rounded-lg text-muted hover:text-foreground hover:bg-surface-2/70 transition-colors"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  )
}
