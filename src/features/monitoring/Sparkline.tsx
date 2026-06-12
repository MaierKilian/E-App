interface SparklineProps {
  /** Datenpunkte, älteste zuerst. */
  values: number[]
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
 */
export function Sparkline({ values, color, className, height = 36 }: SparklineProps) {
  const W = 100
  const H = 36
  const pad = 3

  const pts = values.length === 1 ? [values[0], values[0]] : values
  const id = `spark-${color.replace('#', '')}`

  let path = ''
  let area = ''
  if (pts.length >= 2) {
    const min = Math.min(...pts)
    const max = Math.max(...pts)
    const span = max - min || 1
    const stepX = (W - pad * 2) / (pts.length - 1)
    const coords = pts.map((v, i) => {
      const x = pad + i * stepX
      const y = pad + (H - pad * 2) * (1 - (v - min) / span)
      return [x, y] as const
    })
    path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    area = `${path} L${(W - pad).toFixed(1)} ${H - pad} L${pad} ${H - pad} Z`
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
          x1={pad}
          y1={H / 2}
          x2={W - pad}
          y2={H / 2}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 4"
          opacity="0.4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
