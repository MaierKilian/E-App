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
      currentStep: 0,
      setStep: (step) => set({ currentStep: step }),
      updateData: (partial) =>
        set((state) => ({ data: { ...state.data, ...partial } })),
      complete: () =>
        set((state) => ({ data: { ...state.data, completed: true } })),
      reset: () => set({ data: defaultData, currentStep: 0 }),
    }),
    { name: 'eapp-onboarding' },
  ),
)
