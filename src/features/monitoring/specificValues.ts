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
 * Dieselbe Staffel, die `estimateEnergy.ts` intern für die Hüllen-Einordnung
 * nutzt – hier als sichtbarer Vergleichswert. Grobe Richtwerte, die sich an den
 * Bauvorschriften der jeweiligen Epoche orientieren (WSchV 1977/1984/1995,
 * EnEV, GEG).
 */
export function heatDemandBenchmark(buildingYear: number): number | undefined {
  if (!Number.isFinite(buildingYear) || buildingYear <= 0) return undefined
  if (buildingYear < 1978) return 220
  if (buildingYear <= 1994) return 150
  if (buildingYear <= 2001) return 100
  if (buildingYear <= 2015) return 70
  return 50
}

/**
 * Aufschlag für Warmwasser, wenn es über dieselbe Anlage läuft (kWh/m²·a).
 *
 * Der Gaszähler misst Heizung UND Warmwasser; die Baujahrs-Richtwerte meinen
 * nur die Heizung. Ohne diesen Aufschlag sähe jedes Haus schlechter aus als es
 * ist. 20 kWh/m²·a entspricht grob 12 kWh je m² und Jahr Nutzwärme plus
 * Verlusten – die übliche Größenordnung für einen Mehrpersonenhaushalt.
 */
export const HOT_WATER_SURCHARGE_KWH_PER_SQM = 20

export interface SpecificValue {
  /** Bezugsgröße, nach der gerechnet wurde. */
  basis: SpecificBasis
  /** Der spezifische Wert in der Einheit der Bezugsgröße. */
  value: number
  /**
   * Vergleichswert für diesen Haushalt (gleiche Einheit), falls ableitbar.
   * Bei Wärme aus dem Baujahr (inkl. Warmwasser-Aufschlag, wenn zutreffend),
   * bei Strom/Wasser ein Durchschnitts-Richtwert.
   */
  benchmark?: number
}

/**
 * Durchschnittlicher Haushaltsstrom je m² Wohnfläche und Jahr (kWh).
 *
 * Hergeleitet aus den beiden gängigen Durchschnitten: rund 1.500 kWh je Person
 * und Jahr bei etwa 47 m² Wohnfläche je Person ergibt ~32 kWh/m²·a. Wie alle
 * Werte hier ein grober Richtwert zum Einordnen, keine Norm.
 */
const ELECTRICITY_BENCHMARK_PER_SQM = 32
/** Durchschnittlicher Trinkwasserverbrauch je Person und Tag (Liter). */
const WATER_BENCHMARK_LITER_PER_PERSON_DAY = 125

/**
 * Rechnet einen Jahresverbrauch in die spezifische Kennzahl seines Trägers um.
 *
 * @param type        Energieträger.
 * @param yearlyUnits Jahresverbrauch in Zähler-Einheiten (m³, l, kg, kWh).
 * @param profile     Wohnprofil – liefert Fläche, Personen und Baujahr.
 * @param kwhPerUnit  Energieinhalt je Zähler-Einheit; ohne Angabe der Standard.
 * @returns undefined, wenn die Bezugsgröße fehlt oder null ist.
 */
export function specificValue(
  type: EnergyType,
  yearlyUnits: number | undefined,
  profile: Pick<OnboardingData, 'livingArea' | 'personsCount' | 'buildingYear' | 'hotWaterType'>,
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
    return {
      basis,
      value: (yearlyUnits * 1000) / persons / 365,
      benchmark: WATER_BENCHMARK_LITER_PER_PERSON_DAY,
    }
  }

  const factor = kwhPerUnit ?? DEFAULT_KWH_PER_UNIT[type] ?? 1
  const yearlyKwh = yearlyUnits * factor
  if (!Number.isFinite(yearlyKwh) || yearlyKwh <= 0) return undefined

  const area = positive(profile.livingArea)
  if (!area) return undefined
  return { basis, value: yearlyKwh / area, benchmark: areaBenchmark(type, profile) }
}

/**
 * Vergleichswert je m² und Jahr.
 *
 * Strom und Wärme teilen sich zwar die Bezugsgröße, aber nicht den Richtwert:
 * Haushaltsstrom hängt an Geräten und Personen, der Wärmebedarf am Baujahr der
 * Gebäudehülle. Ein gemeinsamer Wert wäre für beide falsch.
 */
function areaBenchmark(
  type: EnergyType,
  profile: Pick<OnboardingData, 'buildingYear' | 'hotWaterType'>,
): number | undefined {
  if (type === 'electricity') return ELECTRICITY_BENCHMARK_PER_SQM
  const base = heatDemandBenchmark(profile.buildingYear)
  if (base === undefined) return undefined
  return base + HOT_WATER_SURCHARGE_KWH_PER_SQM * hotWaterShare(profile.hotWaterType)
}

/**
 * Wie viel vom Warmwasser über denselben Zähler läuft (0..1).
 *
 * Bei einem eigenen System (z. B. elektrischer Durchlauferhitzer) taucht das
 * Warmwasser im Gaszähler gar nicht auf – dann darf der Aufschlag nicht in den
 * Vergleichswert. Bei `unknown` wird der volle Aufschlag angesetzt: die weit
 * überwiegende Mehrheit der Gashaushalte erwärmt zentral, und die Zahl zu
 * niedrig anzusetzen ließe den Haushalt schlechter dastehen als er ist.
 */
function hotWaterShare(type: OnboardingData['hotWaterType']): number {
  switch (type) {
    case 'separate_system':
      return 0
    case 'partially_combined':
      return 0.5
    default:
      return 1
  }
}

function positive(n: number | undefined): number | undefined {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined
}
