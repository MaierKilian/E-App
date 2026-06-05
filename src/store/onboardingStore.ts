import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingData } from '@/types'

const defaultData: OnboardingData = {
  profileName: '',
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
  buildingAutomation: {
    ecosystems: [],
    hasHub: 'unknown',
    useCases: [],
    budget: 'unknown',
    install: 'unknown',
    rooms: [],
  },
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
  setStep: (step: number) => void
  updateData: (partial: Partial<OnboardingData>) => void
  complete: () => void
  editProfile: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      data: defaultData,
      currentStep: -1,
      flowMode: 'linear',
      setStep: (step) => set({ currentStep: step }),
      updateData: (partial) =>
        set((state) => ({ data: { ...state.data, ...partial } })),
      complete: () =>
        set((state) => ({ data: { ...state.data, completed: true }, flowMode: 'linear' })),
      // Öffnet den Profil-Hub (Übersicht) im Bearbeitungsmodus, ohne vorhandene
      // Antworten zu verlieren. currentStep -2 = Hub.
      editProfile: () =>
        set((state) => ({ data: { ...state.data, completed: false }, flowMode: 'edit', currentStep: -2 })),
      reset: () => set({ data: defaultData, currentStep: -1, flowMode: 'linear' }),
    }),
    {
      name: 'eapp-onboarding',
      // Gespeicherte Daten mit den aktuellen Defaults zusammenführen, damit nach
      // einem Update neu hinzugekommene Felder nie fehlen (sonst Laufzeitfehler).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OnboardingState>
        return {
          ...current,
          ...p,
          data: { ...current.data, ...(p.data ?? {}) },
        }
      },
    },
  ),
)
