import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnergyType } from '@/store/readingsStore'
import type { MeasurementCategory } from '@/features/measurements/catalog'
import type { RangeDays } from '@/features/reports/monitoringReportData'
import {
  defaultContentOptions,
  type ReportContentOptions,
  type ReportVariant,
} from '@/features/reports/reportTypes'

/**
 * Zuletzt benutzte Einstellungen des Berichts-Builders.
 *
 * Berichte werden typischerweise regelmäßig mit derselben Zusammenstellung
 * erzeugt; ohne Persistenz müsste sie jedes Mal neu gewählt werden.
 */

/** `'auto'` = Zeitraum aus den vorhandenen Ablesungen ableiten. */
export type StoredRange = RangeDays | 'auto'

interface ReportSettingsState {
  variant: ReportVariant
  options: ReportContentOptions
  /**
   * Inhalte, die der Nutzer selbst gesetzt hat. Sie überleben einen
   * Variantenwechsel, alle übrigen folgen den Defaults der neuen Variante.
   */
  touched: (keyof ReportContentOptions)[]
  range: StoredRange
  /** Leer = alle verfügbaren (z. B. beim ersten Aufruf oder nach Profilwechsel). */
  meters: EnergyType[]
  categories: MeasurementCategory[]
  setVariant: (variant: ReportVariant, options: ReportContentOptions) => void
  setOptions: (options: ReportContentOptions, touched: (keyof ReportContentOptions)[]) => void
  setRange: (range: StoredRange) => void
  setMeters: (meters: EnergyType[]) => void
  setCategories: (categories: MeasurementCategory[]) => void
}

export const useReportSettingsStore = create<ReportSettingsState>()(
  persist(
    (set) => ({
      variant: 'short',
      options: defaultContentOptions('short'),
      touched: [],
      range: 'auto',
      meters: [],
      categories: [],
      setVariant: (variant, options) => set({ variant, options }),
      setOptions: (options, touched) => set({ options, touched }),
      setRange: (range) => set({ range }),
      setMeters: (meters) => set({ meters }),
      setCategories: (categories) => set({ categories }),
    }),
    {
      name: 'eapp-report-settings',
      // Gespeicherte Optionen robust mit den aktuellen Defaults zusammenführen,
      // damit ein neu hinzugekommener Inhalt nie als `undefined` ankommt.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReportSettingsState>
        return {
          ...current,
          ...p,
          options: { ...current.options, ...(p.options ?? {}) },
          touched: p.touched ?? [],
          meters: p.meters ?? [],
          categories: p.categories ?? [],
        }
      },
    },
  ),
)
