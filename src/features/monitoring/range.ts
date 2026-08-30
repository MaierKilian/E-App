import type { MeterConfig, MeterReading } from '@/store/readingsStore'
import { counterSeries, meterMode } from './counterSeries'
import { stats } from './readings'
import { dayShare } from './seasonality'

/**
 * Reichweite eines Vorrats: Wann ist der Tank voraussichtlich leer?
 *
 * Das ist die Antwort, die ein Zähler nicht geben kann. Ein Zählwerk kann nur
 * mahnen „lies mich ab"; ein Vorrat kann sagen, wie lange er noch reicht – und
 * damit, wann bestellt werden muss.
 *
 * Siehe `docs/tank-concept.md`, Abschnitt 6.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Weiter als so wird nicht gerechnet. Wer bei diesem Verbrauch über zwei Jahre
 * käme, hat entweder einen absurd großen Vorrat oder unbrauchbare Daten –
 * beides ist keine Aussage wert.
 */
const MAX_DAYS = 730

/** Womit die Reichweite gerechnet wurde – gehört an die Zahl. */
export type RangeBasis =
  /** Über das Monatsprofil gewichtet: Heizenergie verbraucht sich ungleich. */
  | 'seasonal'
  /** Gleichmäßig über die Tage verteilt (flacher Jahresgang). */
  | 'linear'

export interface RangeEstimate {
  /** Voraussichtliches Leerdatum als ISO-Datum (yyyy-mm-dd). */
  emptyDate: string
  /** Tage von heute bis dahin (≥ 0). */
  days: number
  /** Wie gerechnet wurde. */
  basis: RangeBasis
}

/** Lokales ISO-Datum (yyyy-mm-dd) ohne Zeitzonen-Verschiebung. */
function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Schätzt, wann der Vorrat aufgebraucht ist.
 *
 * **Jahreszeitlich gewichtet, nicht linear.** 500 l im Oktober reichen deutlich
 * kürzer als 500 l im April – der Heizverbrauch schwankt übers Jahr um etwa den
 * Faktor acht (siehe `seasonality.ts`). Eine lineare Rechnung – Restvorrat
 * geteilt durch Tagesverbrauch – läge im Herbst also viel zu optimistisch und
 * im Frühjahr zu pessimistisch. Gerechnet wird deshalb vorwärts: Tag für Tag
 * wird der jahreszeitliche Anteil am Jahresverbrauch abgezogen, bis nichts
 * mehr da ist.
 *
 * Beide Mengen stehen in derselben Einheit. Ohne hinterlegtes Fassungsvermögen
 * sind das Prozent – die Rechnung geht dann genauso auf, weshalb die Reichweite
 * auch ohne Tankgröße funktioniert (Konzept Abschnitt 4).
 *
 * @param level Aktueller Füllstand.
 * @param yearlyConsumption Jahresverbrauch aus `stats().projectedYearKwh`.
 * @param options `seasonal`: Heizenergie – Monatsprofil statt Gleichverteilung.
 *                `today`: Bezugstag (Vorgabe: heute).
 * @returns `undefined`, wenn keine belastbare Aussage möglich ist – ohne
 *          Jahres-Hochrechnung, bei leerem Vorrat oder jenseits von
 *          {@link MAX_DAYS}. Lieber keine Zahl als eine falsche; dieselbe
 *          Zurückhaltung wie bei `MIN_PROJECTION_DAYS` in `readings.ts`.
 */
export function rangeUntilEmpty(
  level: number,
  yearlyConsumption: number | undefined,
  options: { seasonal?: boolean; today?: Date } = {},
): RangeEstimate | undefined {
  if (!Number.isFinite(level) || level <= 0) return undefined
  if (
    yearlyConsumption === undefined ||
    !Number.isFinite(yearlyConsumption) ||
    yearlyConsumption <= 0
  ) {
    return undefined
  }

  const today = options.today ?? new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const basis: RangeBasis = options.seasonal ? 'seasonal' : 'linear'

  let remaining = level
  const cursor = new Date(start)
  for (let days = 0; days < MAX_DAYS; days++) {
    // Ohne Monatsprofil verbraucht sich der Vorrat gleichmäßig über 365 Tage.
    const share = options.seasonal ? dayShare(cursor) : 1 / 365
    remaining -= share * yearlyConsumption
    cursor.setDate(cursor.getDate() + 1)
    if (remaining <= 0) {
      return {
        emptyDate: toIso(cursor),
        days: Math.round((cursor.getTime() - start.getTime()) / MS_PER_DAY),
        basis,
      }
    }
  }
  return undefined
}

/**
 * Ab wann gewarnt wird, dass nachbestellt werden sollte.
 *
 * Gemessen wird in **Reichweite, nicht in Prozent**. Eine Öllieferung hat
 * Vorlauf – vom Anruf bis zum Tankwagen vergehen je nach Marktlage Tage bis
 * Wochen. „Unter 25 %" wäre deshalb im Dezember zu spät und im Mai unnötig
 * früh; sechs Wochen Reichweite passen in beiden Fällen.
 */
export const REFILL_WARNING_DAYS = 42

/** true → der Vorrat reicht keine sechs Wochen mehr. */
export function isRefillDue(range: RangeEstimate | undefined): boolean {
  return range !== undefined && range.days <= REFILL_WARNING_DAYS
}

/**
 * Reichweite eines Zählers – der Weg, den die Oberfläche nimmt.
 *
 * Bündelt die drei Schritte an einer Stelle, damit Widget, Detailseite und
 * Erinnerung nicht jeder für sich denselben Dreiklang aus virtueller
 * Zählerreihe, Jahres-Hochrechnung und Vorwärtsrechnung zusammenbauen – und
 * dabei auseinanderlaufen.
 *
 * Ein Zählwerk hat keine Reichweite: Es zählt, was war, und weiß nichts über
 * einen Vorrat. Für `counter` kommt deshalb immer `undefined` zurück.
 */
export function meterRange(
  readings: MeterReading[],
  config: MeterConfig | undefined,
  options: { seasonal?: boolean; today?: Date } = {},
): RangeEstimate | undefined {
  if (meterMode(config) !== 'level') return undefined
  const latest = readings.length > 0 ? readings[readings.length - 1] : undefined
  if (latest === undefined) return undefined
  // `seasonal` muss **beide** Schritte erreichen: die Jahres-Hochrechnung und
  // die Vorwärtsrechnung. Ginge es nur in die zweite, träfe ein linear
  // gestreckter Jahreswert auf eine saisonal gewichtete Kurve – bei einem im
  // Sommer gemessenen Tank wäre der Jahresverbrauch dann um ein Vielfaches zu
  // niedrig und die Reichweite entsprechend zu optimistisch. Genau der Fehler,
  // gegen den das Monatsprofil überhaupt existiert.
  const yearly = stats(counterSeries(readings, config), undefined, {
    seasonal: options.seasonal,
  }).projectedYearKwh
  return rangeUntilEmpty(latest.value, yearly, options)
}
