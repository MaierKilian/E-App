import type { MeterReading } from '@/store/readingsStore'

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

export interface ReadingStats {
  /** Verbrauch im letzten Abschnitt (kWh) oder undefined bei < 2 Ablesungen. */
  lastConsumptionKwh?: number
  /** Durchschnittlicher Verbrauch pro Tag (kWh) über den letzten Abschnitt. */
  perDayKwh?: number
  /** Hochrechnung auf ein Jahr (365 Tage) in kWh. */
  projectedYearKwh?: number
  /** Kosten des letzten Abschnitts in Euro (falls Preis bekannt). */
  lastCostEur?: number
  /** Hochgerechnete Jahreskosten in Euro (falls Preis bekannt). */
  projectedYearCostEur?: number
}

/** Sortiert Ablesungen aufsteigend nach Datum, bei Gleichstand nach Erfassungszeit. */
export function sortByDate(readings: MeterReading[]): MeterReading[] {
  return [...readings].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  )
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
 * Berechnet Kennzahlen aus den Ablesungen.
 * @param readings Liste der Ablesungen.
 * @param workPriceCt Arbeitspreis in ct/kWh (für Kosten); 0/undefined → keine Kosten.
 */
export function stats(readings: MeterReading[], workPriceCt?: number): ReadingStats {
  const segments = consumptionSegments(readings)
  if (segments.length === 0) return {}

  const last = segments[segments.length - 1]
  const lastConsumptionKwh = last.kwh
  const perDayKwh = last.days > 0 ? last.kwh / last.days : undefined
  const projectedYearKwh = perDayKwh !== undefined ? perDayKwh * 365 : undefined

  const hasPrice = typeof workPriceCt === 'number' && Number.isFinite(workPriceCt)
  const priceEur = hasPrice ? workPriceCt / 100 : undefined

  const lastCostEur = priceEur !== undefined ? lastConsumptionKwh * priceEur : undefined
  const projectedYearCostEur =
    priceEur !== undefined && projectedYearKwh !== undefined
      ? projectedYearKwh * priceEur
      : undefined

  return {
    lastConsumptionKwh,
    perDayKwh,
    projectedYearKwh,
    lastCostEur,
    projectedYearCostEur,
  }
}
