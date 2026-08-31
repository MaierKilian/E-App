import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Duschkopf-Test.
 *
 * Idee: Der Nutzer hält ein Gefäß bekannten Volumens unter den Duschkopf und
 * stoppt die Zeit, bis es voll ist. Aus Liter und Sekunden ergibt sich der
 * Durchfluss in L/min, daraus eine Bewertung und eine grobe Schätzung der
 * jährlichen Warmwasserkosten.
 *
 * Alle Energie-/Kostenwerte sind bewusste Näherungen (siehe Annahmen unten)
 * und dienen der Veranschaulichung, nicht der exakten Abrechnung.
 */

export interface ShowerheadInput {
  /** Gemessene Liter (Volumen des Gefäßes). */
  liters: number
  /** Gemessene Zeit in Sekunden, bis das Gefäß voll war. */
  seconds: number
  /** Personen im Haushalt (aus dem Onboarding). */
  persons: number
  /** Effektiver Warmwasserpreis in € je kWh nutzbarer Wärme. */
  eurPerKwh: number
}

export interface ShowerheadResult {
  /** Durchfluss in L/min, auf eine Nachkommastelle gerundet. */
  flowLpm: number
  rating: MeasurementRating
  /** Geschätzte Warmwasserkosten pro Jahr in € (gerundet). */
  yearlyCost: number
  /**
   * Geschätzte jährliche Ersparnis in € durch einen Sparduschkopf (~8 L/min).
   * 0, wenn der aktuelle Durchfluss bereits sparsam ist (<= 9 L/min).
   */
  yearlySaving: number
  /** Jaehrlich eingesparte Wassermenge in Litern beim Wechsel auf ~8 L/min. */
  litersSavedPerYear: number
}

// Schwellenwerte für die Bewertung (L/min).
export const GOOD_MAX = 9
export const MEDIUM_MAX = 12

// Annahmen für die Warmwasser-Kostenschätzung. Kalibriert: 1 Dusche/Tag à 5 min,
// 9 L/min, ΔT 27 K → ~516 kWh/Person·Jahr (deckt sich mit Quellen: ~500–600
// kWh/Person für die Warmwasserbereitung).
const SHOWERS_PER_PERSON_PER_DAY = 1
const MINUTES_PER_SHOWER = 5
const DAYS_PER_YEAR = 365
const DELTA_T = 27 // K Temperaturanstieg (Kaltwasser ~11 °C → Dusche ~38 °C)
const WH_PER_LITER_PER_K = 1.163 // Energie, um 1 L um 1 K zu erwärmen
const EFFICIENT_FLOW_LPM = 8 // Referenz-Durchfluss eines Sparduschkopfes

export function rateFlow(flowLpm: number): MeasurementRating {
  if (flowLpm <= GOOD_MAX) return 'good'
  if (flowLpm <= MEDIUM_MAX) return 'medium'
  return 'high'
}

/**
 * Geschätzte jährliche Warmwasserkosten in € für einen gegebenen Durchfluss.
 *
 * Duschminuten/Jahr = persons * Duschen/Tag * min/Dusche * Tage/Jahr.
 * Davon werden ~60 % als Warmwasser angesetzt; die Energie zum Erwärmen folgt
 * aus 1.16 Wh/(L·K) bei ΔT = 25 K. Die Kosten nutzen vereinfachend nur den
 * Strom-Arbeitspreis (Näherung – die tatsächliche Warmwasserquelle kann
 * abweichen).
 */
function yearlyCostForFlow(flowLpm: number, persons: number, eurPerKwh: number): number {
  const showerMinutesPerYear =
    persons * SHOWERS_PER_PERSON_PER_DAY * MINUTES_PER_SHOWER * DAYS_PER_YEAR
  const litersPerYear = flowLpm * showerMinutesPerYear
  const kWhPerYear = (litersPerYear * DELTA_T * WH_PER_LITER_PER_K) / 1000
  return kWhPerYear * Math.max(0, eurPerKwh)
}

export function calcShowerhead(input: ShowerheadInput): ShowerheadResult {
  const persons = Math.max(1, input.persons)
  const flowLpm = Math.round((input.liters / input.seconds) * 60 * 10) / 10
  const rating = rateFlow(flowLpm)

  const yearlyCost = yearlyCostForFlow(flowLpm, persons, input.eurPerKwh)

  let yearlySaving = 0
  let litersSavedPerYear = 0
  if (flowLpm > GOOD_MAX) {
    const efficientCost = yearlyCostForFlow(EFFICIENT_FLOW_LPM, persons, input.eurPerKwh)
    yearlySaving = Math.max(0, yearlyCost - efficientCost)
    // Die Wassermenge ist die belastbarere Groesse: Sie folgt direkt aus dem
    // gemessenen Durchfluss, waehrend der Euro-Betrag zusaetzlich ueber
    // Warmwasseranteil, Temperaturhub und Strompreis laeuft. Sie steht deshalb
    // in der Empfehlung, wo der Euro-Betrag entfaellt.
    const showerMinutesPerYear =
      persons * SHOWERS_PER_PERSON_PER_DAY * MINUTES_PER_SHOWER * DAYS_PER_YEAR
    litersSavedPerYear = (flowLpm - EFFICIENT_FLOW_LPM) * showerMinutesPerYear
  }

  return {
    flowLpm,
    rating,
    yearlyCost: Math.round(yearlyCost),
    yearlySaving: Math.round(yearlySaving),
    litersSavedPerYear: Math.round(litersSavedPerYear),
  }
}
