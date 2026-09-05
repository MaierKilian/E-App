import type { MeterReading } from '@/store/readingsStore'
import { seasonalShareBetween } from './seasonality'

/**
 * Reine Berechnungen rund um Zählerstände.
 * Alle Funktionen sind seiteneffektfrei, NaN-sicher und robust gegen
 * fehlerhafte Eingaben (Zählerwechsel, Tippfehler, gleiche Daten).
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Ein Verbrauchsabschnitt zwischen zwei aufeinanderfolgenden Ablesungen. */
export interface ConsumptionSegment {
  /** Start-Ablesedatum (ISO yyyy-mm-dd). */
  from: string
  /** End-Ablesedatum (ISO yyyy-mm-dd). */
  to: string
  /** Anzahl Tage zwischen den Ablesungen (> 0). */
  days: number
  /** Verbrauch in diesem Abschnitt (Zählerstand-Differenz, > 0). */
  kwh: number
}

/**
 * Worauf die Jahres-Hochrechnung beruht – bestimmt, wie belastbar sie ist.
 * Die Oberfläche schreibt das an die Zahl, damit niemand eine Schätzung für
 * eine Messung hält.
 */
export type ProjectionBasis =
  /** Volle zwölf Monate gemessen – keine Hochrechnung nötig, echter Jahreswert. */
  | 'fullYear'
  /** Weniger als ein Jahr, über das Heizprofil auf zwölf Monate gewichtet. */
  | 'seasonal'
  /** Weniger als ein Jahr, linear gestreckt (nur für flache Träger wie Strom). */
  | 'linear'

export interface ReadingStats {
  /** Verbrauch im letzten Abschnitt (kWh) oder undefined bei < 2 Ablesungen. */
  lastConsumptionKwh?: number
  /** Dauer des letzten Abschnitts in Tagen (Zeitbezug für den Verbrauch). */
  lastConsumptionDays?: number
  /** Durchschnittlicher Verbrauch pro Tag (kWh) über den letzten Abschnitt. */
  perDayKwh?: number
  /** Verbrauch auf ein Jahr bezogen (kWh) – siehe `projectionBasis`. */
  projectedYearKwh?: number
  /** Kosten des letzten Abschnitts in Euro (falls Preis bekannt). */
  lastCostEur?: number
  /** Jahreskosten in Euro (falls Preis bekannt). */
  projectedYearCostEur?: number
  /** Wie `projectedYearKwh` zustande kam. */
  projectionBasis?: ProjectionBasis
  /** Zahl der tatsächlich gemessenen Tage, auf denen die Zahl beruht. */
  projectionDays?: number
}

/**
 * Kürzester Messzeitraum, aus dem überhaupt hochgerechnet wird. Darunter ist
 * das Ergebnis reines Rauschen – dann lieber keine Zahl als eine falsche.
 */
const MIN_PROJECTION_DAYS = 21
const DAYS_PER_YEAR = 365

/** Womit der aktuelle Tagesverbrauch verglichen wurde. */
export type TrendBaseline =
  /**
   * Derselbe Zeitraum ein Jahr zuvor – jahreszeitlich sauber. Kommt nur noch
   * aus {@link yearOverYearTrend}; {@link consumptionTrend} liefert das nicht.
   */
  | 'lastYear'
  /** Der vorherige Ableseabstand – bei Heizenergie jahreszeitlich verzerrt. */
  | 'previousPeriod'

/** Trend des Tagesverbrauchs im letzten Abschnitt. */
export interface ConsumptionTrend {
  /** Tagesverbrauch im letzten Abschnitt. */
  perDay: number
  /** Richtung gegenüber der Vergleichsbasis. */
  direction: 'up' | 'down' | 'flat'
  /** Relative Änderung (z. B. 0.12 = +12 %), falls ein Vergleich möglich ist. */
  changePct?: number
  /** Vergleichsbasis, falls verglichen wurde. */
  baseline?: TrendBaseline
}

/**
 * Vergleicht den Tagesverbrauch des letzten Abschnitts mit dem des
 * **vorhergehenden Abschnitts**.
 *
 * Verglichen wird ausschließlich kWh **pro Tag**: Ableseabstände sind
 * unterschiedlich lang, und ein längerer Abstand darf den Prozentwert nicht
 * bewegen. Wer am 1.1., 1.2. und 15.2. abliest, misst 31 und 14 Tage – bei
 * gleichem Tagesverbrauch kommt trotzdem 0 % heraus.
 *
 * Bis August 2026 wurde bevorzugt mit **demselben Zeitraum ein Jahr zuvor**
 * verglichen, um bei Heizenergie die Jahreszeit herauszurechnen. Das ging nach
 * hinten los: Deckt die Historie den Vorjahres-Zeitraum nur formal ab – etwa
 * weil zwischen zwei Ablesungen ein Jahr Abstand liegt –, verteilt
 * `consumptionInWindow` diesen einen Abschnitt gleichmäßig über alle Tage.
 * Verglichen wurde dann eine echte Messung gegen eine lineare Interpolation:
 * ein Nutzer sah „+52 %", obwohl sein Verbrauch praktisch unverändert war, und
 * die Bildunterschrift sprach dabei vom Vorzeitraum. Ein ehrlicher, saisonal
 * verzerrter Vergleich ist besser als ein erfundener; die Jahreszeit lässt
 * sich später über `seasonality.ts` sauber herausrechnen.
 *
 * Liefert undefined, wenn zu wenige (verwertbare) Ablesungen vorliegen, und
 * `changePct`/`baseline` ohne Wert, solange es keinen Vorgänger-Abschnitt
 * gibt – dann steht nur der Tagesverbrauch fest.
 */
export function consumptionTrend(readings: MeterReading[]): ConsumptionTrend | undefined {
  const segments = consumptionSegments(readings)
  if (segments.length === 0) return undefined
  const last = segments[segments.length - 1]
  const perDay = last.days > 0 ? last.kwh / last.days : 0

  if (segments.length < 2) return { perDay, direction: 'flat' }
  const prev = segments[segments.length - 2]
  const prevPerDay = prev.days > 0 ? prev.kwh / prev.days : 0
  if (prevPerDay <= 0) return { perDay, direction: 'flat' }
  const changePct = (perDay - prevPerDay) / prevPerDay
  return { perDay, direction: directionOf(changePct), changePct, baseline: 'previousPeriod' }
}

/**
 * Vergleicht die letzten 365 Tage mit den 365 Tagen davor.
 *
 * Gedacht für Stellen, die den **Jahreswert** anzeigen. `consumptionTrend`
 * misst den letzten Ableseabstand – neben einer Jahreszahl gelesen ergibt das
 * einen Widerspruch: „996 € · letzte 12 Monate" mit „−71 %" daneben liest sich
 * als „meine Jahreskosten sind um 71 % gesunken", gemeint war aber die
 * Momentaufnahme des letzten Ableseabstands. Hier beziehen sich Zahl und Badge
 * auf denselben Zeitraum, die naheliegende Lesart stimmt also.
 *
 * Liefert undefined, solange keine zwei vollen Jahre gemessen sind – dann gibt
 * es schlicht nichts Belastbares zu vergleichen.
 */
export function yearOverYearTrend(readings: MeterReading[]): ConsumptionTrend | undefined {
  const segments = consumptionSegments(readings)
  if (segments.length === 0) return undefined
  const first = parseIso(segments[0].from)
  const end = parseIso(segments[segments.length - 1].to)
  if (!first || !end) return undefined

  const yearStart = new Date(end.getTime() - DAYS_PER_YEAR * MS_PER_DAY)
  const prevStart = new Date(end.getTime() - 2 * DAYS_PER_YEAR * MS_PER_DAY)
  // Beide Jahre müssen tatsächlich von Ablesungen gedeckt sein.
  if (first > prevStart) return undefined

  const current = consumptionInWindow(segments, yearStart, end)
  const previous = consumptionInWindow(segments, prevStart, yearStart)
  if (previous <= 0) return undefined

  const changePct = (current - previous) / previous
  return {
    perDay: current / DAYS_PER_YEAR,
    direction: directionOf(changePct),
    changePct,
    baseline: 'lastYear',
  }
}

/** Unter 3 % Abweichung gilt der Verbrauch als unverändert. */
function directionOf(changePct: number): 'up' | 'down' | 'flat' {
  return Math.abs(changePct) < 0.03 ? 'flat' : changePct > 0 ? 'up' : 'down'
}

/** Tagesverbrauch je Abschnitt (für Sparklines), älteste zuerst. */
export function perDaySeries(readings: MeterReading[]): number[] {
  return consumptionSegments(readings).map((s) => (s.days > 0 ? s.kwh / s.days : 0))
}

/** Tage seit der letzten Ablesung (0 = heute), oder undefined ohne Ablesung. */
export function daysSinceLastReading(readings: MeterReading[], now = Date.now()): number | undefined {
  const sorted = sortByDate(readings)
  if (sorted.length === 0) return undefined
  const last = new Date(`${sorted[sorted.length - 1].date}T00:00:00`).getTime()
  if (!Number.isFinite(last)) return undefined
  return Math.max(0, Math.round((now - last) / MS_PER_DAY))
}

/** Sortiert Ablesungen aufsteigend nach Datum, bei Gleichstand nach Erfassungszeit. */
export function sortByDate(readings: MeterReading[]): MeterReading[] {
  return [...readings].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  )
}

/** ISO-Datum (yyyy-mm-dd) als lokales Date, oder undefined bei Unsinn. */
function parseIso(iso: string): Date | undefined {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isFinite(d.getTime()) ? d : undefined
}

/** Tagesdifferenz zwischen zwei ISO-Daten (kann negativ/0 sein). */
function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime()
  const to = new Date(`${toIso}T00:00:00`).getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  return Math.round((to - from) / MS_PER_DAY)
}

/**
 * Bildet Verbrauchsabschnitte zwischen je zwei aufeinanderfolgenden Ablesungen.
 * Abschnitte mit ≤ 0 Tagen oder negativem Verbrauch (Zählerwechsel, Tippfehler)
 * werden übersprungen.
 */
export function consumptionSegments(readings: MeterReading[]): ConsumptionSegment[] {
  const sorted = sortByDate(readings)
  const segments: ConsumptionSegment[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const days = daysBetween(prev.date, curr.date)
    const kwh = curr.value - prev.value
    if (days <= 0 || kwh < 0 || !Number.isFinite(kwh)) continue
    segments.push({ from: prev.date, to: curr.date, days, kwh })
  }
  return segments
}

/**
 * Verbrauch in einem Zeitfenster, anteilig aus den Abschnitten aufsummiert.
 * Ragt ein Abschnitt nur teilweise ins Fenster, zählt er anteilig nach Tagen.
 *
 * Exportiert für den Heizperioden-Check (`heatingPeriod.ts`): Ableseabstände
 * liegen so gut wie nie auf den Grenzen einer Heizperiode, und die anteilige
 * Zuordnung ist genau das, was dort gebraucht wird.
 */
export function consumptionInWindow(
  segments: ConsumptionSegment[],
  windowStart: Date,
  windowEnd: Date,
): number {
  let total = 0
  for (const seg of segments) {
    const from = parseIso(seg.from)
    const to = parseIso(seg.to)
    if (!from || !to || seg.days <= 0) continue
    const overlapStart = from > windowStart ? from : windowStart
    const overlapEnd = to < windowEnd ? to : windowEnd
    const overlapDays = (overlapEnd.getTime() - overlapStart.getTime()) / MS_PER_DAY
    if (overlapDays <= 0) continue
    total += (seg.kwh / seg.days) * overlapDays
  }
  return total
}

/**
 * Berechnet Kennzahlen aus den Ablesungen.
 *
 * **Jahreswert:** Bis Juli 2026 nahm diese Funktion allein den letzten
 * Ableseabstand und multiplizierte dessen Tagesrate mit 365. Bei Strom geht
 * das auf, bei Heizenergie nicht: eine Sommermessung ergab so rund ein
 * Viertel, eine Dezembermessung das Doppelte des wahren Jahresverbrauchs –
 * die Anzeige schwankte übers Jahr um den Faktor acht, ohne dass sich am
 * Verbrauch etwas änderte.
 *
 * Jetzt gestuft:
 * 1. Liegen ≥ 365 Tage Messung vor, wird das letzte Jahr aufsummiert. Das ist
 *    ein echter Jahreswert und deckt jeden Heizzyklus vollständig ab.
 * 2. Sonst wird bei `seasonal` über das Monatsprofil gewichtet (siehe
 *    `seasonality.ts`): gemessener Verbrauch geteilt durch den Jahresanteil,
 *    den der Messzeitraum abdeckt.
 * 3. Sonst linear auf 365 Tage gestreckt – richtig für flache Träger.
 *
 * Unter {@link MIN_PROJECTION_DAYS} Messtagen wird gar nicht hochgerechnet.
 *
 * @param readings Liste der Ablesungen.
 * @param eurPerUnit Preis in € pro Zähler-Einheit (z. B. €/kWh, €/m³);
 *                   0/undefined → keine Kosten.
 * @param options `seasonal`: Heizenergie (Gas/Öl/Pellets bzw. Wärmepumpe) –
 *                Monatsprofil anwenden statt linear zu strecken.
 */
export function stats(
  readings: MeterReading[],
  eurPerUnit?: number,
  options: { seasonal?: boolean } = {},
): ReadingStats {
  const segments = consumptionSegments(readings)
  if (segments.length === 0) return {}

  const last = segments[segments.length - 1]
  const lastConsumptionKwh = last.kwh
  const lastConsumptionDays = last.days
  const perDayKwh = last.days > 0 ? last.kwh / last.days : undefined

  const first = segments[0]
  const measuredStart = parseIso(first.from)
  const measuredEnd = parseIso(last.to)
  const measuredDays =
    measuredStart && measuredEnd
      ? Math.round((measuredEnd.getTime() - measuredStart.getTime()) / MS_PER_DAY)
      : 0

  let projectedYearKwh: number | undefined
  let projectionBasis: ProjectionBasis | undefined

  if (measuredStart && measuredEnd && measuredDays >= MIN_PROJECTION_DAYS) {
    if (measuredDays >= DAYS_PER_YEAR) {
      // Echter Jahreswert: die letzten 365 Tage aufsummiert.
      const windowStart = new Date(measuredEnd.getTime() - DAYS_PER_YEAR * MS_PER_DAY)
      projectedYearKwh = consumptionInWindow(segments, windowStart, measuredEnd)
      projectionBasis = 'fullYear'
    } else {
      const measuredKwh = consumptionInWindow(segments, measuredStart, measuredEnd)
      const share = options.seasonal
        ? seasonalShareBetween(measuredStart, measuredEnd)
        : measuredDays / DAYS_PER_YEAR
      if (share > 0) {
        projectedYearKwh = measuredKwh / share
        projectionBasis = options.seasonal ? 'seasonal' : 'linear'
      }
    }
  }

  const priceEur =
    typeof eurPerUnit === 'number' && Number.isFinite(eurPerUnit) ? eurPerUnit : undefined

  const lastCostEur = priceEur !== undefined ? lastConsumptionKwh * priceEur : undefined
  const projectedYearCostEur =
    priceEur !== undefined && projectedYearKwh !== undefined
      ? projectedYearKwh * priceEur
      : undefined

  return {
    lastConsumptionKwh,
    lastConsumptionDays,
    perDayKwh,
    projectedYearKwh,
    lastCostEur,
    projectedYearCostEur,
    projectionBasis,
    projectionDays: projectedYearKwh !== undefined ? measuredDays : undefined,
  }
}
