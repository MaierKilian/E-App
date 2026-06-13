interface ProgressRingProps {
  /** Erledigte Anzahl. */
  done: number
  /** Gesamtanzahl. */
  total: number
  /** Außendurchmesser in px. */
  size?: number
  /** Strichstärke in px. */
  stroke?: number
}

/**
 * Kompakter Fortschrittsring (SVG) im Apple-Fitness-Stil.
 * Zeigt den Anteil done/total als Ring und die Zahl in der Mitte.
 */
export function ProgressRing({ done, total, size = 56, stroke = 6 }: ProgressRingProps) {
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums text-foreground">
        {done}/{total}
      </span>
    </span>
  )
}
