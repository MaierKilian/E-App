import {
  MEASUREMENT_THRESHOLDS,
  type ThresholdOrigin,
} from '@/features/education/measurementThresholds'

/**
 * Der Vergleichsmaßstab einer Messung – für die Mess-Übersicht im Bericht.
 *
 * **Warum es das braucht.** Die Übersicht druckte eine Spalte „Bewertung" mit
 * dem Wort („gut", „hoch") und keinen Maßstab. Wer den Bericht in die Hand
 * bekommt, kann eine Bewertung ohne Vergleichswert nicht prüfen – sie ist
 * dann eine Behauptung, keine Aussage.
 *
 * **Keine Zahl steht doppelt.** Die Werte kommen aus
 * `education/measurementThresholds.ts`, das sie seinerseits aus den
 * Mess-Modulen importiert. Ändert jemand eine Grenze im Modul, ändert sich der
 * Bericht mit.
 */

/** Der Zielbereich einer Messung – die Zeile, die „gut" bedeutet. */
export function targetRange(id: string): string | undefined {
  const table = MEASUREMENT_THRESHOLDS[id as keyof typeof MEASUREMENT_THRESHOLDS]
  if (!table) return undefined
  // Der Zielbereich ist der brauchbare Maßstab: „dein Wert gegen den, der gut
  // wäre". Tabellen ohne `good`-Zeile ordnen nur ein (das Raumklima hat ein
  // Band je Raumtyp, und welcher Raum gemeint ist, weiß die Übersicht nicht) –
  // dort bleibt die Spalte leer, statt eine beliebige Zeile zu zeigen.
  return table.rows.find((row) => row.rating === 'good')?.range
}

/** Herkunft der Werte einer Messung. */
export function originOf(id: string): ThresholdOrigin | undefined {
  return MEASUREMENT_THRESHOLDS[id as keyof typeof MEASUREMENT_THRESHOLDS]?.origin
}

export interface SourceEntry {
  /** Laufende Nummer, wie sie hinter dem Richtwert steht. */
  index: number
  label: string
  /** Fehlt bei Richtwerten der E-App und bei offenen Werten. */
  url?: string
  stand?: string
  /** Begründung, wo es keine Fremdquelle gibt. */
  reason?: string
  /** true = noch zu klären, nicht bewusst gesetzt. */
  pending?: boolean
  /** Messungen, die auf diesen Eintrag verweisen. */
  measurementIds: string[]
}

/**
 * Das Quellenverzeichnis für die im Bericht vorkommenden Messungen.
 *
 * Gleiche Quellen werden zusammengefasst – Kühl- und Gefrier-Check teilen sich
 * eine, und zweimal dieselbe Zeile im Verzeichnis wäre nur Länge. Die Nummer
 * folgt der Reihenfolge des ersten Auftretens, damit sie beim Lesen von oben
 * nach unten aufsteigt.
 */
export function buildSourceList(ids: readonly string[]): SourceEntry[] {
  const out: SourceEntry[] = []
  const byKey = new Map<string, SourceEntry>()

  for (const id of ids) {
    const origin = originOf(id)
    if (!origin) continue
    const key =
      origin.kind === 'reference' ? `ref:${origin.source.url}` : `${origin.kind}:${id}`
    const existing = byKey.get(key)
    if (existing) {
      existing.measurementIds.push(id)
      continue
    }
    const entry: SourceEntry =
      origin.kind === 'reference'
        ? {
            index: out.length + 1,
            label: origin.source.label,
            url: origin.source.url,
            stand: origin.source.stand,
            measurementIds: [id],
          }
        : {
            index: out.length + 1,
            label: '',
            reason: origin.reason,
            pending: origin.kind === 'pending',
            measurementIds: [id],
          }
    byKey.set(key, entry)
    out.push(entry)
  }
  return out
}

/** Die Nummer, die hinter dem Richtwert einer Messung steht. */
export function sourceIndexOf(sources: readonly SourceEntry[], id: string): number | undefined {
  return sources.find((s) => s.measurementIds.includes(id))?.index
}
