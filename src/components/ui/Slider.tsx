interface SliderProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
}

export function Slider({ value, min, max, onChange, className = '' }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-surface-2"
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${percent}%, var(--color-surface-2) ${percent}%)`,
        }}
      />
      <div className="flex justify-between text-xs text-muted">
        <span>{min}</span>
        <span className="font-semibold text-foreground">{value}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
