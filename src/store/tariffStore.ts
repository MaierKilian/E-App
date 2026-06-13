import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnergyType } from '@/store/readingsStore'
import { PRICE_META } from '@/features/monitoring/priceConfig'

export const DEFAULT_WORK_PRICE = 35 // ct/kWh (Strom Durchschnitt)
export const DEFAULT_BASE_PRICE = 12 // €/Monat Grundpreis

/** Hinterlegter Preis eines Energieträgers. */
export interface PriceEntry {
  /** Arbeitspreis in der Anzeige-Einheit des Trägers (z. B. ct/kWh, €/m³). */
  work: number
  /** Grundpreis in €/Monat. */
  base: number
  /** true = vom Nutzer gesetzt (nicht der Standardwert). */
  custom: boolean
}

interface TariffState {
  // Strom bleibt aus Kompatibilitätsgründen als eigene Felder erhalten
  // (Messungen, Berichte und Home-Schätzung greifen direkt darauf zu).
  electricityWorkPrice: number // ct/kWh
  electricityBasePrice: number // €/Monat
  isCustom: boolean // true = Nutzer hat eigene Strom-Werte eingegeben
  promptSeen: boolean // Erstbesuch-Popup wurde bereits gezeigt/bearbeitet
  /** Preise weiterer Träger (Strom liegt in den Feldern oben). */
  prices: Partial<Record<EnergyType, PriceEntry>>
  setTariff: (workPrice: number, basePrice: number) => void
  setTypePrice: (type: EnergyType, work: number, base: number) => void
  /** Setzt einen Träger auf den Standardwert zurück (leeres Feld im Onboarding). */
  clearTypePrice: (type: EnergyType) => void
  skipPrompt: () => void
  markPromptSeen: () => void
  resetTariff: () => void
}

/**
 * Dauerhaft gespeicherte Energiepreise des Nutzers.
 * Persistiert in localStorage unter dem Schlüssel "eapp-tariff".
 */
export const useTariffStore = create<TariffState>()(
  persist(
    (set) => ({
      electricityWorkPrice: DEFAULT_WORK_PRICE,
      electricityBasePrice: DEFAULT_BASE_PRICE,
      isCustom: false,
      promptSeen: false,
      prices: {},
      setTariff: (workPrice, basePrice) =>
        set({
          electricityWorkPrice: workPrice,
          electricityBasePrice: basePrice,
          isCustom: true,
          promptSeen: true,
        }),
      setTypePrice: (type, work, base) =>
        set((s) => {
          // Strom spiegelt in die dedizierten Felder (Abwärtskompatibilität).
          if (type === 'electricity') {
            return {
              electricityWorkPrice: work,
              electricityBasePrice: base,
              isCustom: true,
              promptSeen: true,
            }
          }
          return {
            prices: { ...s.prices, [type]: { work, base, custom: true } },
            promptSeen: true,
          }
        }),
      clearTypePrice: (type) =>
        set((s) => {
          if (type === 'electricity') {
            return {
              electricityWorkPrice: DEFAULT_WORK_PRICE,
              electricityBasePrice: DEFAULT_BASE_PRICE,
              isCustom: false,
            }
          }
          const next = { ...s.prices }
          delete next[type]
          return { prices: next }
        }),
      skipPrompt: () => set({ promptSeen: true }),
      markPromptSeen: () => set({ promptSeen: true }),
      resetTariff: () =>
        set({
          electricityWorkPrice: DEFAULT_WORK_PRICE,
          electricityBasePrice: DEFAULT_BASE_PRICE,
          isCustom: false,
          prices: {},
        }),
    }),
    {
      name: 'eapp-tariff',
      // Defensiv gegen ältere gespeicherte Stände ohne `prices`.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<TariffState>),
        prices: (persisted as Partial<TariffState>)?.prices ?? {},
      }),
    },
  ),
)

/**
 * Löst den effektiven Preis eines Trägers auf (Nutzerwert oder Standard).
 * Strom kommt aus den dedizierten Feldern, alle anderen aus `prices`.
 */
export function resolvePrice(s: TariffState, type: EnergyType): PriceEntry {
  const meta = PRICE_META[type]
  if (!meta) return { work: 0, base: 0, custom: false }
  if (type === 'electricity') {
    return { work: s.electricityWorkPrice, base: s.electricityBasePrice, custom: s.isCustom }
  }
  const p = s.prices[type]
  return p ?? { work: meta.defaultWork, base: meta.defaultBase, custom: false }
}
