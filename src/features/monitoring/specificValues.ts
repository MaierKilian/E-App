import type { EnergyType } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'

/**
 * Spezifische Kennzahlen – der Verbrauch bezogen auf eine sinnvolle Bezugsgröße.
 *
 * Erst dadurch wird ein Verbrauch vergleichbar: „1400 m³ Gas" sagt niemandem
 * etwas, „138 kWh/m²·a" ordnet sich sofort in die Baujahrs-Richtwerte ein.
 *
 * **Der Nenner ist nicht überall derselbe.** Alle Energieträger – Wärme wie
 * Strom – werden auf die Wohnfläche bezogen, weil das die Größe ist, die auf
 * dem Energieausweis und in jedem Gebäude-Vergleich steht. Wasser bleibt bei
 * Liter je Person und Tag: dort ist die Fläche kein sinnvoller Nenner, und
 * l/m²·Tag entspräche keinem gebräuchlichen Vergleichswert.
 */

/** Bezugsgröße, auf die der Jahresverbrauch umgerechnet wird. */
export type SpecificBasis =
  /** kWh je m² Wohnfläche und Jahr – der Kennwert aus dem Energieausweis. */
  | 'perAreaKwh'
  /** Liter je Person und Tag – der übliche Wasser-Vergleich. */
  | 'perPersonLiterDay'

const SPECIFIC_BASIS: Partial<Record<EnergyType, SpecificBasis>> = {
  gas: 'perAreaKwh',
  oil: 'perAreaKwh',
  pellets: 'perAreaKwh',
  heat_pump: 'perAreaKwh',
  electricity: 'perAreaKwh',
  water: 'perPersonLiterDay',
}

/**
 * Energieinhalt je Zähler-Einheit in kWh.
 *
 * Zähler messen Volumen oder Masse, die Vergleichswerte stehen aber in kWh.
 * Ohne Umrechnung ließe sich ein Gasverbrauch mit keinem Richtwert der Welt
 * vergleichen. Die Werte sind gängige Mittelwerte:
 *
 * - **Gas** ~10 kWh/m³ (Brennwert × Zustandszahl; real 9,5–11,5 je nach Netz
 *   und Gasqualität – beides steht auf jeder Jahresrechnung und lässt sich
 *   in den Tarif-Einstellungen hinterlegen).
 * - **Öl** ~10 kWh/l (Heizöl EL).
 * - **Pellets** ~4,8 kWh/kg (DIN-Norm-Pellets, ~17,3 MJ/kg).
 *
 * Strom und Wärmepumpe zählen bereits in kWh, Wasser wird nicht in Energie
 * umgerechnet (dort ist die Bezugsgröße Liter).
 */
export const DEFAULT_KWH_PER_UNIT: Partial<Record<EnergyType, number>> = {
  gas: 10,
  oil: 10,
  pellets: 4.8,
  electricity: 1,
  heat_pump: 1,
}

/** true → für diesen Träger lässt sich ein Energieinhalt hinterlegen. */
export function hasEnergyContent(type: EnergyType): boolean {
  return type === 'gas' || type === 'oil' || type === 'pellets'
}

/**
 * Spezifischer Heizwärmebedarf eines unsanierten Baus je Baujahr (kWh/m²·a).
 *
 * Dieselbe Staffel, die `estimateEnergy.ts` für die Hüllen-Einordnung nutzt.
 * Grobe Richtwerte, die sich an den Bauvorschriften der jeweiligen Epoche
 * orientieren (WSchV 1977/1984/1995, EnEV, GEG).
 */
export function heatDemandBenchmark(buildingYear: number): number | undefined {
  if (!Number.isFinite(buildingYear) || buildingYear <= 0) return undefined
  if (buildingYear < 1978) return 220
  if (buildingYear <= 1994) return 150
  if (buildingYear <= 2001) return 100
  if (buildingYear <= 2015) return 70
  return 50
}

export interface SpecificValue {
  /** Bezugsgröße, nach der gerechnet wurde. */
  basis: SpecificBasis
  /** Der spezifische Wert in der Einheit der Bezugsgröße. */
  value: number
}

/**
 * Rechnet einen Jahresverbrauch in die spezifische Kennzahl seines Trägers um.
 *
 * @param type        Energieträger.
 * @param yearlyUnits Jahresverbrauch in Zähler-Einheiten (m³, l, kg, kWh).
 * @param profile     Wohnprofil – liefert Fläche und Personen.
 * @param kwhPerUnit  Energieinhalt je Zähler-Einheit; ohne Angabe der Standard.
 * @returns undefined, wenn die Bezugsgröße fehlt oder null ist.
 */
export function specificValue(
  type: EnergyType,
  yearlyUnits: number | undefined,
  profile: Pick<OnboardingData, 'livingArea' | 'personsCount'>,
  kwhPerUnit?: number,
): SpecificValue | undefined {
  const basis = SPECIFIC_BASIS[type]
  if (!basis || yearlyUnits === undefined || !Number.isFinite(yearlyUnits) || yearlyUnits <= 0) {
    return undefined
  }

  if (basis === 'perPersonLiterDay') {
    const persons = positive(profile.personsCount)
    if (!persons) return undefined
    // Wasserzähler laufen in m³ – 1 m³ = 1000 Liter.
    return { basis, value: (yearlyUnits * 1000) / persons / 365 }
  }

  const factor = kwhPerUnit ?? DEFAULT_KWH_PER_UNIT[type] ?? 1
  const yearlyKwh = yearlyUnits * factor
  if (!Number.isFinite(yearlyKwh) || yearlyKwh <= 0) return undefined

  const area = positive(profile.livingArea)
  if (!area) return undefined
  return { basis, value: yearlyKwh / area }
}

function positive(n: number | undefined): number | undefined {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined
}
