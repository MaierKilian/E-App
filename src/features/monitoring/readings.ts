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

/** Trend des Tagesverbrauchs: letzter Abschnitt gegenüber dem vorletzten. */
export interface ConsumptionTrend {
  /** Tagesverbrauch im letzten Abschnitt. */
  perDay: number
  /** Richtung gegenüber dem vorherigen Abschnitt. */
  direction: 'up' | 'down' | 'flat'
  /** Relative Änderung (z. B. 0.12 = +12 %), falls ein Vergleich möglich ist. */
  changePct?: number
}

/**
 * Vergleicht den Tagesverbrauch der letzten beiden Abschnitte.
 * Liefert undefined, wenn dafür zu wenige (verwertbare) Ablesungen vorliegen.
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
  const direction = Math.abs(changePct) < 0.03 ? 'flat' : changePct > 0 ? 'up' : 'down'
  return { perDay, direction, changePct }
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
 * @param eurPerUnit Preis in € pro Zähler-Einheit (z. B. €/kWh, €/m³);
 *                   0/undefined → keine Kosten.
 */
export function stats(readings: MeterReading[], eurPerUnit?: number): ReadingStats {
  const segments = consumptionSegments(readings)
  if (segments.length === 0) return {}

  const last = segments[segments.length - 1]
  const lastConsumptionKwh = last.kwh
  const perDayKwh = last.days > 0 ? last.kwh / last.days : undefined
  const projectedYearKwh = perDayKwh !== undefined ? perDayKwh * 365 : undefined

  const priceEur =
    typeof eurPerUnit === 'number' && Number.isFinite(eurPerUnit) ? eurPerUnit : undefined

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
