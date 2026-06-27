import type { HotWaterType, HeatGeneratorType } from '@/types'
import { resolvePrice } from '@/store/tariffStore'

/**
 * Effektiver Warmwasser-Preis je nutzbarer Kilowattstunde Wärme – abhängig von
 * der Warmwasserquelle. Damit wird der Duschkopf-Test belastbar, statt pauschal
 * mit dem Strompreis zu rechnen (Warmwasser kommt oft aus Gas/Wärmepumpe).
 *
 * Annahmen/Quellen (Orientierungswerte):
 * - Erdgas-Heizwert ~10 kWh/m³; Wirkungsgrad Warmwasser ~90 % (Brennwert) bzw.
 *   ~80 % (Gas-Durchlauferhitzer) – wir rechnen mittlere 90 %.
 * - Heizöl ~10 kWh/l (η ~90 %), Pellets ~4,8 kWh/kg (η ~85 %).
 * - Elektrisch / Durchlauferhitzer: η ~99 % (elektronisch).
 * - Wärmepumpe Warmwasser: Arbeitszahl (COP) ~2,8.
 */

export type HotWaterSource = 'electric' | 'gas' | 'heat_pump' | 'oil' | 'pellets'

export const HOT_WATER_SOURCES: HotWaterSource[] = ['electric', 'gas', 'heat_pump', 'oil', 'pellets']

const GAS_KWH_PER_M3 = 10.0
const OIL_KWH_PER_L = 10.0
const PELLET_KWH_PER_KG = 4.8
const GAS_EFFICIENCY = 0.9
const OIL_EFFICIENCY = 0.9
const PELLET_EFFICIENCY = 0.85
const ELECTRIC_EFFICIENCY = 0.99
const HEAT_PUMP_COP = 2.8

type TariffState = Parameters<typeof resolvePrice>[0]

/** Effektive €/kWh nutzbarer Wärme für die gewählte Warmwasserquelle. */
export function eurPerKwhHeat(source: HotWaterSource, tariff: TariffState): number {
  switch (source) {
    case 'gas':
      return resolvePrice(tariff, 'gas').work / GAS_KWH_PER_M3 / GAS_EFFICIENCY
    case 'oil':
      return resolvePrice(tariff, 'oil').work / OIL_KWH_PER_L / OIL_EFFICIENCY
    case 'pellets':
      return resolvePrice(tariff, 'pellets').work / PELLET_KWH_PER_KG / PELLET_EFFICIENCY
    case 'heat_pump':
      return resolvePrice(tariff, 'heat_pump').work / 100 / HEAT_PUMP_COP
    case 'electric':
    default:
      return resolvePrice(tariff, 'electricity').work / 100 / ELECTRIC_EFFICIENCY
  }
}

const GEN_TO_SOURCE: Partial<Record<HeatGeneratorType, HotWaterSource>> = {
  gas_boiler: 'gas',
  oil_boiler: 'oil',
  pellets: 'pellets',
  heat_pump: 'heat_pump',
}

/**
 * Voreingestellte Warmwasserquelle aus dem Profil: bei „wie Heizung" der
 * Heizträger, sonst (separates System / unbekannt) elektrisch
 * (Boiler/Durchlauferhitzer). Nur ein Vorschlag – im Test wählbar.
 */
export function defaultHotWaterSource(
  hotWaterType: HotWaterType,
  heatGenerators: HeatGeneratorType[],
): HotWaterSource {
  if (hotWaterType === 'same_as_heating' || hotWaterType === 'partially_combined') {
    for (const gen of heatGenerators ?? []) {
      const mapped = GEN_TO_SOURCE[gen]
      if (mapped) return mapped
    }
  }
  return 'electric'
}
