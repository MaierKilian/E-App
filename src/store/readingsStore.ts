import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Unterstützte Energieträger. Welche aktiv sind, ergibt sich aus dem Profil. */
export type EnergyType =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'oil'
  | 'pellets'
  | 'heat_pump'
  | 'pv'
  | 'solar_thermal'

export interface MeterReading {
  id: string
  /** ISO-Datum yyyy-mm-dd */
  date: string
  /**
   * Der Stand **nach** diesem Eintrag: bei `counter` der Zählerstand, bei
   * `level` der Füllstand des Vorrats (in der Einheit des Trägers).
   */
  value: number
  /** Zeitpunkt der Erfassung als ISO-DateTime (zur Unterscheidung gleicher Tage). */
  createdAt?: string
  /**
   * Gelieferte Menge in der Einheit des Trägers – nur bei einer Lieferung
   * gesetzt und das Merkmal, das sie von einer Ablesung unterscheidet.
   *
   * Ohne sie wäre der Verbrauch im Auffüll-Zeitraum nicht berechenbar: Ein
   * Sprung von 800 l auf 1500 l kann „700 l aufgefüllt, nichts verbraucht"
   * heißen oder „1200 l geliefert, davon 500 l verbraucht". Beide Deutungen
   * passen zu denselben zwei Ständen; erst die Menge löst das auf.
   */
  refill?: number
  /** Rechnungsbetrag der Lieferung in € – ergibt den gemessenen Arbeitspreis. */
  refillCostEur?: number
}

/** Wie der Stand eines Trägers gelesen wird. */
export type ReadingMode =
  /** Aufsteigendes Zählwerk – der Regelfall. */
  | 'counter'
  /** Fallender Vorrat, der beim Befüllen zurückspringt (Öltank, Pelletlager). */
  | 'level'

/** Eigenschaften eines Zählers, die nicht an der einzelnen Ablesung hängen. */
export interface MeterConfig {
  mode: ReadingMode
  /**
   * Fassungsvermögen in der Einheit des Trägers (l, kg, m³) – **optional.**
   * Für die Reichweite wird es nicht gebraucht (Prozent pro Tag genügt), nur
   * für Mengen, Kosten und die spezifischen Kennwerte. Wer seine Tankgröße
   * nicht kennt, wird deshalb nicht ausgesperrt.
   */
  capacity?: number
}

export type ReminderFrequency = 'off' | 'weekly' | 'monthly'

interface ReadingsState {
  /** Ablesungen je Energieträger (generisch für spätere Erweiterung). */
  readings: Partial<Record<EnergyType, MeterReading[]>>
  /**
   * Zähler-Eigenschaften je Träger. Ein fehlender Eintrag bedeutet immer
   * `counter` – siehe `meterMode` in `counterSeries.ts`.
   */
  meters: Partial<Record<EnergyType, MeterConfig>>
  reminderFrequency: ReminderFrequency
  addReading: (type: EnergyType, reading: { date: string; value: number }) => void
  /** Trägt eine Lieferung ein: gelieferte Menge plus Stand danach. */
  addRefill: (
    type: EnergyType,
    refill: { date: string; amount: number; value: number; costEur?: number },
  ) => void
  /** Schaltet zwischen Zählwerk und Vorrat um. */
  setMeterMode: (type: EnergyType, mode: ReadingMode) => void
  /** Setzt das Fassungsvermögen; `undefined` entfernt die Angabe wieder. */
  setCapacity: (type: EnergyType, capacity: number | undefined) => void
  updateReading: (
    type: EnergyType,
    id: string,
    patch: { date?: string; value?: number },
  ) => void
  deleteReading: (type: EnergyType, id: string) => void
  /** Entfernt einen Zähler samt aller seiner Ablesungen. */
  removeType: (type: EnergyType) => void
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

/**
 * Sortiert Ablesungen aufsteigend nach Datum (rein, ohne Seiteneffekt).
 * Gleiche Tage werden anhand des Erfassungszeitpunkts (createdAt) stabil geordnet.
 */
function sortReadings(list: MeterReading[]): MeterReading[] {
  return [...list].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  )
}

/**
 * Dauerhaft gespeicherte Zählerstände je Energieträger.
 * Persistiert in localStorage unter dem Schlüssel "eapp-readings".
 */
export const useReadingsStore = create<ReadingsState>()(
  persist(
    (set) => ({
      readings: {},
      meters: {},
      reminderFrequency: 'off',
      addReading: (type, reading) =>
        set((state) => {
          const next: MeterReading = {
            id: makeId(),
            date: reading.date,
            value: reading.value,
            createdAt: new Date().toISOString(),
          }
          const existing = state.readings[type] ?? []
          return {
            readings: {
              ...state.readings,
              [type]: sortReadings([...existing, next]),
            },
          }
        }),
      addRefill: (type, refill) =>
        set((state) => {
          const next: MeterReading = {
            id: makeId(),
            date: refill.date,
            value: refill.value,
            refill: refill.amount,
            ...(refill.costEur !== undefined ? { refillCostEur: refill.costEur } : {}),
            createdAt: new Date().toISOString(),
          }
          const existing = state.readings[type] ?? []
          return {
            readings: {
              ...state.readings,
              [type]: sortReadings([...existing, next]),
            },
          }
        }),
      setMeterMode: (type, mode) =>
        set((state) => ({
          meters: { ...state.meters, [type]: { ...state.meters[type], mode } },
        })),
      setCapacity: (type, capacity) =>
        set((state) => {
          // Ohne bisherige Konfiguration gilt der Träger als Zählwerk; eine
          // Kapazität allein soll ihn nicht stillschweigend zum Tank machen.
          const current = state.meters[type] ?? { mode: 'counter' as ReadingMode }
          const next: MeterConfig =
            capacity !== undefined && Number.isFinite(capacity) && capacity > 0
              ? { ...current, capacity }
              : { ...current, capacity: undefined }
          return { meters: { ...state.meters, [type]: next } }
        }),
      updateReading: (type, id, patch) =>
        set((state) => {
          const existing = state.readings[type] ?? []
          const updated = existing.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...(patch.date !== undefined ? { date: patch.date } : {}),
                  ...(patch.value !== undefined ? { value: patch.value } : {}),
                }
              : r,
          )
          // Neu sortieren, da sich das Datum geändert haben kann.
          return {
            readings: {
              ...state.readings,
              [type]: sortReadings(updated),
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
      removeType: (type) =>
        set((state) => {
          const next = { ...state.readings }
          delete next[type]
          // Die Konfiguration gehört zum Zähler und geht mit ihm. Bliebe sie
          // stehen, käme ein später neu angelegter Zähler desselben Trägers mit
          // dem Modus und der Tankgröße seines Vorgängers zurück.
          const meters = { ...state.meters }
          delete meters[type]
          return { readings: next, meters }
        }),
      setReminderFrequency: (freq) => set({ reminderFrequency: freq }),
      resetReadings: () => set({ readings: {}, meters: {}, reminderFrequency: 'off' }),
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
          meters: { ...current.meters, ...(p.meters ?? {}) },
          reminderFrequency: p.reminderFrequency ?? current.reminderFrequency,
        }
      },
    },
  ),
)
