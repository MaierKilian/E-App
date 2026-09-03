// Geometrie der kleinen Verlaufskachel – getrennt von der Komponente, damit
// die Abstandsrechnung prüfbar ist, ohne einen Browser zu rendern.

import { isoToTime, timeAxisPositions } from '@/lib/timeAxis'

/**
 * Mindestabstand zweier Punkte in ViewBox-Einheiten. Zwei Ablesungen am selben
 * Tag dürfen nicht zu einem Strich verschmelzen; bei 100 Einheiten Breite sind
 * 3 gerade noch als eigener Punkt erkennbar.
 */
const MIN_POINT_GAP = 3

/** ViewBox der Kurve: Breite, Höhe, Rand. Die Anzeige skaliert darüber. */
export const W = 100
export const H = 36
export const PAD = 3

/** Zeichenfläche der Kurve (Breite abzüglich beider Ränder). */
const INNER_W = W - PAD * 2

/**
 * Waagerechte Position jedes Punktes.
 *
 * Ohne Daten bleibt es beim gleichmäßigen Abstand – richtig für die
 * Beispielkurve der Ghost-Vorschau, die gar keine Daten hat. Mit Daten
 * übernimmt dieselbe Achsenrechnung wie im großen Diagramm und im PDF-Verlauf:
 * Eine Ablesung nach einer Woche und eine nach drei Monaten standen hier bis
 * September 2026 gleich weit auseinander.
 *
 * `timeAxisPositions` fällt bei unlesbaren oder gleichen Daten selbst auf
 * gleichmäßig zurück – dort trägt die Zeitachse keine Information.
 */
export function sparklineOffsets(count: number, dates?: string[]): number[] {
  if (count < 2) return []
  if (dates?.length === count) return timeAxisPositions(dates.map(isoToTime), INNER_W, MIN_POINT_GAP)
  return Array.from({ length: count }, (_, i) => (INNER_W * i) / (count - 1))
}
