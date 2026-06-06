import { useTranslation } from 'react-i18next'

export interface ChartDatum {
  label: string
  value: number
}

interface ConsumptionChartProps {
  data: ChartDatum[]
  /** Optionale Einheit für die Werte-Labels (z. B. 'kWh'). */
  unit?: string
}

/** Maximale Anzahl Balken; bei mehr Daten werden die neuesten gezeigt. */
const MAX_BARS = 12

/**
 * Schlankes, responsives Balkendiagramm als reines SVG (keine Bibliothek).
 * Mobile-first, Breite 100 %, kein horizontaler Überlauf. Zeigt die neuesten
 * MAX_BARS Werte. Balken nutzen das Theme-Primary, Linien/Border Theme-Tokens.
 */
export function ConsumptionChart({ data, unit }: ConsumptionChartProps) {
  const { t } = useTranslation()

  const items = data.slice(-MAX_BARS)

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted py-6 text-center">
        {t('monitoring.readings.emptyText')}
      </p>
    )
  }

  const max = Math.max(...items.map((d) => d.value), 0)
  // Geometrie im viewBox-Koordinatensystem; per CSS auf 100 % skaliert.
  const VB_W = 320
  const VB_H = 120
  const PAD_TOP = 16
  const BASELINE = VB_H - 4
  const chartH = BASELINE - PAD_TOP
  const slot = VB_W / items.length
  const barW = Math.min(28, slot * 0.6)

  const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto"
        role="img"
        preserveAspectRatio="none"
      >
        {/* Grundlinie */}
        <line
          x1={0}
          y1={BASELINE}
          x2={VB_W}
          y2={BASELINE}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {items.map((d, i) => {
          const h = max > 0 ? (d.value / max) * chartH : 0
          const x = slot * i + (slot - barW) / 2
          const y = BASELINE - h
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 1)}
                rx={3}
                fill="var(--color-primary)"
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-foreground)"
              >
                {fmt.format(d.value)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex w-full">
        {items.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10px] text-muted truncate px-0.5"
          >
            {d.label}
          </span>
        ))}
      </div>
      {unit && <p className="mt-1 text-right text-[10px] text-muted">{unit}</p>}
    </div>
  )
}
