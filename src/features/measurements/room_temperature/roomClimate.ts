import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Raumklima-Check.
 *
 * Idee: Der Nutzer erfasst die Raumtemperatur (°C), optional die Luftfeuchte (%)
 * sowie eine subjektive Einschätzung der Zugluft. Daraus ergeben sich
 * Teilbewertungen je Dimension und ein Gesamt-Rating.
 *
 * Die Schwellenwerte orientieren sich an üblichen Komfort-/Energiespar-
 * Empfehlungen (Wohnraum ~20–22 °C, Luftfeuchte ~40–60 %).
 */

export type DraftLevel = 'none' | 'noticeable' | 'strong'

/** Status einer einzelnen Dimension (für kurze Hinweise im Ergebnis). */
export type DimensionStatus =
  | 'optimal'
  | 'tooCold'
  | 'tooWarm'
  | 'tooDry'
  | 'tooHumid'
  | 'draftNoticeable'
  | 'draftStrong'

// Schwellenwerte Temperatur (°C).
const TEMP_OPTIMAL_MIN = 20
const TEMP_OPTIMAL_MAX = 22
const TEMP_OK_MIN = 19
const TEMP_OK_MAX = 23
const TEMP_EXTREME_LOW = 17
const TEMP_EXTREME_HIGH = 25

// Schwellenwerte Luftfeuchte (%).
const HUM_OPTIMAL_MIN = 40
const HUM_OPTIMAL_MAX = 60
const HUM_EXTREME_LOW = 30
const HUM_EXTREME_HIGH = 70

export interface RoomClimateInput {
  /** Raumtemperatur in °C. */
  temperature: number
  /** Luftfeuchte in % (nur wenn erfasst). */
  humidity?: number
  /** Subjektive Zugluft. */
  draft: DraftLevel
}

export interface RoomClimateResult {
  rating: MeasurementRating
  /** Status der Temperatur (immer erfasst). */
  temperatureStatus: DimensionStatus
  /** Status der Luftfeuchte (nur wenn erfasst). */
  humidityStatus?: DimensionStatus
  /** Status der Zugluft, falls spürbar/stark. */
  draftStatus?: DimensionStatus
}

export function rateTemperature(temp: number): DimensionStatus {
  if (temp < TEMP_OPTIMAL_MIN) return 'tooCold'
  if (temp > TEMP_OPTIMAL_MAX) return 'tooWarm'
  return 'optimal'
}

export function rateHumidity(humidity: number): DimensionStatus {
  if (humidity < HUM_OPTIMAL_MIN) return 'tooDry'
  if (humidity > HUM_OPTIMAL_MAX) return 'tooHumid'
  return 'optimal'
}

/** Temperatur liegt im „ok"-Band (knapp daneben, aber nicht extrem). */
function temperatureIsOk(temp: number): boolean {
  return temp >= TEMP_OK_MIN && temp <= TEMP_OK_MAX
}

export function calcRoomClimate(input: RoomClimateInput): RoomClimateResult {
  const temp = input.temperature
  const tempStatus = rateTemperature(temp)
  const tempOptimal = tempStatus === 'optimal'

  const hasHumidity = Number.isFinite(input.humidity)
  const humStatus = hasHumidity ? rateHumidity(input.humidity as number) : undefined
  const humOptimal = humStatus === 'optimal'

  const draftStatus: DimensionStatus | undefined =
    input.draft === 'strong'
      ? 'draftStrong'
      : input.draft === 'noticeable'
        ? 'draftNoticeable'
        : undefined

  // Starke Ausreißer → high.
  const extremeTemp = temp < TEMP_EXTREME_LOW || temp > TEMP_EXTREME_HIGH
  const extremeHum =
    hasHumidity &&
    ((input.humidity as number) < HUM_EXTREME_LOW ||
      (input.humidity as number) > HUM_EXTREME_HIGH)
  const strongDraft = input.draft === 'strong'

  let rating: MeasurementRating
  if (extremeTemp || extremeHum || strongDraft) {
    rating = 'high'
  } else if (
    tempOptimal &&
    (humOptimal || !hasHumidity) &&
    input.draft === 'none'
  ) {
    rating = 'good'
  } else {
    rating = 'medium'
  }

  // „ok"-Temperatur darf good nicht erzwingen, hebt medium aber auch nicht an;
  // sie bleibt medium (bewusst, da nur Optimum „good" ergibt).
  void temperatureIsOk

  return {
    rating,
    temperatureStatus: tempStatus,
    humidityStatus: humStatus,
    draftStatus,
  }
}
