import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MeasurementId, MeasurementResult } from '@/features/measurements/types'
import type { RoomType } from '@/types'

interface MeasurementsState {
  /** Gespeicherte Ergebnisse je Messung (jeweils das zuletzt gespeicherte). */
  results: Partial<Record<MeasurementId, MeasurementResult>>
  /** Räume, die der Nutzer als „nichts zu messen" markiert hat. */
  skippedRooms: RoomType[]
  saveResult: (result: MeasurementResult) => void
  clearResult: (id: MeasurementId) => void
  toggleSkippedRoom: (room: RoomType) => void
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
      skippedRooms: [],
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
      toggleSkippedRoom: (room) =>
        set((state) => ({
          skippedRooms: state.skippedRooms.includes(room)
            ? state.skippedRooms.filter((r) => r !== room)
            : [...state.skippedRooms, room],
        })),
      resetAll: () => set({ results: {}, skippedRooms: [] }),
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
        }
      },
    },
  ),
)
