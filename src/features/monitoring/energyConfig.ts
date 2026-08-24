import { Zap, Droplet, Flame, Fuel, Trees, Heater, Sun, SunMedium } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EnergyType, MeterReading } from '@/store/readingsStore'
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

/**
 * Träger, deren Verbrauch stark am Heizbedarf hängt und daher übers Jahr um ein
 * Vielfaches schwankt. Für sie wird die Jahres-Hochrechnung über das
 * Monatsprofil gewichtet statt linear gestreckt (siehe `seasonality.ts`).
 *
 * Die Wärmepumpe zählt bewusst dazu: sie heizt ebenfalls, auch wenn ihr Zähler
 * in kWh Strom läuft. Haushaltsstrom und Wasser sind flach genug für die
 * lineare Rechnung.
 */
const SEASONAL_TYPES: ReadonlySet<EnergyType> = new Set<EnergyType>([
  'gas',
  'oil',
  'pellets',
  'heat_pump',
  'solar_thermal',
])

/** true → Jahresverbrauch dieses Trägers folgt dem Heizprofil. */
export function isSeasonal(type: EnergyType): boolean {
  return SEASONAL_TYPES.has(type)
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

/**
 * Alle Energieträger, die die App kennt – jeder davon steht jederzeit zur
 * Auswahl.
 *
 * Der Fragebogen ist ein Startpunkt, kein Türsteher: Vorher entschied das
 * Profil, welche Zähler es überhaupt gibt, und wer im Schnellstart keine PV
 * angegeben hatte, konnte seine Erzeugung nie erfassen. Das Profil schlägt jetzt
 * vor (siehe {@link suggestedEnergyTypes}), es sperrt nichts mehr.
 */
export const ALL_ENERGY_TYPES: EnergyType[] = ORDER

/** Wärmeerzeuger des Profils → zugehöriger Energieträger. */
export const HEAT_GENERATOR_MAP: Partial<Record<string, EnergyType>> = {
  gas_boiler: 'gas',
  oil_boiler: 'oil',
  pellets: 'pellets',
  heat_pump: 'heat_pump',
  solar_thermal: 'solar_thermal',
}

/**
 * Energieträger, die das Profil nahelegt.
 *
 * Strom und Wasser hat jeder Haushalt; Wärmeerzeuger und PV kommen aus dem
 * Fragebogen. Das steuert die **Vorbelegung** des Zähler-Boards und die
 * **Erinnerungen** – nicht mehr, was erfassbar ist. Ergebnis ist nach ORDER
 * sortiert und duplikatfrei.
 */
export function suggestedEnergyTypes(data: OnboardingData): EnergyType[] {
  const set = new Set<EnergyType>(['electricity', 'water'])
  for (const gen of data.heatGenerators ?? []) {
    const mapped = HEAT_GENERATOR_MAP[gen]
    if (mapped) set.add(mapped)
  }
  if (data.hasPV === 'yes') set.add('pv')
  return ORDER.filter((type) => set.has(type))
}

/**
 * Träger, die auf dem Board stehen: was das Profil nahelegt **plus** alles,
 * wofür schon abgelesen wurde.
 *
 * Die zweite Hälfte ist der Punkt. Ein selbst angelegter Zähler muss auch dann
 * sichtbar bleiben, wenn das Profil ihn nicht nahelegt – sonst wäre er nach dem
 * ersten Eintrag wieder verschwunden.
 */
export function boardEnergyTypes(
  data: OnboardingData,
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
): EnergyType[] {
  const set = new Set<EnergyType>(suggestedEnergyTypes(data))
  for (const type of ORDER) {
    if ((readingsByType[type]?.length ?? 0) > 0) set.add(type)
  }
  return ORDER.filter((type) => set.has(type))
}
