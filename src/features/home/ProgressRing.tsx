import type { ReactNode } from 'react'

interface ProgressRingProps {
  /** Fortschritt in Prozent (0..100). */
  value: number
  size?: number
  stroke?: number
  label?: string
  /** Optionaler Inhalt in der Mitte (z. B. Avatar). Ersetzt die Prozentzahl. */
  children?: ReactNode
}

/**
 * Dezenter, kreisförmiger Fortschrittsring für die Profil-Vollständigkeit.
 * Reines SVG – keine zusätzlichen Abhängigkeiten.
 */
export function ProgressRing({ value, size = 56, stroke = 5, label, children }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? <span className="text-sm font-semibold text-foreground">{clamped}%</span>}
      </div>
      {label && <span className="sr-only">{label}</span>}
    </div>
  )
}
