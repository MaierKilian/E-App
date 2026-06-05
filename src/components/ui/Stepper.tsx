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

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className={`focus-ring ${btn} glass text-foreground font-bold flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform`}
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
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className={`focus-ring ${btn} glass text-foreground font-bold flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform`}
        aria-label="increase"
      >
        +
      </button>
    </div>
  )
}
