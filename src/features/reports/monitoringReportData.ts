import type { OnboardingData } from '@/types'
import type { EnergyType, MeterReading } from '@/store/readingsStore'
import { ENERGY_META, activeEnergyTypes } from '@/features/monitoring/energyConfig'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import { resolvePrice } from '@/store/tariffStore'
import { sortByDate } from '@/features/monitoring/readings'

/** Tarif-Store-State (nur zum Auflösen der Preise, ohne UI-Abhängigkeit). */
export type TariffLike = Parameters<typeof resolvePrice>[0]

/**
 * Reine Datenaufbereitung für die Monitoring-Berichte.
 * Je gewähltem aktivem Energieträger: Filterung nach Zeitraum, Verbrauch,
 * Hochrechnung, Kosten und Vergleich zur Vorperiode. Keine Formatierung.
 */

/** Zeitraum in Tagen ab jetzt; `null` = alle Ablesungen. */
export type RangeDays = 7 | 30 | 90 | null

/** Ein Diagramm-Punkt (Zählerstand zu einem Datum). */
export interface ChartPoint {
  date: string
  value: number
}

/** Auswertung eines Energieträgers für den Bericht. */
export interface MonitoringEntry {
  type: EnergyType
  unit: string
  hasCost: boolean
  /** Anzahl Ablesungen im Zeitraum. */
  readingCount: number
  /** Erste/letzte Ablesung im ausgewerteten Fenster (ISO). */
  windowFrom?: string
  windowTo?: string
  /** Aktueller (letzter) Zählerstand. */
  currentValue?: number
  /** Datum des letzten Stands (ISO). */
  currentDate?: string
  /** Verbrauch im Zeitraum (Summe der Segmente). */
  consumption?: number
  /**
   * Tage zwischen erster und letzter Ablesung im Fenster – die Basis, über die
   * `perDay` und `projectedYear` tatsächlich gemittelt sind (nicht die Länge
   * des gewählten Zeitraums).
   */
  days?: number
  /** Ø Verbrauch pro Tag. */
  perDay?: number
  /** Hochrechnung auf ein Jahr. */
  projectedYear?: number
  /** Jahreskosten in € (nur wenn ein Preis hinterlegt bzw. voreingestellt ist). */
  costYear?: number
  /** Arbeitspreis, aus dem `costYear` hergeleitet wurde (Anzeige-Einheit). */
  priceWork?: number
  /** Anzeige-Einheit des Arbeitspreises, z. B. 'ct/kWh'. */
  priceUnit?: string
  /** Prozentuale Änderung zur gleich langen Vorperiode (undefined falls n/a). */
  changePercent?: number
  /** Diagramm-Punkte (gefiltert auf Zeitraum). */
  points: ChartPoint[]
  /** Letzte Ablesungen für die Historie (neueste zuletzt). */
  history: MeterReading[]
}

export interface MonitoringReportData {
  rangeDays: RangeDays
  entries: MonitoringEntry[]
  /** Frühestes/spätestes Ablesedatum über alle ausgewerteten Träger (ISO). */
  from?: string
  to?: string
  /** Summe der ausgewerteten Ablesungen über alle Träger. */
  readingCount: number
}

export interface BuildMonitoringArgs {
  profile: OnboardingData
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>
  rangeDays: RangeDays
  /** Tarif-Store-State; liefert die Preise aller kostenfähigen Träger. */
  tariff?: TariffLike
  /** Optional: nur diese Energieträger (default: alle aktiven). */
  types?: EnergyType[]
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Verbrauch über die gegebenen Ablesungen: letzter minus erster Stand.
 * Robust auch bei Ablesungen am selben Tag (Tagesabstand spielt keine Rolle).
 * Negative Differenzen (Zählerwechsel) gelten als nicht auswertbar.
 */
function consumptionOf(readings: MeterReading[]): number | undefined {
  const sorted = sortByDate(readings)
  if (sorted.length < 2) return undefined
  const diff = sorted[sorted.length - 1].value - sorted[0].value
  return Number.isFinite(diff) && diff >= 0 ? diff : undefined
}

/** Filtert Ablesungen auf das Fenster [from, to] (inkl.). */
function inWindow(readings: MeterReading[], fromMs: number, toMs: number): MeterReading[] {
  return readings.filter((r) => {
    const t = new Date(`${r.date}T00:00:00`).getTime()
    return Number.isFinite(t) && t >= fromMs && t <= toMs
  })
}

/** Tagesabstand zwischen zwei ISO-Daten (kann 0 sein). */
function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00`).getTime()
  const b = new Date(`${toIso}T00:00:00`).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((b - a) / MS_PER_DAY)
}

/** Wertet einen einzelnen Energieträger aus. */
function buildEntry(
  type: EnergyType,
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  rangeDays: RangeDays,
  tariff?: TariffLike,
): MonitoringEntry {
  const meta = ENERGY_META[type]
  const priceMeta = PRICE_META[type]
  const all = sortByDate(readingsByType[type] ?? [])
  const latest = all.length > 0 ? all[all.length - 1] : undefined

  const entry: MonitoringEntry = {
    type,
    unit: meta.unit,
    // Kostenfähig ist jeder Träger mit Preis-Metadaten (Strom, Wärmepumpe,
    // Wasser, Gas, Öl, Pellets) – nicht nur Strom.
    hasCost: priceMeta !== undefined,
    readingCount: 0,
    currentValue: latest?.value,
    currentDate: latest?.date,
    points: [],
    history: [],
  }

  if (all.length === 0) return entry

  const nowMs = Date.now()
  let windowReadings: MeterReading[]
  let prevReadings: MeterReading[] = []

  if (rangeDays === null) {
    windowReadings = all
  } else {
    const fromMs = nowMs - rangeDays * MS_PER_DAY
    const prevFromMs = nowMs - 2 * rangeDays * MS_PER_DAY
    windowReadings = inWindow(all, fromMs, nowMs)
    prevReadings = inWindow(all, prevFromMs, fromMs)
  }

  entry.readingCount = windowReadings.length
  entry.points = windowReadings.map((r) => ({ date: r.date, value: r.value }))
  entry.history = windowReadings.slice(-8)
  if (windowReadings.length > 0) {
    entry.windowFrom = windowReadings[0].date
    entry.windowTo = windowReadings[windowReadings.length - 1].date
  }

  // Basis der Mittelung ist der tatsächlich abgelesene Abstand, nicht die
  // Länge des gewählten Zeitraums – sonst wäre jede Hochrechnung zu niedrig,
  // sobald die Ablesungen das Fenster nicht ausfüllen.
  const spanDays =
    entry.windowFrom && entry.windowTo ? daysBetween(entry.windowFrom, entry.windowTo) : 0
  entry.days = spanDays > 0 ? spanDays : undefined

  const consumption = consumptionOf(windowReadings)
  if (consumption !== undefined) {
    entry.consumption = consumption
    // Ohne echten Tagesabstand (nur eine Ablesung oder alle am selben Tag)
    // gibt es keine belastbare Rate – dann bleiben perDay/Hochrechnung leer.
    const perDay = spanDays > 0 ? consumption / spanDays : undefined
    if (perDay !== undefined && Number.isFinite(perDay)) {
      entry.perDay = perDay
      entry.projectedYear = perDay * 365
      const work = priceMeta && tariff ? resolvePrice(tariff, type).work : undefined
      if (priceMeta && typeof work === 'number' && Number.isFinite(work)) {
        entry.costYear = entry.projectedYear * work * priceMeta.priceToEur
        entry.priceWork = work
        entry.priceUnit = priceMeta.priceUnit
      }
    }
  }

  // Vergleich zur Vorperiode (gleich langes Fenster davor).
  if (rangeDays !== null && consumption !== undefined && consumption > 0) {
    const prevConsumption = consumptionOf(prevReadings)
    if (prevConsumption !== undefined && prevConsumption > 0) {
      entry.changePercent = ((consumption - prevConsumption) / prevConsumption) * 100
    }
  }

  return entry
}

/** Auswählbare Zeiträume, vom kürzesten zum längsten. */
const RANGE_CANDIDATES: Exclude<RangeDays, null>[] = [7, 30, 90]

/**
 * Schlägt den Zeitraum vor, mit dem der Bericht nicht leer bleibt: der kürzeste,
 * in dem mindestens ein Zähler zwei Ablesungen hat – sonst „Alle".
 *
 * Ein fester 30-Tage-Default liefert bei monatlicher oder unregelmäßiger
 * Ablesung ein leeres Diagramm und Kennzahlen ohne Wert.
 */
export function suggestRangeDays(
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  types: EnergyType[],
): RangeDays {
  const nowMs = Date.now()
  for (const days of RANGE_CANDIDATES) {
    const fromMs = nowMs - days * MS_PER_DAY
    const enough = types.some((type) => inWindow(readingsByType[type] ?? [], fromMs, nowMs).length >= 2)
    if (enough) return days
  }
  return null
}

/**
 * Baut das Monitoring-Berichts-Datenobjekt.
 * Reine Funktion, robust bei < 2 Ablesungen.
 */
export function buildMonitoringReportData({
  profile,
  readingsByType,
  rangeDays,
  tariff,
  types,
}: BuildMonitoringArgs): MonitoringReportData {
  const active = activeEnergyTypes(profile)
  const filter = types && types.length > 0 ? new Set(types) : undefined
  const selected = filter ? active.filter((t) => filter.has(t)) : active
  const entries = selected.map((type) => buildEntry(type, readingsByType, rangeDays, tariff))

  // Gesamt-Zeitraum über alle Träger (für die Kopfzeile des Berichts).
  const froms = entries.map((e) => e.windowFrom).filter((d): d is string => Boolean(d))
  const tos = entries.map((e) => e.windowTo).filter((d): d is string => Boolean(d))

  return {
    rangeDays,
    entries,
    from: froms.length > 0 ? froms.reduce((a, b) => (a < b ? a : b)) : undefined,
    to: tos.length > 0 ? tos.reduce((a, b) => (a > b ? a : b)) : undefined,
    readingCount: entries.reduce((sum, e) => sum + e.readingCount, 0),
  }
}
