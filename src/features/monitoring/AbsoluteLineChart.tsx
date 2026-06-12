import { useId } from 'react'
import { useTranslation } from 'react-i18next'

export interface LinePoint {
  /** ISO-Datum yyyy-mm-dd der Ablesung. */
  date: string
  /** Absoluter Zählerstand. */
  value: number
}

interface AbsoluteLineChartProps {
  points: LinePoint[]
  /** Optionale Einheit für die y-Achsen-Beschriftung (z. B. 'kWh'). */
  unit?: string
  /** Typ-eigener Akzent für Linie, Punkte und Flächen-Fade. */
  accent?: string
}

// Geometrie im viewBox-Koordinatensystem; per CSS auf 100 % skaliert.
const VB_W = 320
const VB_H = 104
const PAD_L = 8
const PAD_R = 8
const PAD_TOP = 10
const PAD_BOTTOM = 8
const MAX_LABELS = 5

/**
 * Responsives Linien-Diagramm des absoluten Zählerstands als reines SVG
 * (keine Bibliothek). Linie, Punkte und der weiche Flächen-Fade nutzen den
 * typ-eigenen Akzent; Achsen/Grid die Border-Tokens. Mobile-first, 100 %
 * Breite, kein horizontaler Überlauf.
 */
export function AbsoluteLineChart({ points, unit, accent }: AbsoluteLineChartProps) {
  const { t, i18n } = useTranslation()
  const gradId = useId()
  const color = accent ?? 'var(--color-primary)'

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted py-8 text-center">
        {t('monitoring.readings.emptyText')}
      </p>
    )
  }

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
  })
  const formatDate = (iso: string): string => {
    const d = new Date(`${iso}T00:00:00`)
    return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d)
  }

  const values = points.map((p) => p.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  // Etwas Padding um die Werte; bei identischen Werten künstliche Spanne.
  const span = rawMax - rawMin || Math.max(Math.abs(rawMax) * 0.1, 1)
  const yMin = rawMin - span * 0.1
  const yMax = rawMax + span * 0.1

  const innerW = VB_W - PAD_L - PAD_R
  const innerH = VB_H - PAD_TOP - PAD_BOTTOM
  const baseline = VB_H - PAD_BOTTOM

  const x = (i: number): number =>
    points.length === 1 ? PAD_L + innerW / 2 : PAD_L + (innerW * i) / (points.length - 1)
  const y = (v: number): number => PAD_TOP + innerH * (1 - (v - yMin) / (yMax - yMin || 1))

  const coords = points.map((p, i) => ({ cx: x(i), cy: y(p.value) }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx} ${c.cy}`).join(' ')
  // Geschlossene Fläche unter der Linie für den farbigen Fade.
  const areaPath =
    coords.length > 1
      ? `${path} L ${coords[coords.length - 1].cx} ${baseline} L ${coords[0].cx} ${baseline} Z`
      : ''

  // Dezente x-Achsen-Labels: höchstens MAX_LABELS, gleichmäßig verteilt.
  const labelStep = Math.max(1, Math.ceil(points.length / MAX_LABELS))

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto" role="img">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Baseline / x-Achse */}
        <line
          x1={PAD_L}
          y1={baseline}
          x2={VB_W - PAD_R}
          y2={baseline}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        {/* obere Grid-Linie */}
        <line
          x1={PAD_L}
          y1={PAD_TOP}
          x2={VB_W - PAD_R}
          y2={PAD_TOP}
          stroke="var(--color-border)"
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.6}
        />
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {points.length > 1 && (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {coords.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={3} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex w-full justify-between">
        {points.map((p, i) =>
          i % labelStep === 0 || i === points.length - 1 ? (
            <span key={i} className="text-[10px] text-muted tabular-nums">
              {formatDate(p.date)}
            </span>
          ) : null,
        )}
      </div>
      <p className="mt-1 text-right text-[10px] text-muted tabular-nums">
        {numFmt.format(rawMin)}–{numFmt.format(rawMax)}
        {unit ? ` ${unit}` : ''}
      </p>
    </div>
  )
}
