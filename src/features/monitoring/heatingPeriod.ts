import type { EnergyType, MeterReading } from '@/store/readingsStore'
import { consumptionInWindow, consumptionSegments } from './readings'
import { DEFAULT_KWH_PER_UNIT } from './specificValues'
import { HEAT_CONVERSION } from '@/features/measurements/showerhead/hotWaterEnergy'
import {
  DELTA_T,
  GOOD_MAX,
  MINUTES_PER_SHOWER,
  SHOWERS_PER_PERSON_PER_DAY,
  WH_PER_LITER_PER_K,
} from '@/features/measurements/showerhead/showerhead'

/**
 * Heizperiode und Sommer-Check: Läuft die Heizung wirklich nur, wenn sie soll?
 *
 * **Die Frage.** Außerhalb der Heizperiode geht Gas, Öl oder Pellets praktisch
 * vollständig ins Warmwasser – Raumwärme braucht im Hochsommer niemand. Bleibt
 * der Verbrauch dann trotzdem hoch, läuft etwas, das nicht laufen müsste: ein
 * Kessel ohne Sommerabschaltung, der sich rund um die Uhr warmhält, eine
 * Zirkulationspumpe im Dauerlauf, eine zu hoch gesetzte Heizgrenze. Das sind
 * die Fälle, die niemand bemerkt, weil sie kein Geräusch machen und auf der
 * Jahresrechnung nicht getrennt ausgewiesen sind.
 *
 * **Warum das ohne Wetterdaten geht.** Der Vergleichsmaßstab kommt nicht aus
 * einem Klimamodell, sondern aus dem Haushalt selbst: Der gemessene
 * Sommerverbrauch **ist** der Warmwasser-Grundbedarf. Er wird gegen den
 * erwarteten Warmwasserbedarf gehalten, den die App aus der Personenzahl schon
 * kennt. Beides sind eigene Zahlen der App – keine externe Abfrage, kein
 * Standort, keine Einwilligung.
 *
 * **Was hier bewusst nicht steht.** Eine Witterungsbereinigung („war der
 * Mehrverbrauch das Wetter oder ich?") braucht die tatsächlichen Gradtage des
 * laufenden Jahres und damit eine Wetter-Schnittstelle. Siehe Punkt 24 in
 * `docs/gefundene-probleme.md`.
 */

/**
 * Erster Monat der Heizperiode (0-basiert: 9 = Oktober).
 *
 * 1. Oktober bis 30. April ist die in Deutschland eingebürgerte Heizperiode –
 * die Spanne, die Mietverträge und Heizkostenabrechnungen ansetzen. Sie ist
 * eine Konvention, keine Messung: Meteorologisch beginnt ein Heiztag, wenn das
 * Tagesmittel unter die Heizgrenze von 15 °C fällt (Gradtagzahl G20/15, VDI
 * 3807), und das schwankt von Jahr zu Jahr und von Region zu Region.
 *
 * Für die Frage „läuft die Heizung im Sommer mit?" reicht die Konvention: Der
 * Befund entsteht ohnehin aus dem Sommerfenster unten, das mit Absicht weit
 * innerhalb jeder denkbaren heizfreien Zeit liegt.
 */
export const HEATING_START_MONTH = 9
/** Letzter Monat der Heizperiode (0-basiert: 3 = April). */
export const HEATING_END_MONTH = 3

/**
 * Das Fenster, in dem in Deutschland sicher nicht geheizt wird: 15. Juni bis
 * 31. August.
 *
 * Bewusst enger als „außerhalb der Heizperiode": Mai und September tragen in
 * kühlen Jahren echten Heizbedarf, und ein Befund, der einen kalten Mai als
 * Fehler auslegt, wäre falsch. Der Richtwert ist damit einer der E-App und
 * begründet, keine übernommene Norm.
 */
const SUMMER_START = { month: 5, day: 15 }
const SUMMER_END = { month: 7, day: 31 }

/**
 * So viele Sommertage müssen von Ablesungen abgedeckt sein, damit der Check
 * etwas sagt.
 *
 * Unter drei Wochen entscheidet ein einzelner Ableseabstand alles – und wer
 * einmal im Juli und einmal im September abliest, hat den Sommer nicht
 * gemessen, sondern gestreift.
 */
export const MIN_SUMMER_DAYS = 21

/**
 * Erwarteter Warmwasserbedarf je Person und Tag in nutzbarer Wärme (kWh).
 *
 * Abgeleitet aus denselben Konstanten, mit denen der Duschkopf-Check rechnet –
 * eine Dusche am Tag, fünf Minuten, bei einem gerade noch sparsamen Durchfluss
 * ({@link GOOD_MAX}), Temperaturhub {@link DELTA_T}. Das ergibt rund 1,4 kWh
 * je Person und Tag bzw. gut 500 kWh im Jahr und deckt sich mit den üblichen
 * Angaben von 500–600 kWh je Person.
 *
 * Bewusst hergeleitet statt danebengeschrieben: Ändert der Duschkopf-Check
 * seine Annahmen, zieht dieser Maßstab mit. Dieselbe Regel wie bei den
 * Richtwerten im Wissensbereich.
 */
export const HOT_WATER_KWH_PER_PERSON_DAY =
  (SHOWERS_PER_PERSON_PER_DAY * MINUTES_PER_SHOWER * GOOD_MAX * DELTA_T * WH_PER_LITER_PER_K) / 1000

/**
 * Ab welchem Vielfachen des erwarteten Warmwasserbedarfs der Sommerverbrauch
 * auffällig ist.
 *
 * Auch ein sauber eingestellter Kessel verliert im Sommer etwas: Er hält sich
 * warm, taktet für das Warmwasser und hat Verteilverluste. Das Anderthalbfache
 * ist deshalb noch unauffällig. Beim Zweieinhalbfachen geht dagegen mehr als
 * die Hälfte des Sommerverbrauchs für etwas anderes als warmes Wasser drauf –
 * das ist der Bereich, in dem eine fehlende Sommerabschaltung oder eine
 * durchlaufende Zirkulationspumpe liegt.
 *
 * Richtwerte der E-App, begründet – keine belegte Quelle.
 */
const RATIO_GOOD_MAX = 1.5
const RATIO_MEDIUM_MAX = 2.5

const MS_PER_DAY = 86_400_000

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
 * Alle Heizperioden, die sich mit [from, to] überschneiden – auf die Spanne
 * zugeschnitten.
 *
 * Speist das Band hinter dem Verlaufsdiagramm. Eine Heizperiode läuft über den
 * Jahreswechsel, deshalb wird sie über ihr **Startjahr** aufgezählt: Oktober
 * des Jahres bis April des Folgejahres.
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

/** Die Sommerfenster (15.6.–31.8.) aller Jahre, die [from, to] berührt. */
function summerSpans(from: number, to: number): TimeSpan[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return []
  const spans: TimeSpan[] = []
  for (
    let year = new Date(from).getFullYear();
    year <= new Date(to).getFullYear();
    year++
  ) {
    const start = new Date(year, SUMMER_START.month, SUMMER_START.day).getTime()
    // Ende exklusiv: 1. September.
    const end = new Date(year, SUMMER_END.month + 1, 1).getTime()
    const clippedFrom = Math.max(start, from)
    const clippedTo = Math.min(end, to)
    if (clippedTo > clippedFrom) spans.push({ from: clippedFrom, to: clippedTo })
  }
  return spans
}

/**
 * Welche Wärmequelle steht hinter diesem Zähler?
 *
 * Nur Träger, die überhaupt heizen. Solarthermie fehlt bewusst: Sie liefert im
 * Sommer am meisten und kostet nichts – ein hoher Sommerwert ist dort das Ziel,
 * nicht der Befund.
 */
const HEAT_SOURCE: Partial<Record<EnergyType, keyof typeof HEAT_CONVERSION>> = {
  gas: 'gas',
  oil: 'oil',
  pellets: 'pellets',
  heat_pump: 'heat_pump',
}

/** true → für diesen Träger ist der Sommer-Check sinnvoll. */
export function hasSummerCheck(type: EnergyType): boolean {
  return HEAT_SOURCE[type] !== undefined
}

export type SummerRating = 'good' | 'medium' | 'high'

export interface SummerHeatCheck {
  /** Gemessener Sommerverbrauch in Zähler-Einheiten je Tag. */
  measuredPerDay: number
  /** Erwarteter Warmwasserbedarf in Zähler-Einheiten je Tag. */
  expectedPerDay: number
  /** measured / expected – 1,0 heißt „genau der Warmwasserbedarf". */
  ratio: number
  rating: SummerRating
  /** Wie viele Sommertage Ablesungen abdecken – die Belastbarkeit des Befunds. */
  daysCovered: number
  /**
   * Hochgerechnet auf ein Jahr: Wie viele Zähler-Einheiten über den
   * Warmwasserbedarf hinaus im Sommer anfallen. Nur gesetzt, wenn überhaupt
   * ein Überschuss besteht.
   */
  excessPerSummer?: number
}

interface CheckOptions {
  type: EnergyType
  /** Personen im Haushalt – der Maßstab für den erwarteten Bedarf. */
  persons: number
  /** Energieinhalt je Zähler-Einheit; ohne Angabe der Standard des Trägers. */
  kwhPerUnit?: number
}

/**
 * Vergleicht den gemessenen Sommerverbrauch mit dem erwarteten
 * Warmwasserbedarf.
 *
 * Gibt `undefined` zurück, wenn die Grundlage fehlt – zu wenige Sommertage,
 * keine Personenzahl, kein Wärmeträger. Ein Befund aus zu dünner Datenlage
 * wäre schlimmer als keiner: Er sähe genauso aus wie ein belastbarer.
 */
export function summerHeatCheck(
  readings: MeterReading[],
  { type, persons, kwhPerUnit }: CheckOptions,
): SummerHeatCheck | undefined {
  const source = HEAT_SOURCE[type]
  if (!source || !(persons > 0)) return undefined

  const segments = consumptionSegments(readings)
  if (segments.length === 0) return undefined

  const times = segments.flatMap((s) => [
    new Date(`${s.from}T00:00:00`).getTime(),
    new Date(`${s.to}T00:00:00`).getTime(),
  ])
  if (times.some((t) => !Number.isFinite(t))) return undefined

  let measuredUnits = 0
  let daysCovered = 0
  for (const span of summerSpans(Math.min(...times), Math.max(...times))) {
    measuredUnits += consumptionInWindow(segments, new Date(span.from), new Date(span.to))
    daysCovered += (span.to - span.from) / MS_PER_DAY
  }
  if (daysCovered < MIN_SUMMER_DAYS) return undefined

  const measuredPerDay = measuredUnits / daysCovered

  // Erwarteter Bedarf: nutzbare Wärme fürs Warmwasser, zurückgerechnet auf das,
  // was der Zähler davon sieht. Beim Brennstoff teilt der Wirkungsgrad, bei der
  // Wärmepumpe die Arbeitszahl – beide stehen in `HEAT_CONVERSION`.
  const heatKwhPerDay = persons * HOT_WATER_KWH_PER_PERSON_DAY
  const unitKwh = kwhPerUnit ?? DEFAULT_KWH_PER_UNIT[type] ?? 1
  const expectedPerDay = heatKwhPerDay / HEAT_CONVERSION[source] / unitKwh
  if (!(expectedPerDay > 0) || !Number.isFinite(measuredPerDay)) return undefined

  const ratio = measuredPerDay / expectedPerDay
  const rating: SummerRating =
    ratio <= RATIO_GOOD_MAX ? 'good' : ratio <= RATIO_MEDIUM_MAX ? 'medium' : 'high'

  const summerDays = summerLengthDays()
  const excess = (measuredPerDay - expectedPerDay) * summerDays
  return {
    measuredPerDay,
    expectedPerDay,
    ratio,
    rating,
    daysCovered: Math.round(daysCovered),
    ...(excess > 0 ? { excessPerSummer: excess } : {}),
  }
}

/** Länge des Sommerfensters in Tagen (15.6.–31.8. = 78). */
function summerLengthDays(): number {
  const year = 2001 // Kein Schaltjahr; das Fenster liegt ohnehin nach dem Februar.
  const start = new Date(year, SUMMER_START.month, SUMMER_START.day).getTime()
  const end = new Date(year, SUMMER_END.month + 1, 1).getTime()
  return Math.round((end - start) / MS_PER_DAY)
}
