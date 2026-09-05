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
 * Freie Bezeichnungen stehen unter demselben Feldnamen in `labels` – dieselbe
 * Aufteilung wie beim fertigen `MeasurementResult` (`details` + `labels`), damit
 * ein Entwurf und das daraus entstehende Ergebnis gleich kodiert sind.
 */
interface MeasurementDraftState {
  drafts: Record<string, Record<string, number>>
  labels: Record<string, Record<string, string>>
  /** Felder eines Entwurfs ergänzen/überschreiben. */
  setDraft: (key: string, patch: Record<string, number>) => void
  /**
   * Entwurf vollständig ersetzen – für Listen veränderlicher Länge.
   *
   * `setDraft` ergänzt nur und entfernt nie ein Feld; ein gelöschtes Gerät bliebe
   * damit als `dev3` stehen und käme beim nächsten Öffnen zurück. Leere Werte
   * verwerfen den Entwurf ganz, damit ein leergeräumtes Formular nicht als
   * Zwischenstand zählt (der Ablauf überspringt sonst die Erklärseite).
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
      labels: {},
      setDraft: (key, patch) =>
        set((s) => ({
          drafts: { ...s.drafts, [key]: { ...(s.drafts[key] ?? {}), ...patch } },
        })),
      replaceDraft: (key, values, labels) =>
        set((s) => {
          const empty = Object.keys(values).length === 0
          if (empty && !(key in s.drafts) && !(key in s.labels)) return s

          const nextDrafts = { ...s.drafts }
          const nextLabels = { ...s.labels }
          if (empty) {
            delete nextDrafts[key]
            delete nextLabels[key]
          } else {
            nextDrafts[key] = values
            if (labels && Object.keys(labels).length > 0) nextLabels[key] = labels
            else delete nextLabels[key]
          }
          return { drafts: nextDrafts, labels: nextLabels }
        }),
      clearDraft: (key) =>
        set((s) => {
          if (!(key in s.drafts) && !(key in s.labels)) return s
          const next = { ...s.drafts }
          const nextLabels = { ...s.labels }
          delete next[key]
          delete nextLabels[key]
          return { drafts: next, labels: nextLabels }
        }),
      resetDrafts: () => set({ drafts: {}, labels: {} }),
    }),
    {
      name: 'eapp-measurement-drafts',
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<MeasurementDraftState>),
        drafts: (persisted as Partial<MeasurementDraftState>)?.drafts ?? {},
        labels: (persisted as Partial<MeasurementDraftState>)?.labels ?? {},
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
  return useMeasurementDraftStore.getState().labels[key] ?? {}
}
