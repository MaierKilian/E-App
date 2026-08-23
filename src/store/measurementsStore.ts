import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MeasurementId, MeasurementResult } from '@/features/measurements/types'
import { instanceKey } from '@/features/measurements/rooms'
import { isCurrentLightingResult } from '@/features/measurements/lighting/lighting'

export type MeasurementsView = 'recommended' | 'trades' | 'byRoom'

interface MeasurementsState {
  /**
   * Gespeicherte Ergebnisse, je Mess-Instanz (Messung + optional Raum).
   * Schlüssel: `instanceKey(id, roomKey)` – also "id" oder "id@room".
   */
  results: Partial<Record<string, MeasurementResult>>
  /**
   * Jeweils das *vorherige* Ergebnis je Mess-Instanz, gleicher Schlüssel.
   *
   * Damit lässt sich zeigen, was eine Maßnahme gebracht hat: erst messen, etwas
   * ändern, erneut messen. Nur der Grundlast-Check nutzt das bisher – er ist
   * die einzige Messung, deren Ergebnis der Nutzer selbst nachprüfen kann,
   * während alle anderen Checks mit Modellwerten rechnen.
   *
   * Bewusst nur eine Stufe tief: Für den Vorher/Nachher-Vergleich reicht die
   * letzte Messung, und eine unbegrenzte Historie im localStorage wäre für den
   * Zweck unnötiger Ballast.
   */
  previousResults: Partial<Record<string, MeasurementResult>>
  /** Räume (Instanz-Schlüssel), die als „nichts zu messen" markiert sind. */
  skippedRooms: string[]
  /** Zuletzt gewählte Ansicht im Messungen-Bereich. */
  measurementsView: MeasurementsView
  saveResult: (result: MeasurementResult) => void
  clearResult: (id: MeasurementId, roomKey?: string) => void
  toggleSkippedRoom: (roomKey: string) => void
  setMeasurementsView: (v: MeasurementsView) => void
  resetAll: () => void
}

const defaultResults: Partial<Record<string, MeasurementResult>> = {}

/**
 * Entfernt Ergebnisse, deren Messung ihre Form geändert hat.
 *
 * Der LED-Check zählte früher Lampen je Raum und speicherte je Raum ein
 * Ergebnis (`lighting@wohnzimmer#0`, `details.totalBulbs`). Heute fragt er alle
 * Räume auf einem Schirm ab und legt ein Ergebnis für die Wohnung ab. Blieben
 * die alten Einträge liegen, läse der Ergebnis-Schirm dort „keine offenen
 * Räume" und meldete fälschlich, alles sei bereits auf LED umgestellt.
 */
function dropLegacyResults(
  results: Partial<Record<string, MeasurementResult>> | undefined,
): Partial<Record<string, MeasurementResult>> {
  if (!results) return {}
  const next: Partial<Record<string, MeasurementResult>> = {}
  for (const [key, result] of Object.entries(results)) {
    if (!result) continue
    if (result.id === 'lighting' && !isCurrentLightingResult(result.details)) continue
    next[key] = result
  }
  return next
}

/**
 * Dauerhaft gespeicherte Mess-Ergebnisse.
 * Persistiert in localStorage unter dem Schlüssel "eapp-measurements".
 */
export const useMeasurementsStore = create<MeasurementsState>()(
  persist(
    (set) => ({
      results: defaultResults,
      previousResults: {},
      skippedRooms: [],
      measurementsView: 'recommended',
      saveResult: (result) =>
        set((state) => {
          const key = instanceKey(result.id, result.roomKey)
          const replaced = state.results[key]
          return {
            results: { ...state.results, [key]: result },
            // Die abgelöste Messung als Vergleichspunkt behalten.
            previousResults: replaced
              ? { ...state.previousResults, [key]: replaced }
              : state.previousResults,
          }
        }),
      clearResult: (id, roomKey) =>
        set((state) => {
          const key = instanceKey(id, roomKey)
          const next = { ...state.results }
          const nextPrev = { ...state.previousResults }
          delete next[key]
          delete nextPrev[key]
          return { results: next, previousResults: nextPrev }
        }),
      toggleSkippedRoom: (roomKey) =>
        set((state) => ({
          skippedRooms: state.skippedRooms.includes(roomKey)
            ? state.skippedRooms.filter((r) => r !== roomKey)
            : [...state.skippedRooms, roomKey],
        })),
      setMeasurementsView: (v) => set({ measurementsView: v }),
      resetAll: () =>
        set({
          results: {},
          previousResults: {},
          skippedRooms: [],
          measurementsView: 'recommended',
        }),
    }),
    {
      name: 'eapp-measurements',
      // Gespeicherte Daten robust mit den aktuellen Defaults zusammenführen,
      // damit nach einem Update neu hinzugekommene Felder nie fehlen.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MeasurementsState>
        return {
          ...current,
          ...p,
          results: { ...current.results, ...dropLegacyResults(p.results) },
          previousResults: dropLegacyResults(p.previousResults),
          skippedRooms: p.skippedRooms ?? current.skippedRooms,
          measurementsView: p.measurementsView ?? current.measurementsView,
        }
      },
    },
  ),
)
