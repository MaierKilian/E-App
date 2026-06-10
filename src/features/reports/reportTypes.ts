import type { MeasurementCategory } from '@/features/measurements/catalog'
import type { EnergyType } from '@/store/readingsStore'
import type { RangeDays } from './monitoringReportData'

/** Kurz- oder Langfassung eines Berichts. */
export type ReportVariant = 'short' | 'long'

/** Die drei Berichtstypen. */
export type ReportType = 'measurements' | 'monitoring' | 'total'

/** An-/abwählbare Inhalte des Berichts (Builder). */
export interface ReportContentOptions {
  // Monitoring
  charts: boolean
  kpis: boolean
  comparison: boolean
  history: boolean
  // Messungen
  savings: boolean
  tips: boolean
  openMeasurements: boolean
}

/** Vollständige Builder-Auswahl, die an die Generatoren übergeben wird. */
export interface ReportBuilderState {
  type: ReportType
  variant: ReportVariant
  options: ReportContentOptions
  rangeDays: RangeDays
  /** Ausgewählte Energieträger (leer = alle aktiven). */
  meters: EnergyType[]
  /** Ausgewählte Gewerke (leer = alle). */
  categories: MeasurementCategory[]
}

/** Liefert die sinnvollen Default-Häkchen je Variante. */
export function defaultContentOptions(variant: ReportVariant): ReportContentOptions {
  const long = variant === 'long'
  return {
    charts: true,
    kpis: true,
    comparison: true,
    history: long,
    savings: true,
    tips: long,
    openMeasurements: long,
  }
}
