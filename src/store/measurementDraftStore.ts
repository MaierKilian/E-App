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
 *
 * Freie Bezeichnungen (Standby-Geräteliste) liegen unter demselben Feldnamen in
 * `draftLabels` – dieselbe Trennung wie bei `MeasurementResult.details`/`labels`.
 */
interface MeasurementDraftState {
  drafts: Record<string, Record<string, number>>
  draftLabels: Record<string, Record<string, string>>
  /** Felder eines Entwurfs ergänzen/überschreiben. */
  setDraft: (key: string, patch: Record<string, number>) => void
  /**
   * Entwurf vollständig ersetzen statt zu ergänzen. Nötig für Listen, die auch
   * schrumpfen: `setDraft` entfernt nichts, ein gelöschtes Gerät bliebe sonst
   * unter seinem alten `dev{index}` stehen.
   */
  replaceDraft: (
    key: string,
    values: Record<string, number>,
    labels?: Record<string, string>,
  ) => void
  /** Entwurf einer abgeschlossenen/verworfenen Messung entfernen. */
  clearDraft: (key: string) => void
  /** Alle Entwürfe löschen (Daten-Reset). */
  resetDrafts: () => void
}

export const useMeasurementDraftStore = create<MeasurementDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      draftLabels: {},
      setDraft: (key, patch) =>
        set((s) => ({
          drafts: { ...s.drafts, [key]: { ...(s.drafts[key] ?? {}), ...patch } },
        })),
      replaceDraft: (key, values, labels) =>
        set((s) => ({
          drafts: { ...s.drafts, [key]: values },
          draftLabels: { ...s.draftLabels, [key]: labels ?? {} },
        })),
      clearDraft: (key) =>
        set((s) => {
          if (!(key in s.drafts) && !(key in s.draftLabels)) return s
          const drafts = { ...s.drafts }
          const draftLabels = { ...s.draftLabels }
          delete drafts[key]
          delete draftLabels[key]
          return { drafts, draftLabels }
        }),
      resetDrafts: () => set({ drafts: {}, draftLabels: {} }),
    }),
    {
      name: 'eapp-measurement-drafts',
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<MeasurementDraftState>),
        drafts: (persisted as Partial<MeasurementDraftState>)?.drafts ?? {},
        draftLabels: (persisted as Partial<MeasurementDraftState>)?.draftLabels ?? {},
      }),
    },
  ),
)

/** Liest einen Entwurf (oder ein leeres Objekt). Außerhalb von React nutzbar. */
export function readDraft(key: string): Record<string, number> {
  return useMeasurementDraftStore.getState().drafts[key] ?? {}
}

/** Liest die Bezeichnungen eines Entwurfs (oder ein leeres Objekt). */
export function readDraftLabels(key: string): Record<string, string> {
  return useMeasurementDraftStore.getState().draftLabels[key] ?? {}
}
