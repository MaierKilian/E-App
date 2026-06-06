import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Unterstützte Energieträger. Aktuell genutzt: 'electricity'. */
export type EnergyType = 'electricity' | 'water' | 'gas' | 'oil' | 'pellets'

export interface MeterReading {
  id: string
  /** ISO-Datum yyyy-mm-dd */
  date: string
  /** Abgelesener Zählerstand */
  value: number
}

export type ReminderFrequency = 'off' | 'weekly' | 'monthly'

interface ReadingsState {
  /** Ablesungen je Energieträger (generisch für spätere Erweiterung). */
  readings: Partial<Record<EnergyType, MeterReading[]>>
  reminderFrequency: ReminderFrequency
  addReading: (type: EnergyType, reading: { date: string; value: number }) => void
  deleteReading: (type: EnergyType, id: string) => void
  setReminderFrequency: (freq: ReminderFrequency) => void
  resetReadings: () => void
}

/** Erzeugt eine eindeutige ID, mit Fallback falls crypto.randomUUID fehlt. */
function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Sortiert Ablesungen aufsteigend nach Datum (rein, ohne Seiteneffekt). */
function sortReadings(list: MeterReading[]): MeterReading[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Dauerhaft gespeicherte Zählerstände je Energieträger.
 * Persistiert in localStorage unter dem Schlüssel "eapp-readings".
 */
export const useReadingsStore = create<ReadingsState>()(
  persist(
    (set) => ({
      readings: {},
      reminderFrequency: 'off',
      addReading: (type, reading) =>
        set((state) => {
          const next: MeterReading = {
            id: makeId(),
            date: reading.date,
            value: reading.value,
          }
          const existing = state.readings[type] ?? []
          return {
            readings: {
              ...state.readings,
              [type]: sortReadings([...existing, next]),
            },
          }
        }),
      deleteReading: (type, id) =>
        set((state) => {
          const existing = state.readings[type] ?? []
          return {
            readings: {
              ...state.readings,
              [type]: existing.filter((r) => r.id !== id),
            },
          }
        }),
      setReminderFrequency: (freq) => set({ reminderFrequency: freq }),
      resetReadings: () => set({ readings: {}, reminderFrequency: 'off' }),
    }),
    {
      name: 'eapp-readings',
      // Gespeicherte Daten robust mit den aktuellen Defaults zusammenführen,
      // damit nach einem Update neu hinzugekommene Felder nie fehlen.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReadingsState>
        return {
          ...current,
          ...p,
          readings: { ...current.readings, ...(p.readings ?? {}) },
          reminderFrequency: p.reminderFrequency ?? current.reminderFrequency,
        }
      },
    },
  ),
)
