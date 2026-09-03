import { COMFORT_BANDS, DEFAULT_COMFORT_BAND } from './room_temperature/roomClimate'
import { instanceKey } from './rooms'
import type { MeasurementResult } from './types'
import type { ApplianceEntry, RoomType } from '@/types'

/**
 * Die Umgebungstemperatur eines Kühl- oder Gefriergeräts.
 *
 * **Die erste Verbindung zwischen zwei Checks in dieser App.** Steht das Gerät
 * in einem Raum, den der Raumklima-Check bereits gemessen hat, benutzt der
 * Geräte-Check die gemessene Temperatur statt einer Annahme – und sagt im
 * Ergebnis, dass er das tut. Ein Kühlschrank im 22 °C warmen Wohnzimmer
 * arbeitet gegen ein anderes Gefälle als einer im 16 °C kühlen Keller.
 *
 * **Ohne Messung bleibt es beim Richtwert.** Kein Check macht einen anderen zur
 * Voraussetzung; ohne Raumklima-Ergebnis gilt die Mitte des Komfortbands
 * dieses Raumtyps, und ohne Raumangabe der Wohnraum-Wert.
 */

export interface Ambient {
  celsius: number
  /** true = aus dem Raumklima-Check dieses Raums, nicht aus dem Komfortband. */
  measured: boolean
  /** Raum, auf den sich die Angabe bezieht – fehlt bei Geräten ohne Raum. */
  room?: RoomType
}

/**
 * Untergrenze, ab der ein Haushaltsgerät zuverlässig kühlt.
 *
 * **Erfahrungswert der E-App**, angelehnt an die verbreitete Klimaklasse SN
 * (ausgelegt ab etwa +10 °C). Darunter schaltet der Thermostat älterer Geräte
 * unter Umständen nicht mehr richtig – die Gefriertruhe im unbeheizten Keller
 * taut dann im Winter an, obwohl es draußen kalt ist. Nicht aus einer Norm
 * übernommen: Der Wert steht hier als Hinweisschwelle, nicht als Prüfkriterium.
 */
export const AMBIENT_COLD_MIN_C = 10

/**
 * Ab hier arbeitet das Gerät gegen ein spürbar größeres Temperaturgefälle.
 *
 * **Erfahrungswert der E-App.** Bewusst keine Prozentzahl daneben: Wie viel
 * Mehrverbrauch daraus folgt, hängt an Dämmung, Alter und Dichtung des Geräts –
 * Größen, die dieser Check nicht kennt. Er sagt deshalb, *dass* der Standort
 * zählt, und behauptet nicht, *wie viel*.
 */
export const AMBIENT_WARM_MIN_C = 20

/** Wie sich der Standort auf das Gerät auswirkt. */
export type AmbientNote = 'cold' | 'moderate' | 'warm'

export function ambientNote(celsius: number): AmbientNote {
  if (celsius < AMBIENT_COLD_MIN_C) return 'cold'
  if (celsius >= AMBIENT_WARM_MIN_C) return 'warm'
  return 'moderate'
}

/** Mitte des Komfortbands – der Richtwert, solange nichts gemessen wurde. */
function bandMiddle(room: RoomType | undefined): number {
  const band = (room && COMFORT_BANDS[room]) || DEFAULT_COMFORT_BAND
  return (band.min + band.max) / 2
}

/**
 * Gemessene Raumtemperatur eines Raumtyps, falls der Raumklima-Check dort
 * gelaufen ist.
 *
 * Der Raumklima-Check läuft je Rauminstanz (`room_temperature@basement#0`).
 * Ein Gerät kennt nur den Raum**typ**, nicht die Instanz – bei mehreren
 * gleichartigen Räumen zählt deshalb die jüngste Messung unter ihnen. Genauer
 * ginge es nur, wenn das Gerät die Instanz trüge; das erfragt der Fragebogen
 * nicht, und dafür eine Frage mehr zu stellen wäre der schlechtere Tausch.
 */
function measuredRoomTemp(
  results: Partial<Record<string, MeasurementResult>>,
  room: RoomType,
): MeasurementResult | undefined {
  const prefix = `${instanceKey('room_temperature', room)}#`
  let newest: MeasurementResult | undefined
  for (const [key, value] of Object.entries(results)) {
    if (!key.startsWith(prefix) || !value || !Number.isFinite(value.primaryValue)) continue
    if (!newest || value.completedAt > newest.completedAt) newest = value
  }
  return newest
}

export function ambientFor(
  results: Partial<Record<string, MeasurementResult>>,
  appliance: Pick<ApplianceEntry, 'room'> | undefined,
): Ambient {
  const room = appliance?.room
  if (room) {
    const measurement = measuredRoomTemp(results, room)
    if (measurement) {
      return { celsius: measurement.primaryValue, measured: true, room }
    }
  }
  return { celsius: bandMiddle(room), measured: false, room }
}
