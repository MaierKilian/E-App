import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Gefrierschrank-Check.
 *
 * Idee: Der Nutzer schätzt den Vereisungsgrad (eisfrei / leichte / starke
 * Vereisung) und optional die Innentemperatur (°C). Eine Eisschicht wirkt wie
 * eine Dämmung und treibt den Stromverbrauch hoch – daraus ergeben sich grob
 * vermeidbare Jahreskosten.
 *
 * Annahmen: Jahresverbrauch ~200 kWh; leichte Vereisung ~+10 %, starke
 * Vereisung ~+25 % Mehrverbrauch. Alle Werte sind bewusste Näherungen.
 */

export type FrostLevel = 'none' | 'light' | 'heavy'

// Mehrverbrauch je Vereisungsgrad (Anteil von YEARLY_KWH).
const EXTRA_SHARE: Record<FrostLevel, number> = {
  none: 0,
  light: 0.1,
  heavy: 0.25,
}

const RATING_BY_FROST: Record<FrostLevel, MeasurementRating> = {
  none: 'good',
  light: 'medium',
  heavy: 'high',
}

const YEARLY_KWH = 200

// Schwellenwerte Temperatur (°C). Optimal ~ -18 °C.
const TEMP_OPTIMAL = -18
const TEMP_TOO_WARM = -16 // wärmer als -16 °C = zu warm
const TEMP_TOO_COLD = -20 // kälter als -20 °C = zu kalt

export type FreezerTempStatus = 'optimal' | 'tooWarm' | 'tooCold'

export interface FreezerInput {
  /** Geschätzter Vereisungsgrad. */
  frost: FrostLevel
  /** Innentemperatur in °C (nur wenn erfasst). */
  temperature?: number
  /** Arbeitspreis Strom in ct/kWh (aus dem Tarif-Store). */
  workPriceCt: number
}

export interface FreezerResult {
  rating: MeasurementRating
  /** Grob vermeidbare Jahreskosten in € (durch Abtauen). 0 bei eisfrei. */
  avoidableCost: number
  /** Status der Innentemperatur, falls erfasst. */
  temperatureStatus?: FreezerTempStatus
}

export function rateFrost(frost: FrostLevel): MeasurementRating {
  return RATING_BY_FROST[frost]
}

export function freezerTempStatus(temp: number): FreezerTempStatus {
  if (temp > TEMP_TOO_WARM) return 'tooWarm'
  if (temp < TEMP_TOO_COLD) return 'tooCold'
  return 'optimal'
}

export function calcFreezer(input: FreezerInput): FreezerResult {
  const share = EXTRA_SHARE[input.frost] ?? 0
  const workPrice = Number.isFinite(input.workPriceCt) ? input.workPriceCt : 0
  const extraKwh = YEARLY_KWH * share
  const avoidableCost = Math.max(0, (extraKwh * workPrice) / 100)

  const hasTemp = Number.isFinite(input.temperature)
  const temperatureStatus = hasTemp
    ? freezerTempStatus(input.temperature as number)
    : undefined

  return {
    rating: rateFrost(input.frost),
    avoidableCost: Math.round(avoidableCost),
    temperatureStatus,
  }
}

export { TEMP_OPTIMAL }
