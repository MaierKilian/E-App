import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RangeDays } from '@/features/reports/monitoringReportData'
import type { ReportSections } from '@/features/reports/reportTypes'

/**
 * Zuletzt benutzte Einstellungen des Berichts.
 *
 * Berichte werden typischerweise regelmäßig gleich zusammengestellt; ohne
 * Persistenz müsste die Auswahl jedes Mal neu getroffen werden.
 */

/** `'auto'` = Zeitraum aus den vorhandenen Ablesungen ableiten. */
export type StoredRange = RangeDays | 'auto'

interface ReportSettingsState {
  sections: ReportSections
  range: StoredRange
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

/** Übernimmt aus einem gespeicherten Stand nur die heute gültigen Felder. */
function restore(persisted: unknown): Pick<ReportSettingsState, 'sections' | 'range'> {
  const p = (persisted ?? {}) as Partial<ReportSettingsState>
  return { sections: pickSections(p.sections), range: p.range ?? 'auto' }
}

export const useReportSettingsStore = create<ReportSettingsState>()(
  persist(
    (set) => ({
      sections: DEFAULT_SECTIONS,
      range: 'auto',
      setSections: (sections) => set({ sections }),
      setRange: (range) => set({ range }),
    }),
    {
      name: 'eapp-report-settings',
      // v2: Inhalts-, Zähler- und Gewerke-Auswahl entfallen zugunsten der
      //     Abschnitte.
      // v3: Der Profil-Abschnitt entfällt; ein gespeichertes `profile`-Feld
      //     wird verworfen.
      // v4: Kurz-/Langbericht entfällt; ein gespeichertes `variant` wird
      //     verworfen.
      // Ältere Stände haben die neuen Felder nicht und starten mit den
      // Defaults; der Zeitraum bleibt erhalten.
      version: 4,
      // Bewusst Feld für Feld statt `...persisted`: abgelegte Felder (`profile`,
      // `variant`) liefen sonst als unbekannte Eigenschaften in den Zustand
      // zurück und blieben dort für immer stehen.
      migrate: (persisted) => restore(persisted) as ReportSettingsState,
      merge: (persisted, current) => ({ ...current, ...restore(persisted) }),
    },
  ),
)
