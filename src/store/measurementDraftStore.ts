import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Zwischenspeicher für noch nicht abgeschlossene Messungen.
 *
 * Manche Checks (Kühlschrank, Gefriertruhe) laufen über Stunden bzw. Tage
 * (Temperatur stabilisiert sich; ein Energiekostenmessgerät zählt ~24 h). Damit
 * der Nutzer die App zwischendurch schließen und später nahtlos weitermachen
 * kann, werden die bereits erfassten Eingaben hier persistiert – getrennt von
 * den finalen Ergebnissen (measurementsStore).
 *
 * Schlüssel ist der `instanceKey(id, roomKey)` der Messung; der Wert eine
 * lose Sammlung numerischer Felder (messungsspezifisch interpretiert).
 */
interface MeasurementDraftState {
  drafts: Record<string, Record<string, number>>
  /** Felder eines Entwurfs ergänzen/überschreiben. */
  setDraft: (key: string, patch: Record<string, number>) => void
  /** Entwurf einer abgeschlossenen/verworfenen Messung entfernen. */
  clearDraft: (key: string) => void
  /** Alle Entwürfe löschen (Daten-Reset). */
  resetDrafts: () => void
}

export const useMeasurementDraftStore = create<MeasurementDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (key, patch) =>
        set((s) => ({
          drafts: { ...s.drafts, [key]: { ...(s.drafts[key] ?? {}), ...patch } },
        })),
      clearDraft: (key) =>
        set((s) => {
          if (!(key in s.drafts)) return s
          const next = { ...s.drafts }
          delete next[key]
          return { drafts: next }
        }),
      resetDrafts: () => set({ drafts: {} }),
    }),
    {
      name: 'eapp-measurement-drafts',
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<MeasurementDraftState>),
        drafts: (persisted as Partial<MeasurementDraftState>)?.drafts ?? {},
      }),
    },
  ),
)

/** Liest einen Entwurf (oder ein leeres Objekt). Außerhalb von React nutzbar. */
export function readDraft(key: string): Record<string, number> {
  return useMeasurementDraftStore.getState().drafts[key] ?? {}
}
