import type { MeasurementId } from '@/features/measurements/types'
import type { Source } from './educationContent'
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
  DEFAULT_HUMIDITY_BAND,
  HUMIDITY_BANDS,
} from '@/features/measurements/room_temperature/roomClimate'
import { ASSUMED_BASEMENT_WALL_C } from '@/features/measurements/room_temperature/dewPoint'
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

/**
 * Woher ein Richtwert kommt.
 *
 * **Drei Zustände, keine zwei.** Eine Bewertung ohne Vergleichsmaßstab ist
 * wertlos – aber eine erfundene Quelle ist schlimmer als gar keine. Deshalb
 * steht hier ausdrücklich auch, wo *nichts* gefunden wurde:
 *
 * - `reference` – belegt, mit Stand-Datum. Die Zahl steht so in der Quelle.
 * - `own` – Richtwert der E-App, hergeleitet. Ehrlicher als eine passend
 *   wirkende Fundstelle, die die Zahl nicht hergibt.
 * - `pending` – noch zu klären. Weder belegt noch bewusst gesetzt: Hier ist
 *   entweder eine Quelle zu finden oder die Schwelle zu überdenken.
 *
 * Der Unterschied zwischen `own` und `pending` ist der zwischen „wir haben
 * entschieden" und „wir sind noch nicht fertig". Ihn einzuebnen wäre bequem
 * und falsch.
 */
export type ThresholdOrigin =
  | { kind: 'reference'; source: Source }
  | { kind: 'own'; reason: string }
  | { kind: 'pending'; reason: string }

export interface ThresholdTable {
  /** Was gemessen wird, z. B. „Durchfluss". */
  quantity: string
  rows: ThresholdRow[]
  /** Zusatzzeile unter der Tabelle, wo eine Grenze allein nicht reicht. */
  note?: string
  /** Woher die Werte stammen – jede Tabelle sagt es. */
  origin: ThresholdOrigin
}

/** Kurzform für eine belegte Quelle. */
const ref = (label: string, url: string, stand = '09/2026'): ThresholdOrigin => ({
  kind: 'reference',
  source: { label, url, stand },
})

/** Kurzform für einen Richtwert der E-App. */
const own = (reason: string): ThresholdOrigin => ({ kind: 'own', reason })

/** Kurzform für einen Wert, der noch zu klären ist. */
const pending = (reason: string): ThresholdOrigin => ({ kind: 'pending', reason })

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
    origin: ref(
      'Verbraucherzentrale – Warmwasser im Alltag sparen',
      'https://www.verbraucherzentrale.de/wissen/energie/heizen-und-warmwasser/warmwasser-im-alltag-sparen-so-gehts-17752',
    ),
  },
  hot_water_wait: {
    quantity: 'Wartezeit bis warm',
    rows: [
      { rating: 'good', label: 'Kurz', range: upTo(WAIT_GOOD_MAX_S, 's') },
      { rating: 'medium', label: 'Spürbar', range: between(WAIT_GOOD_MAX_S, WAIT_MEDIUM_MAX_S, 's') },
      { rating: 'elevated', label: 'Lang', range: between(WAIT_MEDIUM_MAX_S, WAIT_ELEVATED_MAX_S, 's') },
      { rating: 'high', label: 'Sehr lang', range: above(WAIT_ELEVATED_MAX_S, 's') },
    ],
    origin: pending(
      'Ohne Beleg. Die Stufen sind gewachsen, nicht hergeleitet – vor dem nächsten Release entweder belegen oder überdenken.',
    ),
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
    note:
      `Luftfeuchte: ${between(DEFAULT_HUMIDITY_BAND.min, DEFAULT_HUMIDITY_BAND.max, '%')} in Wohnräumen, ` +
      `${between(HUMIDITY_BANDS.basement!.min, HUMIDITY_BANDS.basement!.max, '%')} in Keller und ` +
      `Waschküche – dort ist ein höherer Wert normal. Entscheidend ist im Keller ohnehin nicht die ` +
      `Prozentzahl, sondern der Taupunkt: Liegt er über der Wandtemperatur (rund ` +
      `${ASSUMED_BASEMENT_WALL_C} °C am Erdreich), schlägt sich Wasser an der Wand nieder. ` +
      `Belegt sind die Werte für Wohnräume, Schlafzimmer, Küche und Bad sowie die Feuchte in ` +
      `Wohnräumen. Keller, Waschküche und die angenommene Wandtemperatur sind Richtwerte dieser App.`,
    origin: ref(
      'Umweltbundesamt – Richtiges Heizen · Verbraucherzentrale Energieberatung – Heizen (Bad)',
      'https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/heizen-bauen/heizen-raumtemperatur',
    ),
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
    origin: ref(
      'Verbraucherzentrale – Heizung: 10 einfache Tipps zum Heizkosten sparen',
      'https://www.verbraucherzentrale.de/wissen/energie/heizen-und-warmwasser/heizung-10-einfache-tipps-zum-heizkosten-sparen-13892',
    ),
  },
  standby: {
    quantity: 'Standby-Leistung je Gerät',
    rows: [
      { rating: 'good', label: 'Sparsam', range: upTo(STANDBY_GOOD_MAX, 'W') },
      { rating: 'medium', label: 'Mittel', range: between(STANDBY_GOOD_MAX, STANDBY_MEDIUM_MAX, 'W') },
      { rating: 'high', label: 'Hoch', range: above(STANDBY_MEDIUM_MAX, 'W') },
    ],
    origin: pending(
      'Ohne Beleg. Die Ökodesign-Verordnung (EU) 2023/826 begrenzt den Bereitschaftsbetrieb neuer Geräte auf 0,5 W – das ist eine Bauvorschrift, kein Maßstab für ein Bestandsgerät am Messgerät. Sie taugt deshalb nicht als Quelle für diese Schwellen.',
    ),
  },
  base_load: {
    quantity: 'Grundlast des Haushalts',
    rows: [
      { rating: 'good', label: 'Niedrig', range: upTo(BASE_GOOD_MAX, 'W') },
      { rating: 'medium', label: 'Mittel', range: between(BASE_GOOD_MAX, BASE_MEDIUM_MAX, 'W') },
      { rating: 'elevated', label: 'Erhöht', range: between(BASE_MEDIUM_MAX, BASE_ELEVATED_MAX, 'W') },
      { rating: 'high', label: 'Hoch', range: above(BASE_ELEVATED_MAX, 'W') },
    ],
    origin: pending(
      'Ohne Beleg. Was als hohe Grundlast gilt, hängt am Haushalt – eine veröffentlichte Schwelle dazu ist bislang nicht gefunden.',
    ),
  },
  fridge: {
    quantity: 'Innentemperatur',
    rows: [
      { rating: 'high', label: 'Zu kalt', range: `unter ${FRIDGE_TOO_COLD_MAX + 1} °C` },
      { rating: 'good', label: 'Richtig', range: between(FRIDGE_GOOD_MIN, FRIDGE_GOOD_MAX, '°C') },
      { rating: 'medium', label: 'Zu warm', range: above(FRIDGE_TOO_WARM_MIN, '°C') },
    ],
    origin: ref(
      'Umweltbundesamt – Kühlschrank: mit kleinen Tipps unnötigen Stromverbrauch vermeiden',
      'https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/kuehlschrank-kleinen-tipps-unnoetigen#hintergrund',
    ),
  },
  freezer: {
    quantity: 'Innentemperatur',
    rows: [
      { rating: 'medium', label: 'Zu kalt', range: `unter ${FREEZER_TOO_COLD} °C` },
      { rating: 'good', label: 'Richtig', range: `${FREEZER_OPTIMAL} °C` },
      { rating: 'high', label: 'Zu warm', range: above(FREEZER_TOO_WARM, '°C') },
    ],
    origin: ref(
      'Umweltbundesamt – Kühlschrank: mit kleinen Tipps unnötigen Stromverbrauch vermeiden',
      'https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/kuehlschrank-kleinen-tipps-unnoetigen#hintergrund',
    ),
  },
  // Der LED-Check misst keine Größe, er bewertet einen Bestand: welche Räume
  // noch alte Beleuchtung haben. Ein Richtwert im Sinne einer Messgrenze
  // existiert hier nicht – die Tabelle sagt stattdessen, wie gewichtet wird.
  lighting: {
    quantity: 'Gewicht der Räume mit alter Beleuchtung',
    rows: [
      { rating: 'good', label: 'Nichts offen', range: 'Gewicht 0' },
      { rating: 'medium', label: 'Wenig offen', range: 'bis Gewicht 2' },
      { rating: 'elevated', label: 'Spürbar offen', range: 'bis Gewicht 5' },
      { rating: 'high', label: 'Viel offen', range: 'über Gewicht 5' },
    ],
    note: 'Räume zählen unterschiedlich: Küche und Wohnzimmer wiegen 3, Nebenräume 1. Vier Kellerräume wiegen damit weniger als eine Küche – dort brennt das Licht länger.',
    origin: own(
      'Keine Messgrenze, sondern eine Gewichtung: wo Licht lange brennt, lohnt der Tausch zuerst. Die Gewichte sind eine Setzung dieser App und bewusst grob – eine feinere Skala täuschte eine Genauigkeit vor, die die Frage „ist da noch alte Beleuchtung?" nicht hergibt.',
    ),
  },
  // `lighting` bekommt bewusst keine Tabelle: Der Check bewertet, wie viele
  // Räume noch kein LED-Licht haben – dafür gibt es keine Messgröße mit
  // Schwellen, nur einen Befund.
}
