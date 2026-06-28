import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingData, RoomEntry, RoomType } from '@/types'

/**
 * Migriert zusammengeführte Raumtypen aus älteren Profilen:
 * - 'guest_toilet' → 'toilet' (funktional identisch)
 * - 'bureau'       → 'office' (Synonym)
 * Mehrfach vorkommende Typen werden über die Anzahl zusammengeführt.
 */
const ROOM_TYPE_RENAMES: Partial<Record<string, RoomType>> = {
  guest_toilet: 'toilet',
  bureau: 'office',
}

function migrateRooms(rooms: unknown): RoomEntry[] | undefined {
  if (!Array.isArray(rooms)) return undefined
  const merged = new Map<RoomType, RoomEntry>()
  for (const entry of rooms as RoomEntry[]) {
    if (!entry || typeof entry.type !== 'string') continue
    const type = ROOM_TYPE_RENAMES[entry.type] ?? (entry.type as RoomType)
    const existing = merged.get(type)
    if (existing) {
      existing.count += entry.count ?? 1
    } else {
      merged.set(type, { ...entry, type })
    }
  }
  return [...merged.values()]
}

const defaultData: OnboardingData = {
  profileName: '',
  profileImage: '',
  personsCount: 2,
  roomsCount: 3,
  buildingYear: 1990,
  buildingType: 'apartment',
  livingArea: 70,
  rooms: [],
  heatGenerators: [],
  hotWaterType: 'unknown',
  instruments: [],
  locationMode: 'skip',
  postalCode: '',
  completed: false,
  mode: 'detailed',
  goals: [],
  occupancyStatus: null,
  floors: 1,
  windowAge: 'unknown',
  hasPV: 'no',
  hasExtraFireplace: false,
  ventilationType: 'unknown',
  insulationState: 'unknown',
  smartHomeDevices: [],
  energyCostRange: 'unknown',
  lastRenovationYear: 'unknown',
  renovationItems: [],
}

/**
 * Steuert, wie der Onboarding-Bildschirm gerendert wird:
 * - 'linear': klassischer Erst-Flow (Modusauswahl + Schritte nacheinander).
 * - 'edit':   Bearbeitungsmodus mit Profil-Hub (currentStep -2) und gezieltem
 *             Anspringen einzelner Abschnitte.
 */
type FlowMode = 'linear' | 'edit'

interface OnboardingState {
  data: OnboardingData
  currentStep: number
  flowMode: FlowMode
  editReturnTo: string | null
  setStep: (step: number) => void
  updateData: (partial: Partial<OnboardingData>) => void
  complete: () => void
  editProfile: () => void
  editSection: (step: number, returnTo?: string) => void
  clearReturnTo: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      data: defaultData,
      currentStep: -1,
      flowMode: 'linear',
      editReturnTo: null,
      setStep: (step) => set({ currentStep: step }),
      updateData: (partial) =>
        set((state) => ({ data: { ...state.data, ...partial } })),
      complete: () =>
        set((state) => ({ data: { ...state.data, completed: true }, flowMode: 'linear', editReturnTo: null })),
      // Öffnet den Profil-Hub (Übersicht) im Bearbeitungsmodus, ohne vorhandene
      // Antworten zu verlieren. currentStep -2 = Hub.
      editProfile: () =>
        set((state) => ({ data: { ...state.data, completed: false }, flowMode: 'edit', currentStep: -2 })),
      // Öffnet direkt einen bestimmten Abschnitt im Bearbeitungsmodus. Optionaler
      // returnTo-Pfad: nach "Fertig" wird dorthin navigiert statt zum Hub.
      editSection: (step, returnTo) =>
        set((state) => ({
          data: { ...state.data, completed: false },
          flowMode: 'edit',
          currentStep: step,
          editReturnTo: returnTo ?? null,
        })),
      clearReturnTo: () => set({ editReturnTo: null }),
      reset: () => set({ data: defaultData, currentStep: -1, flowMode: 'linear', editReturnTo: null }),
    }),
    {
      name: 'eapp-onboarding',
      // Gespeicherte Daten mit den aktuellen Defaults zusammenführen, damit nach
      // einem Update neu hinzugekommene Felder nie fehlen (sonst Laufzeitfehler).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OnboardingState>
        const mergedData = { ...current.data, ...(p.data ?? {}) }
        const migratedRooms = migrateRooms(mergedData.rooms)
        if (migratedRooms) mergedData.rooms = migratedRooms
        return {
          ...current,
          ...p,
          data: mergedData,
          editReturnTo: null, // Navigationszustand nicht sitzungsübergreifend speichern
        }
      },
    },
  ),
)
