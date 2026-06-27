import type { MeasurementRating } from '../types'
import type { RoomType } from '@/types'
import { TYPICAL_AREA_SQM } from './roomAreas'

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

// --- Geldeinsparung durch niedrigere Raumtemperatur ---------------------------
// Faustregel: ~6 % Heizenergie pro 1 °C unter dem bisherigen Niveau (breiter
// Konsens; Hochschule Biberach 2011 maß real 7–8 %). Wir rechnen konservativ.
export const TARGET_TEMP = 20
export const PERCENT_PER_DEGREE = 0.06

export interface RoomTempSavingInput {
  /** Gemessene Raumtemperatur in °C. */
  temp: number
  /** Raumtyp (für die Fallback-Fläche, falls keine eigene hinterlegt ist). */
  roomType?: RoomType
  /** Vom Nutzer hinterlegte Fläche dieses Raums in m² (optional). */
  areaSqm?: number
  /** Gesamt-Wohnfläche in m² (Nenner für den Flächenanteil). */
  livingArea: number
  /**
   * Reine Heiz-Jahreskosten in € (Warmwasser bereits herausgerechnet). Fehlt
   * der Wert (keine Ablesungen), wird nur die %/°C-Aussage geliefert, kein €.
   */
  heatingOnlyCostEur?: number
}

export interface RoomTempSaving {
  /** Grad über der Zieltemperatur (0, wenn nicht zu warm). */
  deltaT: number
  /** Flächenanteil des Raums an der Wohnung (0..1). */
  share: number
  /** Relative Heizenergie-Einsparung (z. B. 0,18 = 18 %). */
  percent: number
  /** Jährliche €-Einsparung; undefined ohne Heizkosten oder ohne ΔT. */
  yearlySaving?: number
  /** true, wenn die Fläche aus dem Fallback (typischer Wert) stammt. */
  areaEstimated: boolean
}

/**
 * Anteilige Jahres-Einsparung eines Raums durch Absenken auf die Zieltemperatur.
 * `yearlySaving = heizkostenOhneWarmwasser × Flächenanteil × 6 % × ΔT`.
 */
export function calcRoomTempSaving(input: RoomTempSavingInput): RoomTempSaving {
  const deltaT = Math.max(0, input.temp - TARGET_TEMP)
  const hasOwnArea = Number.isFinite(input.areaSqm) && (input.areaSqm as number) > 0
  const areaEstimated = !hasOwnArea
  const roomArea = hasOwnArea
    ? (input.areaSqm as number)
    : input.roomType
      ? TYPICAL_AREA_SQM[input.roomType]
      : 0
  const living = Number.isFinite(input.livingArea) && input.livingArea > 0 ? input.livingArea : 0
  const share = living > 0 ? Math.min(1, roomArea / living) : 0
  const percent = deltaT * PERCENT_PER_DEGREE

  let yearlySaving: number | undefined
  if (deltaT > 0 && share > 0 && input.heatingOnlyCostEur !== undefined) {
    yearlySaving = input.heatingOnlyCostEur * share * percent
  }

  return { deltaT, share, percent, yearlySaving, areaEstimated }
}
