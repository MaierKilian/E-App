interface SliderProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
  /** Optionale Einheit am aktuellen Wert (z. B. "m²"). */
  unit?: string
}

export function Slider({ value, min, max, onChange, className = '', unit }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="focus-ring w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${percent}%, color-mix(in srgb, var(--color-surface-2) 70%, transparent) ${percent}%)`,
        }}
      />
      <div className="flex justify-between text-xs text-muted">
        <span>{min}</span>
        <span className="font-semibold text-foreground tabular-nums">
          {value}
          {unit && <span className="text-muted font-normal ml-0.5">{unit}</span>}
        </span>
        <span>{max}</span>
      </div>
    </div>
  )
}
