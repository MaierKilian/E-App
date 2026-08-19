import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { RatingBadge } from './RatingBadge'
import { RATING_COLOR } from './rating'
import type { MeasurementRating } from './types'

interface ResultHeroProps {
  rating: MeasurementRating
  /** Symbol für Checks ohne aussagekräftige Hauptzahl (z. B. qualitative Befunde). */
  icon?: LucideIcon
  /** Kleine Zeile über dem Hauptwert, etwa die Entnahmestelle oder der Raum. */
  eyebrow?: string
  /** Bereits formatierter Hauptwert. */
  value?: string
  /** Einheit neben dem Hauptwert. */
  unit?: string
  /** Eigenes Badge-Label, wo die neutrale Skala zu wenig sagt. */
  badgeLabel?: string
  /** Beschreibender Satz unter dem Badge. */
  summary?: ReactNode
  /** Zusatzinhalt am Fuß des Hero (Methodenhinweis, „geschätzt"-Chip). */
  children?: ReactNode
}

/**
 * Gemeinsamer Kopf aller Mess-Ergebnisse: getönter Hintergrund in der
 * Bewertungsfarbe, wahlweise Symbol oder Hauptzahl, Bewertungs-Badge und ein
 * erklärender Satz.
 *
 * Vorher hat jeder der neun Ergebnisschirme dieses Muster eigenständig
 * nachgebaut – samt kopierter `color-mix`-Strings und leicht abweichender
 * Schriftgrößen. Dadurch wirkte der Messungen-Bereich zufällig zusammengesetzt.
 *
 * Größenregel: Trägt eine Zahl das Ergebnis, steht sie groß (`text-5xl`).
 * Ergänzt sie nur ein Symbol, tritt sie zurück (`text-3xl`) – sonst
 * konkurrieren beide um dieselbe Aufmerksamkeit.
 */
export function ResultHero({
  rating,
  icon: Icon,
  eyebrow,
  value,
  unit,
  badgeLabel,
  summary,
  children,
}: ResultHeroProps) {
  const color = RATING_COLOR[rating]
  const valueSize = Icon ? 'text-3xl' : 'text-5xl'

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)` }}
      />
      <div className="relative flex flex-col items-center gap-2 py-1 text-center">
        {Icon && (
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Icon className="h-6 w-6" />
          </span>
        )}
        {eyebrow && <span className="text-xs font-medium text-muted">{eyebrow}</span>}
        {value !== undefined && (
          <div className="flex items-baseline gap-1.5">
            <span className={`${valueSize} font-bold tabular-nums text-foreground`}>{value}</span>
            {unit && <span className="text-lg font-medium text-muted">{unit}</span>}
          </div>
        )}
        <RatingBadge rating={rating} label={badgeLabel} />
        {summary && <p className="mt-1 max-w-sm text-sm text-muted">{summary}</p>}
        {children}
      </div>
    </div>
  )
}
