/**
 * Die Form des Jahres: zwölf Monatswerte als weiche Fläche.
 *
 * Das ist das Bildmotiv, das nur eine Energie-App hat — Winterhoch, Sommertal.
 * Es erscheint erst, wenn ein voller Heizzyklus gemessen ist; vorher wäre die
 * Kurve ein Fragment und der Reifegrad-Sprung eine Enttäuschung.
 *
 * Bewusst ohne Achsen, Gitter und Werte: Die Zahl steht darüber, hier geht es
 * um die Gestalt. Als reines SVG ohne Bibliothek, damit es in jedem Theme über
 * `currentColor` und die Trägerfarbe funktioniert.
 */
interface YearCurveProps {
  /** Zwölf Monatswerte, ältester zuerst. */
  values: number[]
  /** Farbe des Trägers, dessen Jahr gezeigt wird. */
  color: string
  /** Beschriftung für Screenreader – die Kurve selbst trägt keine Zahlen. */
  label: string
}

const W = 320
const H = 64

export function YearCurve({ values, color, label }: YearCurveProps) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  if (!(max > 0)) return null

  const step = W / (values.length - 1)
  const points = values.map((v, i) => ({
    x: i * step,
    // 4 px Luft oben, damit der Scheitel nicht am Rand klebt.
    y: H - 4 - (v / max) * (H - 10),
  }))

  // Weiche Kurve über Catmull-Rom-artige Kontrollpunkte: eine Polylinie
  // wirkte wie ein Diagramm, gemeint ist eine Gestalt.
  const d = points
    .map((p, i) => {
      if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`
      const prev = points[i - 1]
      const cx = (prev.x + p.x) / 2
      return `C${cx.toFixed(1)},${prev.y.toFixed(1)} ${cx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')

  const last = points[points.length - 1]
  const gradientId = `year-curve-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Der jüngste Monat bekommt einen Punkt – das Jetzt in der Gestalt. */}
      <circle cx={last.x} cy={last.y} r="3" fill="var(--surface)" stroke={color} strokeWidth="2" />
    </svg>
  )
}
