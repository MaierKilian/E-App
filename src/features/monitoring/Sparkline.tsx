import { H, PAD, W, sparklineOffsets } from './sparklineGeometry'

interface SparklineProps {
  /** Datenpunkte, älteste zuerst. */
  values: number[]
  /**
   * ISO-Daten (`yyyy-mm-dd`) zu den Werten, in derselben Reihenfolge.
   *
   * Optional: Ohne sie stehen die Punkte gleichmäßig – richtig für die
   * Beispielkurve der Ghost-Vorschau, die gar keine Daten hat. Mit ihnen
   * bekommt die Kurve dieselbe Zeitachse wie das große Diagramm und der
   * PDF-Verlauf, statt eine Woche und drei Monate gleich breit zu zeichnen.
   */
  dates?: string[]
  /** Linien-/Flächenfarbe (z. B. typ-eigener Akzent). */
  color: string
  className?: string
  /** Höhe in px (Breite skaliert über das SVG-ViewBox responsiv). */
  height?: number
}

/**
 * Minimalistische Verlaufskurve (SVG) mit weicher Flächenfüllung.
 * Skaliert responsiv über `preserveAspectRatio="none"`, ist also unabhängig
 * von der konkreten Pixelbreite. Robust bei 0/1 Punkten oder konstanten Werten.
 *
 * **Ein einzelner Messwert ergibt noch keinen Verlauf.** Bis August 2026 wurde
 * er zu zwei Punkten verdoppelt und damit als durchgezogene, waagerechte Linie
 * über die volle Breite gezeichnet – nicht von einem tatsächlich gemessenen
 * flachen Verlauf zu unterscheiden. Jetzt erscheint er wie der Leerzustand
 * gestrichelt, nur etwas kräftiger: eine Ablesung ist mehr als keine, aber noch
 * kein Trend.
 */
export function Sparkline({ values, dates, color, className, height = 36 }: SparklineProps) {
  // Erst ab zwei Ablesungen gibt es eine Kurve zu zeichnen.
  const pts = values.length >= 2 ? values : []
  const singleReading = values.length === 1
  const id = `spark-${color.replace('#', '')}`

  let path = ''
  let area = ''
  if (pts.length >= 2) {
    const min = Math.min(...pts)
    const max = Math.max(...pts)
    const span = max - min || 1
    const offsets = sparklineOffsets(pts.length, dates)
    const coords = pts.map((v, i) => {
      const x = PAD + offsets[i]
      const y = PAD + (H - PAD * 2) * (1 - (v - min) / span)
      return [x, y] as const
    })
    path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    area = `${path} L${(W - PAD).toFixed(1)} ${H - PAD} L${PAD} ${H - PAD} Z`
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      style={{ height, width: '100%', display: 'block' }}
      aria-hidden="true"
    >
      {path ? (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${id})`} />
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : (
        <line
          x1={PAD}
          y1={H / 2}
          x2={W - PAD}
          y2={H / 2}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 4"
          opacity={singleReading ? 0.55 : 0.4}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
