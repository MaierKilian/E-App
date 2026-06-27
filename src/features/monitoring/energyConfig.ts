import { Zap, Droplet, Flame, Fuel, Trees, Heater, Sun, SunMedium } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EnergyType } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'

/**
 * Statische Metadaten je Energieträger: Icon, Einheit und ob Kosten berechnet
 * werden (nur dort, wo ein Strompreis sinnvoll ist).
 */
export interface EnergyMeta {
  icon: LucideIcon
  /** Einheit des Zählerstands (z. B. 'kWh', 'm³'). */
  unit: string
  /** true → Verbrauch lässt sich über den Strompreis in Kosten umrechnen. */
  hasCost: boolean
  /** Dezenter, typ-eigener Akzentton (für Icon-Tönung und Sparkline). */
  accent: string
}

export const ENERGY_META: Record<EnergyType, EnergyMeta> = {
  electricity: { icon: Zap, unit: 'kWh', hasCost: true, accent: '#f59e0b' },
  water: { icon: Droplet, unit: 'm³', hasCost: false, accent: '#0ea5e9' },
  gas: { icon: Flame, unit: 'm³', hasCost: false, accent: '#f97316' },
  oil: { icon: Fuel, unit: 'l', hasCost: false, accent: '#6366f1' },
  pellets: { icon: Trees, unit: 'kg', hasCost: false, accent: '#a16207' },
  heat_pump: { icon: Heater, unit: 'kWh', hasCost: true, accent: '#14b8a6' },
  pv: { icon: Sun, unit: 'kWh', hasCost: false, accent: '#eab308' },
  solar_thermal: { icon: SunMedium, unit: 'kWh', hasCost: false, accent: '#f59e0b' },
}

/** Stabile Anzeige-Reihenfolge der Energieträger (Strom zuerst). */
const ORDER: EnergyType[] = [
  'electricity',
  'water',
  'gas',
  'oil',
  'pellets',
  'heat_pump',
  'pv',
  'solar_thermal',
]

/** Wärmeerzeuger des Profils → zugehöriger Energieträger. */
export const HEAT_GENERATOR_MAP: Partial<Record<string, EnergyType>> = {
  gas_boiler: 'gas',
  oil_boiler: 'oil',
  pellets: 'pellets',
  heat_pump: 'heat_pump',
  solar_thermal: 'solar_thermal',
}

/**
 * Ermittelt die für das aktuelle Profil relevanten Energieträger.
 * Strom und Wasser sind immer dabei; Wärmeerzeuger und PV kommen aus dem
 * Onboarding hinzu. Ergebnis ist nach ORDER sortiert und duplikatfrei.
 */
export function activeEnergyTypes(data: OnboardingData): EnergyType[] {
  const set = new Set<EnergyType>(['electricity', 'water'])
  for (const gen of data.heatGenerators ?? []) {
    const mapped = HEAT_GENERATOR_MAP[gen]
    if (mapped) set.add(mapped)
  }
  if (data.hasPV === 'yes') set.add('pv')
  return ORDER.filter((type) => set.has(type))
}
