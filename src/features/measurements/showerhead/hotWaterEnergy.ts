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

/**
 * Nutzungsgrad je Erzeuger – wie viel nutzbare Wärme aus dem Brennstoff wird,
 * den der Zähler zählt.
 *
 * Exportiert, weil der Heizperioden-Check (`monitoring/heatingPeriod.ts`)
 * dieselbe Umrechnung braucht: Er vergleicht den gemessenen Sommerverbrauch am
 * Zähler mit dem erwarteten Warmwasserbedarf in nutzbarer Wärme. Stünden die
 * Wirkungsgrade dort ein zweites Mal, könnten beide Rechnungen auseinanderlaufen
 * – dieselbe Regel wie bei den Richtwerten im Wissensbereich.
 *
 * Die Wärmepumpe steht hier mit ihrer Arbeitszahl statt eines Wirkungsgrads:
 * Sie erzeugt aus einer Kilowattstunde Strom rund 2,8 Kilowattstunden Wärme.
 * Für die Umrechnung Zähler → Wärme ist das dieselbe Rechenrolle.
 */
export const HEAT_CONVERSION: Record<HotWaterSource, number> = {
  gas: GAS_EFFICIENCY,
  oil: OIL_EFFICIENCY,
  pellets: PELLET_EFFICIENCY,
  electric: ELECTRIC_EFFICIENCY,
  heat_pump: HEAT_PUMP_COP,
}

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
 * Voreingestellte Warmwasserquelle aus dem Profil. Nur ein Vorschlag – im Test
 * wählbar.
 *
 * „Wie Heizung" und „teilweise kombiniert" nehmen den Heizträger. **„Nicht
 * bekannt" ebenfalls**: Vorher landete diese Antwort pauschal bei „elektrisch",
 * auch wenn ein Gaskessel im Profil stand. Das ist die teuerste aller Quellen –
 * je nutzbarer Kilowattstunde die teuerste der fünf –, und die Ersparnis
 * des Duschkopf-Tests hing direkt daran. Wer die Frage nicht beantworten kann,
 * bekam so den unwahrscheinlichsten Fall unterstellt und eine Zahl, die um ein
 * Vielfaches danebenlag. Der Wärmeerzeuger im Haus ist der bessere Anhaltspunkt.
 *
 * Elektrisch bleibt, was es immer war: die Antwort für ein wirklich eigenes
 * Gerät – und der Rückfall, wenn kein Wärmeerzeuger etwas hergibt.
 */
export function defaultHotWaterSource(
  hotWaterType: HotWaterType,
  heatGenerators: HeatGeneratorType[],
): HotWaterSource {
  if (hotWaterType !== 'separate_system') {
    for (const gen of heatGenerators ?? []) {
      const mapped = GEN_TO_SOURCE[gen]
      if (mapped) return mapped
    }
  }
  return 'electric'
}

/**
 * Kam die Vorbelegung aus einer Angabe des Nutzers – oder ist sie ein Rückfall?
 *
 * Der Duschkopf-Check zeigt das an. Die Warmwasserfrage wirkt genau hier, und
 * zwar kräftig; ohne diesen Hinweis war ihre einzige sichtbare Folge ein
 * vorausgewähltes Chip, dem niemand ansieht, woher es kommt.
 */
export function hotWaterSourceFromProfile(
  hotWaterType: HotWaterType,
  heatGenerators: HeatGeneratorType[],
): boolean {
  if (hotWaterType === 'separate_system') return true
  if (hotWaterType === 'unknown') return false
  return (heatGenerators ?? []).some((gen) => GEN_TO_SOURCE[gen] !== undefined)
}
