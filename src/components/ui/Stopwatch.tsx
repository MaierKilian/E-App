import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface StopwatchProps {
  /**
   * Wird mit dem aktuellen Sekundenwert gemeldet:
   * - beim Stoppen (gemessene Dauer)
   * - beim Zurücksetzen (0)
   */
  onChange: (seconds: number) => void
}

/** Formatiert Millisekunden als MM:SS,t (Zehntelsekunden). */
function format(ms: number): string {
  const totalTenths = Math.floor(ms / 100)
  const tenths = totalTenths % 10
  const totalSeconds = Math.floor(totalTenths / 10)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(minutes)}:${pad(seconds)},${tenths}`
}

/**
 * Wiederverwendbare Stoppuhr (Glass, Token-only).
 * Läuft über requestAnimationFrame und räumt sauber auf (kein setState nach
 * Unmount). Meldet beim Stoppen / Zurücksetzen den Sekundenwert nach außen.
 */
export function Stopwatch({ onChange }: StopwatchProps) {
  const { t } = useTranslation()
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const baseRef = useRef(0)
  const onChangeRef = useRef(onChange)

  // Aktuellen Callback in einer Ref halten, ohne ihn während des Renders zu
  // setzen (vermeidet React-Refs-Lint-Fehler) und ohne Effekte neu zu binden.
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!running) return
    let active = true
    startRef.current = performance.now()

    const tick = () => {
      if (!active) return
      setElapsed(baseRef.current + (performance.now() - startRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      active = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [running])

  function toggle() {
    if (running) {
      // Stoppen: Stand sichern und nach außen melden.
      const total = baseRef.current + (performance.now() - startRef.current)
      baseRef.current = total
      setElapsed(total)
      setRunning(false)
      onChangeRef.current(Math.round((total / 1000) * 10) / 10)
    } else {
      setRunning(true)
    }
  }

  function reset() {
    setRunning(false)
    baseRef.current = 0
    setElapsed(0)
    onChangeRef.current(0)
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl glass p-5">
      <span className="text-4xl font-bold tabular-nums text-foreground" aria-live="off">
        {format(elapsed)}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? t('measurements.stopwatch.stop') : t('measurements.stopwatch.start')}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={elapsed === 0 && !running}
          className="focus-ring flex items-center gap-1.5 rounded-2xl glass px-4 py-2.5 text-sm font-medium text-foreground transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          {t('measurements.stopwatch.reset')}
        </button>
      </div>
    </div>
  )
}
