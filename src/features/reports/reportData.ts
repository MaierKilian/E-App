import type { OnboardingData } from '@/types'
import type { MeasurementId, MeasurementResult, MeasurementRating } from '@/features/measurements/types'
import type { EnergyType, MeterReading } from '@/store/readingsStore'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { ENERGY_META, activeEnergyTypes } from '@/features/monitoring/energyConfig'
import { sortByDate, stats } from '@/features/monitoring/readings'

/**
 * Reine Datensammlung für den Berichte-Bereich.
 * Wandelt Profil, Mess-Ergebnisse und Monitoring-Ablesungen in ein
 * strukturiertes, leersicheres Objekt um – ohne jegliche Formatierung
 * (Zahlen/Datum bleiben roh; Labels werden erst im PDF/UI übersetzt).
 */

/** Kurz-Profilfelder, die in jedem Bericht erscheinen. */
export interface ReportProfileShort {
  profileName: string
  buildingType: OnboardingData['buildingType']
  livingArea: number
  buildingYear: number
  personsCount: number
  heatGenerators: OnboardingData['heatGenerators']
  hotWaterType: OnboardingData['hotWaterType']
}

/** Zusätzliche Profilfelder nur für den Langbericht. */
export interface ReportProfileLong {
  floors: number
  windowAge: OnboardingData['windowAge']
  insulationState: OnboardingData['insulationState']
  ventilationType: OnboardingData['ventilationType']
  hasPV: OnboardingData['hasPV']
  goals: OnboardingData['goals']
  lastRenovationYear: OnboardingData['lastRenovationYear']
  renovationItems: OnboardingData['renovationItems']
  occupancyStatus: OnboardingData['occupancyStatus']
}

/** Ein erledigtes Mess-Ergebnis für den Bericht. */
export interface ReportMeasurement {
  id: MeasurementId
  primaryValue: number
  unit: string
  rating: MeasurementRating
}

/** Monitoring-Auswertung je Energieträger. */
export interface ReportMonitoringEntry {
  type: EnergyType
  unit: string
  /** Letzter Zählerstand (oder undefined, wenn keine Ablesung). */
  latestValue?: number
  /** Datum der letzten Ablesung (ISO yyyy-mm-dd). */
  latestDate?: string
  /** Anzahl erfasster Ablesungen. */
  readingCount: number
  /** Verbrauch im letzten Abschnitt (kWh/Einheit), falls ≥ 2 Ablesungen. */
  lastConsumption?: number
  /** Hochrechnung auf ein Jahr. */
  projectedYear?: number
  /** Jahreskosten in Euro (nur bei Energieträgern mit Kosten). */
  projectedYearCost?: number
}

export interface ReportData {
  generatedAt: string
  profileShort: ReportProfileShort
  profileLong: ReportProfileLong
  measurements: ReportMeasurement[]
  monitoring: ReportMonitoringEntry[]
}

export interface BuildReportArgs {
  profile: OnboardingData
  measurementResults: Partial<Record<MeasurementId, MeasurementResult>>
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>
  /** Arbeitspreis in ct/kWh für die Kostenhochrechnung. */
  workPriceCt?: number
}

/** Sammelt die Kurz-Profilfelder. */
function buildProfileShort(profile: OnboardingData): ReportProfileShort {
  return {
    profileName: profile.profileName ?? '',
    buildingType: profile.buildingType,
    livingArea: profile.livingArea,
    buildingYear: profile.buildingYear,
    personsCount: profile.personsCount,
    heatGenerators: profile.heatGenerators ?? [],
    hotWaterType: profile.hotWaterType,
  }
}

/** Sammelt die Lang-Profilfelder. */
function buildProfileLong(profile: OnboardingData): ReportProfileLong {
  return {
    floors: profile.floors,
    windowAge: profile.windowAge,
    insulationState: profile.insulationState,
    ventilationType: profile.ventilationType,
    hasPV: profile.hasPV,
    goals: profile.goals ?? [],
    lastRenovationYear: profile.lastRenovationYear,
    renovationItems: profile.renovationItems ?? [],
    occupancyStatus: profile.occupancyStatus,
  }
}

/**
 * Erledigte Mess-Ergebnisse in stabiler Katalog-Reihenfolge.
 * Nur Ergebnisse mit gültigem Hauptwert werden aufgenommen.
 */
function buildMeasurements(
  results: Partial<Record<MeasurementId, MeasurementResult>>,
): ReportMeasurement[] {
  const out: ReportMeasurement[] = []
  for (const meta of MEASUREMENT_CATALOG) {
    const r = results[meta.id]
    if (!r || !Number.isFinite(r.primaryValue)) continue
    out.push({
      id: r.id,
      primaryValue: r.primaryValue,
      unit: r.unit,
      rating: r.rating,
    })
  }
  return out
}

/** Monitoring-Auswertung je aktivem Energieträger. */
function buildMonitoring(
  profile: OnboardingData,
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  workPriceCt?: number,
): ReportMonitoringEntry[] {
  const types = activeEnergyTypes(profile)
  return types.map((type) => {
    const meta = ENERGY_META[type]
    const readings = sortByDate(readingsByType[type] ?? [])
    const latest = readings.length > 0 ? readings[readings.length - 1] : undefined

    const entry: ReportMonitoringEntry = {
      type,
      unit: meta.unit,
      latestValue: latest?.value,
      latestDate: latest?.date,
      readingCount: readings.length,
    }

    if (readings.length >= 2) {
      const s = stats(readings, meta.hasCost ? workPriceCt : undefined)
      entry.lastConsumption = s.lastConsumptionKwh
      entry.projectedYear = s.projectedYearKwh
      if (meta.hasCost) entry.projectedYearCost = s.projectedYearCostEur
    }

    return entry
  })
}

/**
 * Baut das vollständige, leersichere Berichts-Datenobjekt.
 * Reine Funktion – keine Seiteneffekte, keine Formatierung.
 */
export function buildReportData({
  profile,
  measurementResults,
  readingsByType,
  workPriceCt,
}: BuildReportArgs): ReportData {
  return {
    generatedAt: new Date().toISOString(),
    profileShort: buildProfileShort(profile),
    profileLong: buildProfileLong(profile),
    measurements: buildMeasurements(measurementResults),
    monitoring: buildMonitoring(profile, readingsByType, workPriceCt),
  }
}
