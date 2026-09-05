import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isoToTime, offsetForTime, timeAxisPositions } from '@/lib/timeAxis'
import { heatingSpans } from './heatingPeriod'

export interface LinePoint {
  /** ISO-Datum yyyy-mm-dd der Ablesung. */
  date: string
  /** Absoluter Zählerstand bzw. Füllstand. */
  value: number
  /**
   * Gelieferte Menge, falls dieser Punkt eine Lieferung ist. Er wird dann
   * hervorgehoben: Ein Sprung nach oben ist bei einem Vorrat kein Messfehler,
   * sondern das Befüllen – ohne Markierung sähe die Kurve nach Datenmüll aus.
   */
  refill?: number
}

interface AbsoluteLineChartProps {
  points: LinePoint[]
  /** Optionale Einheit für die y-Achsen-Beschriftung (z. B. 'kWh'). */
  unit?: string
  /** Typ-eigener Akzent für Linie, Punkte und Flächen-Fade. */
  accent?: string
  /**
   * Heizperiode hinterlegen (nur für Wärmeträger sinnvoll).
   *
   * Ohne das Band ist an einer steigenden Kurve nicht zu sehen, ob der
   * Verbrauch dann entstand, als geheizt werden musste. Mit ihm liest sich der
   * Verlauf in einem Blick: Steigt die Linie im hellen Bereich spürbar, läuft
   * etwas, das im Sommer nicht laufen müsste.
   */
  showHeatingPeriod?: boolean
}

// Geometrie im viewBox-Koordinatensystem; per CSS auf 100 % skaliert.
const VB_W = 320
const VB_H = 104
const PAD_L = 8
const PAD_R = 8
const PAD_TOP = 10
const PAD_BOTTOM = 8

/**
 * Responsives Linien-Diagramm des absoluten Zählerstands als reines SVG
 * (keine Bibliothek). Linie, Punkte und der weiche Flächen-Fade nutzen den
 * typ-eigenen Akzent; Achsen/Grid die Border-Tokens. Mobile-first, 100 %
 * Breite, kein horizontaler Überlauf.
 *
 * Die x-Achse ist eine **echte Datumsachse**: Punkte sitzen entsprechend ihrem
 * tatsächlichen Datumsabstand – ein großer zeitlicher Sprung erzeugt auch einen
 * großen horizontalen Abstand. Ein Mindestabstand verhindert dabei, dass dicht
 * aufeinander folgende Ablesungen zu einem Klumpen verschmelzen und einzeln
 * nicht mehr treffbar sind (siehe `timeAxisPositions`).
 *
 * Zusätzlich ein **Scrubber** wie in der Apple-Wetter-App: Zeigen/Ziehen auf
 * dem Graphen wählt den nächstgelegenen Messpunkt; eine mitlaufende Blase zeigt
 * dessen Datum und Wert. Mit der Maus genügt Darüberfahren, auf dem Touchscreen
 * Tippen/Ziehen; per Tastatur gehen die Pfeiltasten von Punkt zu Punkt.
 */
export function AbsoluteLineChart({
  points,
  unit,
  accent,
  showHeatingPeriod = false,
}: AbsoluteLineChartProps) {
  const { t, i18n } = useTranslation()
  const gradId = useId()
  const color = accent ?? 'var(--color-primary)'
  const svgRef = useRef<SVGSVGElement>(null)

  // Aktiv abgetasteter Punkt (Default: jüngste Ablesung).
  const [active, setActive] = useState(() => Math.max(0, points.length - 1))
  const [scrubbing, setScrubbing] = useState(false)
  // Bei Zeitraum-/Datenwechsel (geänderte Punktanzahl) wieder auf die jüngste
  // Ablesung setzen – per „State während Render anpassen", ohne Effect.
  const [prevLen, setPrevLen] = useState(points.length)
  if (prevLen !== points.length) {
    setPrevLen(points.length)
    setActive(Math.max(0, points.length - 1))
  }

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted py-8 text-center">
        {t('monitoring.readings.emptyText')}
      </p>
    )
  }

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  // Jahr in die Achsen-Labels aufnehmen, sobald die Daten über mehrere Jahre
  // gehen – sonst ist „20.01." ohne Jahr mehrdeutig. Kurze Zeiträume (7/30 Tage,
  // selbes Jahr) bleiben schlank ohne Jahr.
  const pointYears = points
    .map((p) => new Date(`${p.date}T00:00:00`).getFullYear())
    .filter((y) => Number.isFinite(y))
  const multiYear = pointYears.length > 0 && Math.min(...pointYears) !== Math.max(...pointYears)
  const axisDateFmt = new Intl.DateTimeFormat(
    i18n.language,
    multiYear
      ? { day: '2-digit', month: '2-digit', year: '2-digit' }
      : { day: '2-digit', month: '2-digit' },
  )
  const bubbleDateFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const parseTime = (iso: string): number => new Date(`${iso}T00:00:00`).getTime()
  const formatAxisDate = (iso: string): string => {
    const d = parseTime(iso)
    return Number.isNaN(d) ? iso : axisDateFmt.format(d)
  }
  const formatBubbleDate = (iso: string): string => {
    const d = parseTime(iso)
    return Number.isNaN(d) ? iso : bubbleDateFmt.format(d)
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

  // Position auf der Datumsachse, mit Mindestabstand zwischen zwei Punkten:
  // Bei r=3 verdecken sich zwei Marker unter 7 Einheiten Abstand gegenseitig,
  // und der Scrubber könnte den hinteren nicht mehr einzeln treffen.
  const MIN_POINT_GAP = 7
  const times = points.map((p) => isoToTime(p.date))
  const offsets = timeAxisPositions(times, innerW, MIN_POINT_GAP)
  const x = (i: number): number => PAD_L + offsets[i]
  const y = (v: number): number => PAD_TOP + innerH * (1 - (v - yMin) / (yMax - yMin || 1))
  // Position in % der Gesamtbreite (für HTML-Overlays: Blase, Achsen-Labels).
  const leftPct = (i: number): number => (x(i) / VB_W) * 100

  // Heizperioden als Rechtecke hinter allem anderen. Die Ränder werden über
  // dieselbe (nicht zeit-proportionale) Achse interpoliert wie die Punkte –
  // sonst säße die Kante neben der Linie, die sie einordnen soll.
  const heatingBands =
    showHeatingPeriod && times.length > 1
      ? heatingSpans(times[0], times[times.length - 1])
          .map((span) => {
            const from = offsetForTime(times, offsets, span.from)
            const to = offsetForTime(times, offsets, span.to)
            if (from === undefined || to === undefined) return null
            return { x: PAD_L + from, width: to - from }
          })
          .filter((b): b is { x: number; width: number } => b !== null && b.width > 0.5)
      : []

  const coords = points.map((p, i) => ({ cx: x(i), cy: y(p.value) }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx} ${c.cy}`).join(' ')
  // Geschlossene Fläche unter der Linie für den farbigen Fade.
  const areaPath =
    coords.length > 1
      ? `${path} L ${coords[coords.length - 1].cx} ${baseline} L ${coords[0].cx} ${baseline} Z`
      : ''

  // Zeit-proportionale x-Achsen-Labels ohne Überlappung: erstes & letztes immer,
  // dazwischen nur, wenn weit genug entfernt (Greedy nach Position). Mit Jahr
  // sind die Labels breiter → größerer Mindestabstand.
  const minGapPct = multiYear ? 26 : 18
  const axisLabels: { i: number; pct: number }[] = []
  let lastPct = -Infinity
  points.forEach((_, i) => {
    const pct = leftPct(i)
    const isEdge = i === 0 || i === points.length - 1
    const farEnough = pct - lastPct >= minGapPct && pct <= 100 - minGapPct
    if (isEdge || farEnough) {
      // Mittel-Label fallen lassen, falls es dem letzten Label zu nahe käme.
      if (i === points.length - 1 && axisLabels.length > 0 && pct - lastPct < minGapPct - 2) {
        axisLabels.pop()
      }
      axisLabels.push({ i, pct })
      lastPct = pct
    }
  })

  const activePoint = points[active] ?? points[points.length - 1]
  const activeCx = x(active)
  const activeCy = y(activePoint.value)
  const activePct = leftPct(active)

  /** Pointer-Position → nächstgelegener Punkt-Index (anhand der x-Position). */
  function indexFromClientX(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return active
    const fracX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const targetX = fracX * VB_W
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(i) - targetX)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return best
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (points.length < 2) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
    setActive(indexFromClientX(e.clientX))
  }
  // Mit der Maus genügt Darüberfahren – „hovern" ist dort die erwartete Geste,
  // und ohne sie bliebe der Wert eines Punktes nur per Ziehen ablesbar. Auf dem
  // Touchscreen feuert `pointermove` ohnehin erst nach dem Aufsetzen.
  function handlePointerMove(e: React.PointerEvent) {
    if (!scrubbing && e.pointerType !== 'mouse') return
    setActive(indexFromClientX(e.clientX))
  }
  /** Maus weg → zurück auf die jüngste Ablesung (der Ruhezustand der Blase). */
  function handlePointerLeave(e: React.PointerEvent) {
    if (scrubbing || e.pointerType !== 'mouse') return
    setActive(points.length - 1)
  }
  function endScrub(e: React.PointerEvent) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setScrubbing(false)
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (points.length < 2) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.min(points.length - 1, i + 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(points.length - 1)
    }
  }

  const bubbleValue = `${numFmt.format(activePoint.value)}${unit ? ` ${unit}` : ''}`
  const bubbleDate = formatBubbleDate(activePoint.date)

  return (
    <div className="w-full">
      {/* Mitlaufende Wert-Blase (Apple-Wetter-Stil) über dem Graphen. */}
      <div className="relative h-9">
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-xl bg-surface px-2.5 py-1 text-center shadow-sm ring-1 ring-border transition-[left] duration-75"
          style={{ left: `clamp(2.5rem, ${activePct}%, calc(100% - 2.5rem))` }}
        >
          <span className="block text-sm font-bold leading-tight tabular-nums text-foreground">
            {bubbleValue}
          </span>
          <span className="block text-[10px] leading-tight tabular-nums text-muted">
            {bubbleDate}
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto touch-none select-none focus:outline-none"
        role="slider"
        tabIndex={points.length > 1 ? 0 : -1}
        aria-label={t('monitoring.readings.scrubLabel')}
        aria-valuemin={0}
        aria-valuemax={points.length - 1}
        aria-valuenow={active}
        aria-valuetext={`${bubbleDate}: ${bubbleValue}`}
        style={{ cursor: points.length > 1 ? 'ew-resize' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Heizperioden-Band: zuerst gezeichnet, damit Linie, Fläche und Punkte
            darüber liegen. Sehr dezent – es ordnet ein, es konkurriert nicht. */}
        {heatingBands.map((band) => (
          <rect
            key={band.x}
            x={band.x}
            y={PAD_TOP}
            width={band.width}
            height={innerH}
            fill="var(--color-foreground)"
            opacity={0.05}
          />
        ))}
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
        {/* Scrubber-Führungslinie + hervorgehobener aktiver Punkt. */}
        {points.length > 1 && (
          <line
            x1={activeCx}
            y1={PAD_TOP}
            x2={activeCx}
            y2={baseline}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.5}
          />
        )}
        {coords.map((c, i) =>
          points[i].refill !== undefined ? (
            // Lieferung: offener Ring statt gefülltem Punkt.
            <circle
              key={i}
              cx={c.cx}
              cy={c.cy}
              r={4}
              fill="var(--color-surface)"
              stroke={color}
              strokeWidth={1.8}
            />
          ) : (
            <circle key={i} cx={c.cx} cy={c.cy} r={i === active ? 2 : 3} fill={color} />
          ),
        )}
        {/* Aktiver Punkt mit Halo, damit der Scrub-Wert klar ablesbar ist. */}
        <circle
          cx={activeCx}
          cy={activeCy}
          r={4.5}
          fill={color}
          stroke="var(--color-surface)"
          strokeWidth={2}
        />
      </svg>

      {/* Zeit-proportionale x-Achsen-Labels (absolut an ihrer echten Position). */}
      <div className="relative mt-1 h-3.5">
        {axisLabels.map(({ i, pct }) => (
          <span
            key={i}
            className="absolute top-0 text-[10px] text-muted tabular-nums"
            style={{
              left: `${pct}%`,
              transform:
                i === 0
                  ? 'translateX(0)'
                  : i === points.length - 1
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
            }}
          >
            {formatAxisDate(points[i].date)}
          </span>
        ))}
      </div>
      <p className="mt-1 text-right text-[10px] text-muted tabular-nums">
        {numFmt.format(rawMin)}–{numFmt.format(rawMax)}
        {unit ? ` ${unit}` : ''}
      </p>
    </div>
  )
}
