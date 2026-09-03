import type { RoomType } from '@/types'
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
//
// Das Komfortband hängt vom Raumtyp ab: Ein Schlafzimmer bei 21 °C ist nicht
// „optimal", sondern überheizt – für Schlafräume gelten 16–18 °C als
// Empfehlung, für Bäder dagegen 22–24 °C. Ein einheitliches Band für alle
// Räume hätte genau die Fälle als ideal bewertet, in denen sich Absenken lohnt.
export interface ComfortBand {
  /** Untere Grenze des Komfortbands (°C). */
  min: number
  /** Obere Grenze des Komfortbands (°C) – zugleich Bezug für die Ersparnis. */
  max: number
}

/** Band für Räume ohne Raumbezug (Messung ohne `roomKey`). */
export const DEFAULT_COMFORT_BAND: ComfortBand = { min: 20, max: 22 }

/**
 * Komfortband je Raumtyp. Orientiert an gängigen Wohn-Empfehlungen
 * (Aufenthaltsräume ~20–22 °C, Schlaf- und Nebenräume kühler, Bad wärmer).
 */
export const COMFORT_BANDS: Record<RoomType, ComfortBand> = {
  living_room: { min: 20, max: 22 },
  dining_room: { min: 20, max: 22 },
  bedroom: { min: 16, max: 18 },
  children_room: { min: 20, max: 22 },
  office: { min: 20, max: 22 },
  kitchen: { min: 18, max: 20 },
  bathroom: { min: 22, max: 24 },
  toilet: { min: 18, max: 20 },
  hallway: { min: 16, max: 18 },
  utility_room: { min: 16, max: 18 },
  basement: { min: 14, max: 18 },
  staircase: { min: 15, max: 18 },
  attic: { min: 18, max: 20 },
}

/** Komfortband eines Raumtyps; ohne Raumbezug gilt {@link DEFAULT_COMFORT_BAND}. */
export function comfortBand(roomType?: RoomType): ComfortBand {
  return (roomType && COMFORT_BANDS[roomType]) || DEFAULT_COMFORT_BAND
}

// Ab diesem Abstand vom Komfortband gilt die Abweichung als deutlich (Rating „high").
const TEMP_EXTREME_TOLERANCE = 3

// Schwellenwerte Luftfeuchte (%).
//
// Wie beim Komfortband hängt der gesunde Bereich vom Raumtyp ab: Ein Keller
// mit 65 % ist unauffällig, ein Wohnzimmer mit 65 % nicht. Ein einheitliches
// Band meldete jeden normalen Keller als „zu feucht" – und übersah zugleich
// den Fall, auf den es dort ankommt (siehe `dewPoint.ts`).
export interface HumidityBand {
  /** Untere Grenze des gesunden Bereichs (% rel. Feuchte). */
  min: number
  /** Obere Grenze des gesunden Bereichs (% rel. Feuchte). */
  max: number
}

/** Band für Wohnräume – und für Messungen ohne Raumbezug. */
export const DEFAULT_HUMIDITY_BAND: HumidityBand = { min: 40, max: 60 }

/**
 * Feuchte-Band je Raumtyp.
 *
 * Nur Keller und Waschküche weichen ab: Beide sind kühl, beide tragen
 * regelmäßig Feuchte ein (Erdreich, Wäsche), und in beiden ist ein höherer
 * Wert normal statt auffällig. Alle übrigen Räume behalten den Wohnraum-Wert –
 * ein eigenes Band je Raumtyp wäre eine Genauigkeit, die die Sache nicht
 * hergibt.
 */
export const HUMIDITY_BANDS: Partial<Record<RoomType, HumidityBand>> = {
  basement: { min: 50, max: 65 },
  utility_room: { min: 50, max: 65 },
}

/** Feuchte-Band eines Raumtyps; ohne Raumbezug gilt {@link DEFAULT_HUMIDITY_BAND}. */
export function humidityBand(roomType?: RoomType): HumidityBand {
  return (roomType && HUMIDITY_BANDS[roomType]) || DEFAULT_HUMIDITY_BAND
}

/**
 * Ab diesem Abstand vom Feuchte-Band gilt die Abweichung als deutlich
 * (Rating „high") – analog zu {@link TEMP_EXTREME_TOLERANCE}.
 *
 * Bewusst relativ statt als zweites Zahlenpaar: Für den Wohnraum ergibt das
 * genau die bisherigen Grenzen (30 % / 70 %), für den Keller verschieben sie
 * sich mit dem Band. Eine Regel statt zweier Tabellen, die auseinanderlaufen
 * können.
 */
const HUM_EXTREME_TOLERANCE = 10


export interface RoomClimateInput {
  /** Raumtemperatur in °C. */
  temperature: number
  /** Luftfeuchte in % (nur wenn erfasst). */
  humidity?: number
  /** Subjektive Zugluft. */
  draft: DraftLevel
  /** Raumtyp – bestimmt das Komfortband. Ohne Angabe gilt der Default. */
  roomType?: RoomType
}

export interface RoomClimateResult {
  rating: MeasurementRating
  /** Angewandtes Komfortband (für Anzeige und Ersparnis-Bezug). */
  band: ComfortBand
  /** Angewandtes Feuchte-Band – wird wie `band` mitgespeichert. */
  humidityBand: HumidityBand
  /** Status der Temperatur (immer erfasst). */
  temperatureStatus: DimensionStatus
  /** Status der Luftfeuchte (nur wenn erfasst). */
  humidityStatus?: DimensionStatus
  /** Status der Zugluft, falls spürbar/stark. */
  draftStatus?: DimensionStatus
}

export function rateTemperature(temp: number, roomType?: RoomType): DimensionStatus {
  return rateTemperatureInBand(temp, comfortBand(roomType))
}

/** Wie {@link rateTemperature}, aber gegen ein bereits bekanntes Band. */
export function rateTemperatureInBand(temp: number, band: ComfortBand): DimensionStatus {
  if (temp < band.min) return 'tooCold'
  if (temp > band.max) return 'tooWarm'
  return 'optimal'
}

export function rateHumidity(humidity: number, roomType?: RoomType): DimensionStatus {
  return rateHumidityInBand(humidity, humidityBand(roomType))
}

/** Wie {@link rateHumidity}, aber gegen ein bereits bekanntes Band. */
export function rateHumidityInBand(humidity: number, band: HumidityBand): DimensionStatus {
  if (humidity < band.min) return 'tooDry'
  if (humidity > band.max) return 'tooHumid'
  return 'optimal'
}

export function calcRoomClimate(input: RoomClimateInput): RoomClimateResult {
  const temp = input.temperature
  const band = comfortBand(input.roomType)
  const tempStatus = rateTemperatureInBand(temp, band)
  const tempOptimal = tempStatus === 'optimal'

  const humBand = humidityBand(input.roomType)
  const hasHumidity = Number.isFinite(input.humidity)
  const humStatus = hasHumidity
    ? rateHumidityInBand(input.humidity as number, humBand)
    : undefined
  const humOptimal = humStatus === 'optimal'

  const draftStatus: DimensionStatus | undefined =
    input.draft === 'strong'
      ? 'draftStrong'
      : input.draft === 'noticeable'
        ? 'draftNoticeable'
        : undefined

  // Starke Ausreißer → high.
  const extremeTemp =
    temp < band.min - TEMP_EXTREME_TOLERANCE || temp > band.max + TEMP_EXTREME_TOLERANCE
  const extremeHum =
    hasHumidity &&
    ((input.humidity as number) < humBand.min - HUM_EXTREME_TOLERANCE ||
      (input.humidity as number) > humBand.max + HUM_EXTREME_TOLERANCE)
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

  return {
    rating,
    band,
    humidityBand: humBand,
    temperatureStatus: tempStatus,
    humidityStatus: humStatus,
    draftStatus,
  }
}

// --- Geldeinsparung durch niedrigere Raumtemperatur ---------------------------
// Faustregel: ~6 % Heizenergie pro 1 °C unter dem bisherigen Niveau (breiter
// Konsens; Hochschule Biberach 2011 maß real 7–8 %). Wir rechnen konservativ.
export const PERCENT_PER_DEGREE = 0.06

/**
 * Bezugstemperatur der Einsparung: die **obere Grenze des Komfortbands**, nicht
 * dessen Untergrenze.
 *
 * Wichtig, damit Bewertung und Ersparnis nicht widersprüchlich sind: Ein Raum
 * innerhalb des Komfortbands wird als „optimal" bewertet – dann darf die App
 * nicht gleichzeitig zum Absenken raten. Sparpotenzial gibt es erst, wenn die
 * Temperatur das Band nach oben verlässt.
 */
export const SAVING_REFERENCE_TEMP = DEFAULT_COMFORT_BAND.max

/**
 * Die €-Anzeigeregeln (Mindestbetrag, Rundung) sind nicht raumklima-spezifisch,
 * sondern gelten fuer jede geschaetzte Ersparnis der App. Sie liegen deshalb in
 * `../savingsDisplay` und werden hier nur weitergereicht, damit bestehende
 * Importe aus dem Raumklima-Modul weiter funktionieren.
 */
export { MIN_DISPLAY_EUR, EUR_ROUNDING_STEP, displaySavingEur } from '../savingsDisplay'

export interface RoomTempSavingInput {
  /** Gemessene Raumtemperatur in °C. */
  temp: number
  /** Effektive Fläche dieses Raums in m² (eigene Angabe oder verteilter Wert). */
  roomAreaSqm: number
  /** true, wenn `roomAreaSqm` aus der Verteilung stammt (keine eigene Angabe). */
  areaEstimated: boolean
  /** Gesamt-Wohnfläche in m² (Nenner für den Flächenanteil). */
  livingArea: number
  /**
   * Reine Heiz-Jahreskosten in € (Warmwasser bereits herausgerechnet). Fehlt
   * der Wert (keine Ablesungen), wird nur die %/°C-Aussage geliefert, kein €.
   */
  heatingOnlyCostEur?: number
  /**
   * Obere Komfortgrenze dieses Raums in °C. Default: {@link SAVING_REFERENCE_TEMP}.
   */
  referenceTemp?: number
}

export interface RoomTempSaving {
  /** Grad über der Komfort-Obergrenze (0, wenn nicht zu warm). */
  deltaT: number
  /** Bezugstemperatur, gegen die ΔT gebildet wurde (°C). */
  referenceTemp: number
  /** Flächenanteil des Raums an der Wohnung (0..1). */
  share: number
  /** Relative Heizenergie-Einsparung (z. B. 0,18 = 18 %). */
  percent: number
  /** Jährliche €-Einsparung (ungerundet); undefined ohne Heizkosten oder ohne ΔT. */
  yearlySaving?: number
  /** true, wenn die Fläche aus dem Fallback (typischer Wert) stammt. */
  areaEstimated: boolean
}

/**
 * Anteilige Jahres-Einsparung eines Raums durch Absenken auf die Komfort-Obergrenze.
 * `yearlySaving = heizkostenOhneWarmwasser × Flächenanteil × 6 % × ΔT`.
 *
 * Grenzen des Modells (bewusst in Kauf genommen, siehe UI-Hinweis „Orientierungswert"):
 * Die 6 %/°C gelten für die *gesamte* beheizte Fläche; die Aufteilung erfolgt hier
 * nach Grundfläche, während die tatsächliche Heizlast eines Raums von seiner
 * Hüllfläche (Außenwände, Fenster) abhängt. Bei Absenkung eines *einzelnen* Raums
 * fließt zudem Wärme aus Nachbarräumen nach. Der Wert ist damit eine
 * Größenordnung, keine Prognose.
 */
export function calcRoomTempSaving(input: RoomTempSavingInput): RoomTempSaving {
  const referenceTemp = input.referenceTemp ?? SAVING_REFERENCE_TEMP
  const deltaT = Math.max(0, input.temp - referenceTemp)
  const roomArea = Number.isFinite(input.roomAreaSqm) && input.roomAreaSqm > 0 ? input.roomAreaSqm : 0
  const living = Number.isFinite(input.livingArea) && input.livingArea > 0 ? input.livingArea : 0
  const share = living > 0 ? Math.min(1, roomArea / living) : 0
  const percent = deltaT * PERCENT_PER_DEGREE

  let yearlySaving: number | undefined
  if (deltaT > 0 && share > 0 && input.heatingOnlyCostEur !== undefined) {
    yearlySaving = input.heatingOnlyCostEur * share * percent
  }

  return { deltaT, referenceTemp, share, percent, yearlySaving, areaEstimated: input.areaEstimated }
}
