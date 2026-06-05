interface StepperProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
}

export function Stepper({ value, min, max, onChange, className = '' }: StepperProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-9 h-9 rounded-xl border border-border bg-surface-2 text-foreground font-bold text-lg flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
        aria-label="decrease"
      >
        −
      </button>
      <span className="w-10 text-center font-semibold text-foreground tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-9 h-9 rounded-xl border border-border bg-surface-2 text-foreground font-bold text-lg flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
        aria-label="increase"
      >
        +
      </button>
    </div>
  )
}
