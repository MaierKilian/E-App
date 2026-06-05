import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_WORK_PRICE = 35 // ct/kWh (Strom Durchschnitt)
export const DEFAULT_BASE_PRICE = 12 // €/Monat Grundpreis

interface TariffState {
  electricityWorkPrice: number // ct/kWh
  electricityBasePrice: number // €/Monat
  isCustom: boolean // true = Nutzer hat eigene Werte eingegeben
  promptSeen: boolean // Erstbesuch-Popup wurde bereits gezeigt/bearbeitet
  setTariff: (workPrice: number, basePrice: number) => void
  skipPrompt: () => void
  markPromptSeen: () => void
  resetTariff: () => void
}

/**
 * Dauerhaft gespeicherter Strom-Tarif des Nutzers.
 * Persistiert in localStorage unter dem Schlüssel "eapp-tariff".
 */
export const useTariffStore = create<TariffState>()(
  persist(
    (set) => ({
      electricityWorkPrice: DEFAULT_WORK_PRICE,
      electricityBasePrice: DEFAULT_BASE_PRICE,
      isCustom: false,
      promptSeen: false,
      setTariff: (workPrice, basePrice) =>
        set({
          electricityWorkPrice: workPrice,
          electricityBasePrice: basePrice,
          isCustom: true,
          promptSeen: true,
        }),
      skipPrompt: () => set({ promptSeen: true }),
      markPromptSeen: () => set({ promptSeen: true }),
      resetTariff: () =>
        set({
          electricityWorkPrice: DEFAULT_WORK_PRICE,
          electricityBasePrice: DEFAULT_BASE_PRICE,
          isCustom: false,
        }),
    }),
    { name: 'eapp-tariff' },
  ),
)
