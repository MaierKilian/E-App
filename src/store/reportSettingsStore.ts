import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RangeDays } from '@/features/reports/monitoringReportData'
import type { ReportSections, ReportVariant } from '@/features/reports/reportTypes'

/**
 * Zuletzt benutzte Einstellungen des Berichts.
 *
 * Berichte werden typischerweise regelmäßig gleich zusammengestellt; ohne
 * Persistenz müsste die Auswahl jedes Mal neu getroffen werden.
 */

/** `'auto'` = Zeitraum aus den vorhandenen Ablesungen ableiten. */
export type StoredRange = RangeDays | 'auto'

interface ReportSettingsState {
  variant: ReportVariant
  sections: ReportSections
  range: StoredRange
  setVariant: (variant: ReportVariant) => void
  setSections: (sections: ReportSections) => void
  setRange: (range: StoredRange) => void
}

const DEFAULT_SECTIONS: ReportSections = {
  profile: true,
  measurements: true,
  monitoring: true,
}

export const useReportSettingsStore = create<ReportSettingsState>()(
  persist(
    (set) => ({
      variant: 'short',
      sections: DEFAULT_SECTIONS,
      range: 'auto',
      setVariant: (variant) => set({ variant }),
      setSections: (sections) => set({ sections }),
      setRange: (range) => set({ range }),
    }),
    {
      name: 'eapp-report-settings',
      // v2: Inhalts-, Zähler- und Gewerke-Auswahl entfallen zugunsten der
      // Abschnitte. Ältere Stände haben diese Felder nicht und starten mit den
      // Defaults; Umfang und Zeitraum bleiben erhalten.
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<ReportSettingsState>
        return { ...p, sections: p.sections ?? DEFAULT_SECTIONS } as ReportSettingsState
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReportSettingsState>
        return {
          ...current,
          ...p,
          sections: { ...DEFAULT_SECTIONS, ...(p.sections ?? {}) },
        }
      },
    },
  ),
)
