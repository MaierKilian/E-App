import type { EnergyType } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'

/**
 * Spezifische Kennzahlen – der Verbrauch bezogen auf eine sinnvolle Bezugsgröße.
 *
 * Erst dadurch wird ein Verbrauch vergleichbar: „1400 m³ Gas" sagt niemandem
 * etwas, „138 kWh/m²·a" ordnet sich sofort in die Baujahrs-Richtwerte ein.
 *
 * **Der Nenner ist nicht überall die Wohnfläche.** Nur Wärme skaliert mit der
 * Fläche – Haushaltsstrom hängt an Personen und Geräten, Wasser ebenfalls. Ein
 * Single auf 120 m² verbraucht nicht doppelt so viel Strom wie auf 60 m².
 * Deshalb je Träger eine eigene Bezugsgröße (siehe `SPECIFIC_BASIS`).
 */

/** Bezugsgröße, auf die der Jahresverbrauch umgerechnet wird. */
export type SpecificBasis =
  /** kWh je m² Wohnfläche und Jahr – der Kennwert aus dem Energieausweis. */
  | 'perAreaKwh'
  /** kWh je Person und Jahr – die übliche Größe für Haushaltsstrom. */
  | 'perPersonKwh'
  /** Liter je Person und Tag – der übliche Wasser-Vergleich. */
  | 'perPersonLiterDay'

const SPECIFIC_BASIS: Partial<Record<EnergyType, SpecificBasis>> = {
  gas: 'perAreaKwh',
  oil: 'perAreaKwh',
  pellets: 'perAreaKwh',
  heat_pump: 'perAreaKwh',
  electricity: 'perPersonKwh',
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

/** Durchschnittlicher Haushaltsstrom je Person und Jahr (kWh) – grober Richtwert. */
const ELECTRICITY_BENCHMARK_PER_PERSON = 1500
/** Durchschnittlicher Trinkwasserverbrauch je Person und Tag (Liter). */
const WATER_BENCHMARK_LITER_PER_PERSON_DAY = 125

/**
 * Rechnet einen Jahresverbrauch in die spezifische Kennzahl seines Trägers um.
 *
 * @param type        Energieträger.
 * @param yearlyUnits Jahresverbrauch in Zähler-Einheiten (m³, l, kg, kWh).
 * @param profile     Wohnprofil – liefert Fläche, Personen und Baujahr.
 * @param kwhPerUnit  Energieinhalt je Zähler-Einheit; ohne Angabe der Standard.
 * @param benchmarkFactor Abschlag auf den Heizteil des Vergleichswerts
 *        (1 = unsaniert). Sanierte Hüllen brauchen weniger als der reine
 *        Baujahrs-Richtwert – ohne diesen Faktor stünde ausgerechnet vor den
 *        Nutzern, die gedämmt haben, ein zu schlechter Vergleichswert.
 * @returns undefined, wenn die Bezugsgröße fehlt oder null ist.
 */
export function specificValue(
  type: EnergyType,
  yearlyUnits: number | undefined,
  profile: Pick<OnboardingData, 'livingArea' | 'personsCount' | 'buildingYear' | 'hotWaterType'>,
  kwhPerUnit?: number,
  benchmarkFactor = 1,
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

  if (basis === 'perPersonKwh') {
    const persons = positive(profile.personsCount)
    if (!persons) return undefined
    return {
      basis,
      value: yearlyKwh / persons,
      benchmark: ELECTRICITY_BENCHMARK_PER_PERSON,
    }
  }

  const area = positive(profile.livingArea)
  if (!area) return undefined
  return {
    basis,
    value: yearlyKwh / area,
    benchmark: heatBenchmark(profile, benchmarkFactor),
  }
}

/**
 * Vergleichswert für den Heizkennwert eines Gebäudes (kWh/m²·a).
 *
 * Baujahrs-Richtwert, um den Sanierungsstand verringert, plus Warmwasser –
 * denn der Zähler misst beides, die Richtwerte meinen nur die Heizung. Der
 * Aufschlag bleibt vom Sanierungsfaktor unberührt: eine gedämmte Fassade senkt
 * den Heizbedarf, nicht den Warmwasserbedarf.
 */
export function heatBenchmark(
  profile: Pick<OnboardingData, 'buildingYear' | 'hotWaterType'>,
  benchmarkFactor = 1,
): number | undefined {
  const base = heatDemandBenchmark(profile.buildingYear)
  if (base === undefined) return undefined
  const factor = Number.isFinite(benchmarkFactor) ? Math.min(1, Math.max(0.2, benchmarkFactor)) : 1
  return base * factor + HOT_WATER_SURCHARGE_KWH_PER_SQM * hotWaterShare(profile.hotWaterType)
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
