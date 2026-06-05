import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MeasurementId, MeasurementResult } from '@/features/measurements/types'

interface MeasurementsState {
  /** Gespeicherte Ergebnisse je Messung (jeweils das zuletzt gespeicherte). */
  results: Partial<Record<MeasurementId, MeasurementResult>>
  saveResult: (result: MeasurementResult) => void
  clearResult: (id: MeasurementId) => void
  resetAll: () => void
}

const defaultResults: Partial<Record<MeasurementId, MeasurementResult>> = {}

/**
 * Dauerhaft gespeicherte Mess-Ergebnisse.
 * Persistiert in localStorage unter dem Schlüssel "eapp-measurements".
 */
export const useMeasurementsStore = create<MeasurementsState>()(
  persist(
    (set) => ({
      results: defaultResults,
      saveResult: (result) =>
        set((state) => ({
          results: { ...state.results, [result.id]: result },
        })),
      clearResult: (id) =>
        set((state) => {
          const next = { ...state.results }
          delete next[id]
          return { results: next }
        }),
      resetAll: () => set({ results: {} }),
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
          results: { ...current.results, ...(p.results ?? {}) },
        }
      },
    },
  ),
)
