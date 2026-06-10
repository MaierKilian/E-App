import type { OnboardingData } from '@/types'
import type { EnergyType, MeterReading } from '@/store/readingsStore'
import { ENERGY_META, activeEnergyTypes } from '@/features/monitoring/energyConfig'
import { sortByDate, consumptionSegments } from '@/features/monitoring/readings'

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
  /** Aktueller (letzter) Zählerstand. */
  currentValue?: number
  /** Datum des letzten Stands (ISO). */
  currentDate?: string
  /** Verbrauch im Zeitraum (Summe der Segmente). */
  consumption?: number
  /** Anzahl Tage des ausgewerteten Fensters. */
  days?: number
  /** Ø Verbrauch pro Tag. */
  perDay?: number
  /** Hochrechnung auf ein Jahr. */
  projectedYear?: number
  /** Jahreskosten in € (nur hasCost). */
  costYear?: number
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
}

export interface BuildMonitoringArgs {
  profile: OnboardingData
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>
  rangeDays: RangeDays
  /** Arbeitspreis in ct/kWh für Kostenhochrechnung. */
  workPriceCt?: number
  /** Optional: nur diese Energieträger (default: alle aktiven). */
  types?: EnergyType[]
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Verbrauchssumme über die gegebenen (bereits sortierten) Ablesungen. */
function consumptionOf(readings: MeterReading[]): number | undefined {
  const segs = consumptionSegments(readings)
  if (segs.length === 0) return undefined
  return segs.reduce((sum, s) => sum + s.kwh, 0)
}

/** Filtert Ablesungen auf das Fenster [from, to] (inkl.). */
function inWindow(readings: MeterReading[], fromMs: number, toMs: number): MeterReading[] {
  return readings.filter((r) => {
    const t = new Date(`${r.date}T00:00:00`).getTime()
    return Number.isFinite(t) && t >= fromMs && t <= toMs
  })
}

/** Wertet einen einzelnen Energieträger aus. */
function buildEntry(
  type: EnergyType,
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  rangeDays: RangeDays,
  workPriceCt?: number,
): MonitoringEntry {
  const meta = ENERGY_META[type]
  const all = sortByDate(readingsByType[type] ?? [])
  const latest = all.length > 0 ? all[all.length - 1] : undefined

  const entry: MonitoringEntry = {
    type,
    unit: meta.unit,
    hasCost: meta.hasCost,
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
  let windowDays: number

  if (rangeDays === null) {
    windowReadings = all
    const firstMs = new Date(`${all[0].date}T00:00:00`).getTime()
    windowDays = Math.max(1, Math.round((nowMs - firstMs) / MS_PER_DAY))
  } else {
    const fromMs = nowMs - rangeDays * MS_PER_DAY
    const prevFromMs = nowMs - 2 * rangeDays * MS_PER_DAY
    windowReadings = inWindow(all, fromMs, nowMs)
    prevReadings = inWindow(all, prevFromMs, fromMs)
    windowDays = rangeDays
  }

  entry.readingCount = windowReadings.length
  entry.days = windowDays
  entry.points = windowReadings.map((r) => ({ date: r.date, value: r.value }))
  entry.history = windowReadings.slice(-8)

  const consumption = consumptionOf(windowReadings)
  if (consumption !== undefined) {
    entry.consumption = consumption
    const perDay = windowDays > 0 ? consumption / windowDays : undefined
    if (perDay !== undefined && Number.isFinite(perDay)) {
      entry.perDay = perDay
      entry.projectedYear = perDay * 365
      if (meta.hasCost && typeof workPriceCt === 'number' && Number.isFinite(workPriceCt)) {
        entry.costYear = entry.projectedYear * (workPriceCt / 100)
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

/**
 * Baut das Monitoring-Berichts-Datenobjekt.
 * Reine Funktion, robust bei < 2 Ablesungen.
 */
export function buildMonitoringReportData({
  profile,
  readingsByType,
  rangeDays,
  workPriceCt,
  types,
}: BuildMonitoringArgs): MonitoringReportData {
  const active = activeEnergyTypes(profile)
  const filter = types && types.length > 0 ? new Set(types) : undefined
  const selected = filter ? active.filter((t) => filter.has(t)) : active

  return {
    rangeDays,
    entries: selected.map((type) => buildEntry(type, readingsByType, rangeDays, workPriceCt)),
  }
}
