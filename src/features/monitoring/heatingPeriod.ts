import type { EnergyType } from '@/store/readingsStore'

/**
 * Die Heizperiode – als Hintergrund des Verlaufsdiagramms.
 *
 * An einer steigenden Zählerkurve ist nicht zu sehen, ob der Verbrauch dann
 * entstand, als geheizt werden musste. Das hinterlegte Band ordnet den Verlauf
 * ein: Steigt die Linie im hellen Bereich spürbar, lief etwas, das im Sommer
 * nicht laufen müsste.
 *
 * **Was hier bewusst nicht steht.** Das Band beschreibt, es bewertet nicht. Ein
 * Sommer-Check, der aus dem Sommerverbrauch einen Befund ableitete, war am
 * 05.09.2026 kurz da und ist auf Kilians Wunsch wieder entfallen (Punkt 24 in
 * `docs/gefundene-probleme.md`).
 */

/**
 * Erster Monat der Heizperiode (0-basiert: 9 = Oktober).
 *
 * 1. Oktober bis 30. April ist die in Deutschland eingebürgerte Heizperiode –
 * die Spanne, die Mietverträge und Heizkostenabrechnungen ansetzen. Sie ist
 * eine Konvention, keine Messung: Meteorologisch beginnt ein Heiztag, wenn das
 * Tagesmittel unter die Heizgrenze von 15 °C fällt (Gradtagzahl G20/15, VDI
 * 3807), und das schwankt von Jahr zu Jahr und von Region zu Region. Für eine
 * Einordnung im Hintergrund reicht die Konvention.
 */
export const HEATING_START_MONTH = 9
/** Letzter Monat der Heizperiode (0-basiert: 3 = April). */
export const HEATING_END_MONTH = 3

/** Ein Zeitraum in Millisekunden seit Epoche. */
export interface TimeSpan {
  from: number
  to: number
}

/** Liegt dieser Monat (0-basiert) in der Heizperiode? */
export function isHeatingMonth(month: number): boolean {
  return month >= HEATING_START_MONTH || month <= HEATING_END_MONTH
}

/**
 * Träger, für die eine Heizperiode überhaupt etwas bedeutet.
 *
 * Solarthermie fehlt bewusst, obwohl sie zur Wärme zählt: Sie liefert im Sommer
 * am meisten. Ein Band, das ihre stärkste Zeit als „außerhalb" markiert, würde
 * in die Irre führen. Strom und Wasser haben keinen Jahresgang, der sich daran
 * einordnen ließe.
 */
const HEATING_TYPES: ReadonlySet<EnergyType> = new Set<EnergyType>([
  'gas',
  'oil',
  'pellets',
  'heat_pump',
])

/** true → für diesen Träger wird die Heizperiode hinterlegt. */
export function hasHeatingSeason(type: EnergyType): boolean {
  return HEATING_TYPES.has(type)
}

/**
 * Alle Heizperioden, die sich mit [from, to] überschneiden – auf die Spanne
 * zugeschnitten.
 *
 * Eine Heizperiode läuft über den Jahreswechsel, deshalb wird sie über ihr
 * **Startjahr** aufgezählt: Oktober des Jahres bis April des Folgejahres.
 */
export function heatingSpans(from: number, to: number): TimeSpan[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return []
  const spans: TimeSpan[] = []
  const firstYear = new Date(from).getFullYear() - 1
  const lastYear = new Date(to).getFullYear()
  for (let year = firstYear; year <= lastYear; year++) {
    const start = new Date(year, HEATING_START_MONTH, 1).getTime()
    // Ende exklusiv: der 1. Mai des Folgejahres, damit der 30. April noch
    // vollständig dazugehört.
    const end = new Date(year + 1, HEATING_END_MONTH + 1, 1).getTime()
    const clippedFrom = Math.max(start, from)
    const clippedTo = Math.min(end, to)
    if (clippedTo > clippedFrom) spans.push({ from: clippedFrom, to: clippedTo })
  }
  return spans
}
