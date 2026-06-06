import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Kühlschrank-Check.
 *
 * Idee: Der Nutzer misst die Innentemperatur des Kühlschranks (°C). Daraus
 * ergibt sich eine Bewertung. Ist der Kühlschrank zu kalt eingestellt, lässt
 * sich grob abschätzen, wie viel Strom (und Geld) sich pro Jahr sparen ließe,
 * wenn man auf die empfohlene Temperatur (~7 °C) hochregelt.
 *
 * Faustregel: ~6 % Mehrverbrauch je °C kälter als nötig. Angenommener
 * Jahresverbrauch eines Kühlschranks ~150 kWh. Alle Werte sind bewusste
 * Näherungen zur Veranschaulichung.
 */

// Schwellenwerte für die Bewertung (°C).
const GOOD_MIN = 5
const GOOD_MAX = 7
const TOO_COLD_MAX = 2 // <3 °C = zu kalt
const TOO_WARM_MIN = 8 // >8 °C = zu warm

// Annahmen für die Ersparnis-Schätzung (bei zu kalt).
const YEARLY_KWH = 150
const PERCENT_PER_DEGREE = 0.06 // ~6 % Mehrverbrauch je °C zu kalt
const REFERENCE_TEMP = 7 // empfohlene Innentemperatur

export type FridgeStatus = 'tooCold' | 'optimal' | 'tooWarm'

export interface FridgeInput {
  /** Gemessene Innentemperatur in °C. */
  temperature: number
  /** Arbeitspreis Strom in ct/kWh (aus dem Tarif-Store). */
  workPriceCt: number
}

export interface FridgeResult {
  rating: MeasurementRating
  status: FridgeStatus
  /**
   * Grob geschätzte jährliche Ersparnis in € durch Hochregeln auf ~7 °C.
   * Nur > 0, wenn der Kühlschrank kälter als empfohlen läuft.
   */
  yearlySaving: number
}

export function rateFridge(temp: number): MeasurementRating {
  if (temp >= GOOD_MIN && temp <= GOOD_MAX) return 'good'
  if (temp < TOO_COLD_MAX + 1 || temp > TOO_WARM_MIN) return 'high'
  return 'medium'
}

export function fridgeStatus(temp: number): FridgeStatus {
  if (temp < GOOD_MIN) return 'tooCold'
  if (temp > GOOD_MAX) return 'tooWarm'
  return 'optimal'
}

export function calcFridge(input: FridgeInput): FridgeResult {
  const temp = Number.isFinite(input.temperature) ? input.temperature : REFERENCE_TEMP
  const rating = rateFridge(temp)
  const status = fridgeStatus(temp)

  let yearlySaving = 0
  if (temp < REFERENCE_TEMP) {
    const degreesTooCold = REFERENCE_TEMP - temp
    const extraKwh = YEARLY_KWH * PERCENT_PER_DEGREE * degreesTooCold
    const workPrice = Number.isFinite(input.workPriceCt) ? input.workPriceCt : 0
    yearlySaving = Math.max(0, (extraKwh * workPrice) / 100)
  }

  return {
    rating,
    status,
    yearlySaving: Math.round(yearlySaving),
  }
}
