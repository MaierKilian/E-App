import type { MeasurementId } from '@/features/measurements/types'
import type { MeasurementRating } from '@/features/measurements/types'
import { GOOD_MAX as FLOW_GOOD_MAX, MEDIUM_MAX as FLOW_MEDIUM_MAX } from '@/features/measurements/showerhead/showerhead'
import {
  WAIT_GOOD_MAX_S,
  WAIT_MEDIUM_MAX_S,
  WAIT_ELEVATED_MAX_S,
} from '@/features/measurements/hot_water_wait/hotWaterWait'
import { GOOD_MAX as STANDBY_GOOD_MAX, MEDIUM_MAX as STANDBY_MEDIUM_MAX } from '@/features/measurements/standby/standby'
import {
  GOOD_MAX as BASE_GOOD_MAX,
  MEDIUM_MAX as BASE_MEDIUM_MAX,
  ELEVATED_MAX as BASE_ELEVATED_MAX,
} from '@/features/measurements/base_load/baseLoad'
import {
  GOOD_MIN as FRIDGE_GOOD_MIN,
  GOOD_MAX as FRIDGE_GOOD_MAX,
  TOO_COLD_MAX as FRIDGE_TOO_COLD_MAX,
  TOO_WARM_MIN as FRIDGE_TOO_WARM_MIN,
} from '@/features/measurements/fridge/fridge'
import {
  TEMP_OPTIMAL as FREEZER_OPTIMAL,
  TEMP_TOO_WARM as FREEZER_TOO_WARM,
  TEMP_TOO_COLD as FREEZER_TOO_COLD,
} from '@/features/measurements/freezer/freezer'
import {
  COMFORT_BANDS,
  HUM_OPTIMAL_MIN,
  HUM_OPTIMAL_MAX,
} from '@/features/measurements/room_temperature/roomClimate'
import {
  DISTANCE_TARGET_CM,
  DISTANCE_BLOCKED_CM,
  COVER_PARTLY_PCT,
  COVER_BLOCKED_PCT,
} from '@/features/measurements/furniture_spacing/furnitureSpacing'

/**
 * Richtwert-Tabellen der Mess-Hintergründe.
 *
 * **Kein Wert steht hier als Zahl im Quelltext.** Jede Grenze wird aus dem
 * Modul importiert, das mit ihr rechnet. Der Grund ist derselbe wie beim
 * Tank-Umbau: Sobald eine Zahl an zwei Stellen steht, laufen die beiden
 * auseinander – und dann behauptet der Wissensbereich einen Richtwert, den die
 * Messung längst anders sieht. Ändert jemand `GOOD_MAX` im Duschkopf-Modul,
 * ändert sich diese Tabelle mit.
 *
 * Die **Beschriftung** dagegen gehört hierher: Sie ist Inhalt des
 * Wissensbereichs und liegt wie der übrige Fachtext als deutscher Text im
 * Quelltext (siehe Kopf von `educationContent.ts`).
 */
export interface ThresholdRow {
  /** Bewertungsstufe – trägt Farbe und Wort. `null` = reine Einordnung. */
  rating: MeasurementRating | null
  /** Beschriftung der Zeile, z. B. „Sparsam" oder „Wohnräume". */
  label: string
  /** Wertebereich als fertiger Text, z. B. „bis 9 l/min". */
  range: string
}

export interface ThresholdTable {
  /** Was gemessen wird, z. B. „Durchfluss". */
  quantity: string
  rows: ThresholdRow[]
  /** Zusatzzeile unter der Tabelle, wo eine Grenze allein nicht reicht. */
  note?: string
}

const upTo = (value: number, unit: string) => `bis ${value} ${unit}`
const between = (from: number, to: number, unit: string) => `${from}–${to} ${unit}`
const above = (value: number, unit: string) => `über ${value} ${unit}`

export const MEASUREMENT_THRESHOLDS: Partial<Record<MeasurementId, ThresholdTable>> = {
  showerhead: {
    quantity: 'Durchfluss',
    rows: [
      { rating: 'good', label: 'Sparsam', range: upTo(FLOW_GOOD_MAX, 'l/min') },
      { rating: 'medium', label: 'Mittel', range: between(FLOW_GOOD_MAX, FLOW_MEDIUM_MAX, 'l/min') },
      { rating: 'high', label: 'Hoch', range: above(FLOW_MEDIUM_MAX, 'l/min') },
    ],
  },
  hot_water_wait: {
    quantity: 'Wartezeit bis warm',
    rows: [
      { rating: 'good', label: 'Kurz', range: upTo(WAIT_GOOD_MAX_S, 's') },
      { rating: 'medium', label: 'Spürbar', range: between(WAIT_GOOD_MAX_S, WAIT_MEDIUM_MAX_S, 's') },
      { rating: 'elevated', label: 'Lang', range: between(WAIT_MEDIUM_MAX_S, WAIT_ELEVATED_MAX_S, 's') },
      { rating: 'high', label: 'Sehr lang', range: above(WAIT_ELEVATED_MAX_S, 's') },
    ],
  },
  room_temperature: {
    quantity: 'Komfortband je Raum',
    rows: [
      {
        rating: null,
        label: 'Wohn- und Arbeitsräume',
        range: between(COMFORT_BANDS.living_room.min, COMFORT_BANDS.living_room.max, '°C'),
      },
      {
        rating: null,
        label: 'Schlafräume',
        range: between(COMFORT_BANDS.bedroom.min, COMFORT_BANDS.bedroom.max, '°C'),
      },
      {
        rating: null,
        label: 'Küche',
        range: between(COMFORT_BANDS.kitchen.min, COMFORT_BANDS.kitchen.max, '°C'),
      },
      {
        rating: null,
        label: 'Bad',
        range: between(COMFORT_BANDS.bathroom.min, COMFORT_BANDS.bathroom.max, '°C'),
      },
      {
        rating: null,
        label: 'Keller',
        range: between(COMFORT_BANDS.basement.min, COMFORT_BANDS.basement.max, '°C'),
      },
    ],
    note: `Luftfeuchte: ${HUM_OPTIMAL_MIN}–${HUM_OPTIMAL_MAX} % sind der gesunde Bereich.`,
  },
  furniture_spacing: {
    quantity: 'Abstand vor dem Heizkörper',
    rows: [
      { rating: 'good', label: 'Frei', range: `ab ${DISTANCE_TARGET_CM} cm` },
      {
        rating: 'medium',
        label: 'Eng',
        range: between(DISTANCE_BLOCKED_CM, DISTANCE_TARGET_CM, 'cm'),
      },
      { rating: 'high', label: 'Blockiert', range: `unter ${DISTANCE_BLOCKED_CM} cm` },
    ],
    note: `Verdeckte Fläche: bis ${COVER_PARTLY_PCT} % unkritisch, ab ${COVER_BLOCKED_PCT} % blockiert.`,
  },
  standby: {
    quantity: 'Standby-Leistung je Gerät',
    rows: [
      { rating: 'good', label: 'Sparsam', range: upTo(STANDBY_GOOD_MAX, 'W') },
      { rating: 'medium', label: 'Mittel', range: between(STANDBY_GOOD_MAX, STANDBY_MEDIUM_MAX, 'W') },
      { rating: 'high', label: 'Hoch', range: above(STANDBY_MEDIUM_MAX, 'W') },
    ],
  },
  base_load: {
    quantity: 'Grundlast des Haushalts',
    rows: [
      { rating: 'good', label: 'Niedrig', range: upTo(BASE_GOOD_MAX, 'W') },
      { rating: 'medium', label: 'Mittel', range: between(BASE_GOOD_MAX, BASE_MEDIUM_MAX, 'W') },
      { rating: 'elevated', label: 'Erhöht', range: between(BASE_MEDIUM_MAX, BASE_ELEVATED_MAX, 'W') },
      { rating: 'high', label: 'Hoch', range: above(BASE_ELEVATED_MAX, 'W') },
    ],
  },
  fridge: {
    quantity: 'Innentemperatur',
    rows: [
      { rating: 'high', label: 'Zu kalt', range: `unter ${FRIDGE_TOO_COLD_MAX + 1} °C` },
      { rating: 'good', label: 'Richtig', range: between(FRIDGE_GOOD_MIN, FRIDGE_GOOD_MAX, '°C') },
      { rating: 'medium', label: 'Zu warm', range: above(FRIDGE_TOO_WARM_MIN, '°C') },
    ],
  },
  freezer: {
    quantity: 'Innentemperatur',
    rows: [
      { rating: 'medium', label: 'Zu kalt', range: `unter ${FREEZER_TOO_COLD} °C` },
      { rating: 'good', label: 'Richtig', range: `${FREEZER_OPTIMAL} °C` },
      { rating: 'high', label: 'Zu warm', range: above(FREEZER_TOO_WARM, '°C') },
    ],
  },
  // `lighting` bekommt bewusst keine Tabelle: Der Check bewertet, wie viele
  // Räume noch kein LED-Licht haben – dafür gibt es keine Messgröße mit
  // Schwellen, nur einen Befund.
}
