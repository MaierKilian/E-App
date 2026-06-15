import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MeasurementId, MeasurementResult } from '@/features/measurements/types'
import { instanceKey } from '@/features/measurements/rooms'

export type MeasurementsView = 'recommended' | 'trades' | 'byRoom'

interface MeasurementsState {
  /**
   * Gespeicherte Ergebnisse, je Mess-Instanz (Messung + optional Raum).
   * Schlüssel: `instanceKey(id, roomKey)` – also "id" oder "id@room".
   */
  results: Partial<Record<string, MeasurementResult>>
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
 * Dauerhaft gespeicherte Mess-Ergebnisse.
 * Persistiert in localStorage unter dem Schlüssel "eapp-measurements".
 */
export const useMeasurementsStore = create<MeasurementsState>()(
  persist(
    (set) => ({
      results: defaultResults,
      skippedRooms: [],
      measurementsView: 'recommended',
      saveResult: (result) =>
        set((state) => ({
          results: { ...state.results, [instanceKey(result.id, result.roomKey)]: result },
        })),
      clearResult: (id, roomKey) =>
        set((state) => {
          const next = { ...state.results }
          delete next[instanceKey(id, roomKey)]
          return { results: next }
        }),
      toggleSkippedRoom: (roomKey) =>
        set((state) => ({
          skippedRooms: state.skippedRooms.includes(roomKey)
            ? state.skippedRooms.filter((r) => r !== roomKey)
            : [...state.skippedRooms, roomKey],
        })),
      setMeasurementsView: (v) => set({ measurementsView: v }),
      resetAll: () => set({ results: {}, skippedRooms: [], measurementsView: 'recommended' }),
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
          skippedRooms: p.skippedRooms ?? current.skippedRooms,
          measurementsView: p.measurementsView ?? current.measurementsView,
        }
      },
    },
  ),
)
