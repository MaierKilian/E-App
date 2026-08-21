import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnergyType } from '@/store/readingsStore'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import { DEFAULT_KWH_PER_UNIT } from '@/features/monitoring/specificValues'

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
  /**
   * Energieinhalt je Zähler-Einheit in kWh, sofern vom Nutzer hinterlegt
   * (Gas: Brennwert × Zustandszahl von der Jahresrechnung). Fehlt ein Eintrag,
   * gilt der Standardwert aus `DEFAULT_KWH_PER_UNIT`.
   */
  energyContent: Partial<Record<EnergyType, number>>
  /** Setzt den Energieinhalt je Zähler-Einheit (kWh). */
  setEnergyContent: (type: EnergyType, kwhPerUnit: number) => void
  /** Zurück auf den Standardwert. */
  clearEnergyContent: (type: EnergyType) => void
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
      energyContent: {},
      setEnergyContent: (type, kwhPerUnit) =>
        set((s) => ({ energyContent: { ...s.energyContent, [type]: kwhPerUnit } })),
      clearEnergyContent: (type) =>
        set((s) => {
          const next = { ...s.energyContent }
          delete next[type]
          return { energyContent: next }
        }),
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
          energyContent: {},
        }),
    }),
    {
      name: 'eapp-tariff',
      // Defensiv gegen ältere gespeicherte Stände ohne `prices`.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<TariffState>),
        prices: (persisted as Partial<TariffState>)?.prices ?? {},
        energyContent: (persisted as Partial<TariffState>)?.energyContent ?? {},
      }),
    },
  ),
)

/**
 * Löst den effektiven Preis eines Trägers auf (Nutzerwert oder Standard).
 * Strom kommt aus den dedizierten Feldern, alle anderen aus `prices`.
 */
/**
 * Energieinhalt je Zähler-Einheit (kWh) – Nutzerwert oder Standard.
 * Damit werden m³ Gas, Liter Öl und kg Pellets für den spezifischen Kennwert
 * in kWh umgerechnet.
 */
export function resolveEnergyContent(s: TariffState, type: EnergyType): number {
  const custom = s.energyContent?.[type]
  if (typeof custom === 'number' && Number.isFinite(custom) && custom > 0) return custom
  return DEFAULT_KWH_PER_UNIT[type] ?? 1
}

export function resolvePrice(s: TariffState, type: EnergyType): PriceEntry {
  const meta = PRICE_META[type]
  if (!meta) return { work: 0, base: 0, custom: false }
  if (type === 'electricity') {
    return { work: s.electricityWorkPrice, base: s.electricityBasePrice, custom: s.isCustom }
  }
  const p = s.prices[type]
  return p ?? { work: meta.defaultWork, base: meta.defaultBase, custom: false }
}
