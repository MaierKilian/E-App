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
  measurements: true,
  monitoring: true,
}

/**
 * Nur die heute bekannten Abschnitte übernehmen. Gespeicherte Stände können
 * abgelegte Abschnitte (z. B. `profile`) enthalten – die dürfen nicht als
 * unbekanntes Feld in den Zustand zurücklaufen.
 */
function pickSections(stored: Partial<ReportSections> | undefined): ReportSections {
  return {
    measurements: stored?.measurements ?? DEFAULT_SECTIONS.measurements,
    monitoring: stored?.monitoring ?? DEFAULT_SECTIONS.monitoring,
  }
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
      //     Abschnitte.
      // v3: Der Profil-Abschnitt entfällt; ein gespeichertes `profile`-Feld
      //     wird verworfen.
      // Ältere Stände haben die neuen Felder nicht und starten mit den
      // Defaults; Umfang und Zeitraum bleiben erhalten.
      version: 3,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<ReportSettingsState>
        return { ...p, sections: pickSections(p.sections) } as ReportSettingsState
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReportSettingsState>
        return { ...current, ...p, sections: pickSections(p.sections) }
      },
    },
  ),
)
