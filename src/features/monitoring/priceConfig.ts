import type { EnergyType } from '@/store/readingsStore'

/**
 * Preis-Metadaten je (kostenfähigem) Energieträger.
 * Trennt die reinen Preis-Infos (Einheit, Umrechnung, Standardwerte) bewusst
 * von den Anzeige-Metadaten in `energyConfig`, damit auch der Tarif-Store
 * (ohne Icon-/UI-Abhängigkeiten) darauf zugreifen kann.
 */
export interface PriceMeta {
  /** Anzeige-Einheit des Arbeitspreises, z. B. 'ct/kWh', '€/m³'. */
  priceUnit: string
  /** Faktor: Arbeitspreis × priceToEur = € pro Zähler-Einheit. */
  priceToEur: number
  /** Voreingestellter Arbeitspreis (in der Anzeige-Einheit). */
  defaultWork: number
  /** Voreingestellter Grundpreis (€/Monat). */
  defaultBase: number
}

/**
 * Nur Träger, für die ein Preis sinnvoll ist. PV/Solarthermie (Erzeugung)
 * sind bewusst nicht enthalten.
 */
export const PRICE_META: Partial<Record<EnergyType, PriceMeta>> = {
  electricity: { priceUnit: 'ct/kWh', priceToEur: 0.01, defaultWork: 35, defaultBase: 12 },
  heat_pump: { priceUnit: 'ct/kWh', priceToEur: 0.01, defaultWork: 30, defaultBase: 0 },
  water: { priceUnit: '€/m³', priceToEur: 1, defaultWork: 4.5, defaultBase: 0 },
  gas: { priceUnit: '€/m³', priceToEur: 1, defaultWork: 1.2, defaultBase: 12 },
  oil: { priceUnit: '€/l', priceToEur: 1, defaultWork: 1.1, defaultBase: 0 },
  pellets: { priceUnit: '€/kg', priceToEur: 1, defaultWork: 0.35, defaultBase: 0 },
}

/** true, wenn für diesen Träger ein Preis hinterlegt werden kann. */
export function isPriceable(type: EnergyType): boolean {
  return type in PRICE_META
}
