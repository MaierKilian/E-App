interface StepperProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
  /** Kompakte Variante für enge Raster (z. B. Zimmer-Pills). */
  size?: 'md' | 'sm'
}

export function Stepper({ value, min, max, onChange, className = '', size = 'md' }: StepperProps) {
  const btn =
    size === 'sm'
      ? 'w-7 h-7 text-base rounded-lg'
      : 'w-9 h-9 text-lg rounded-xl'
  const num = size === 'sm' ? 'w-7 text-sm' : 'w-10'

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`${btn} border border-border bg-surface-2 text-foreground font-bold flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform`}
        aria-label="decrease"
      >
        −
      </button>
      <span className={`${num} text-center font-semibold text-foreground tabular-nums`}>{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`${btn} border border-border bg-surface-2 text-foreground font-bold flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform`}
        aria-label="increase"
      >
        +
      </button>
    </div>
  )
}
