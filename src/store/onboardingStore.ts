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

interface OnboardingState {
  data: OnboardingData
  currentStep: number
  setStep: (step: number) => void
  updateData: (partial: Partial<OnboardingData>) => void
  complete: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      data: defaultData,
      currentStep: -1,
      setStep: (step) => set({ currentStep: step }),
      updateData: (partial) =>
        set((state) => ({ data: { ...state.data, ...partial } })),
      complete: () =>
        set((state) => ({ data: { ...state.data, completed: true } })),
      reset: () => set({ data: defaultData, currentStep: -1 }),
    }),
    { name: 'eapp-onboarding' },
  ),
)
