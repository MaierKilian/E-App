import type { RoomEntry } from '@/types'
import type { MeasurementResult } from './types'
import { MEASUREMENT_CATALOG, type MeasurementMeta } from './catalog'
import { roomInstances, instanceKey, anyResultFor, type RoomInstance } from './rooms'

export type Results = Partial<Record<string, MeasurementResult>>

/**
 * Die eine Stelle, an der „wie viele Checks sind erledigt?" beantwortet wird.
 *
 * Vorher zählte jede Ansicht selbst – und jede anders: Der Ring im Messungen-Kopf
 * verlangte bei Pro-Raum-Checks alle Räume, die Zuhause-Karte ließ einen Raum
 * genügen, und die Gewerke-/Raum-Kacheln schlugen stumpf `results[id]` nach.
 * Letzteres findet Ergebnisse mit Raum- oder Entnahmestellen-Schlüssel
 * (`room_temperature@bedroom#0`, `hot_water_wait@shower`) nie – daher stand über
 * fertig gemessenen Gewerken „0/2", während der Ring daneben „9/9" zeigte.
 *
 * Alle Fortschrittszahlen der App laufen deshalb über die Funktionen hier.
 */

/**
 * Raum-Instanzen, die für den Fortschritt zählen.
 *
 * Als „nichts zu messen" markierte Räume (Raum-Ansicht) fallen heraus – sonst
 * bliebe der Ring dauerhaft unter 100 %, obwohl der Nutzer den Raum bewusst
 * ausgenommen hat. Dieselbe Liste trägt inzwischen auch übersprungene Checks;
 * Raum-Schlüssel (`bedroom#0`) und Mess-Schlüssel (`freezer`) sind nie gleich.
 */
export function countingRooms(
  rooms: RoomEntry[],
  skipped: readonly string[] = [],
): RoomInstance[] {
  if (skipped.length === 0) return roomInstances(rooms)
  const set = new Set(skipped)
  return roomInstances(rooms).filter((inst) => !set.has(inst.key))
}

/**
 * Fortschritt einer einzelnen Messung als Ganzes.
 *
 * Pro-Raum-Checks zählen ihre Räume; alle anderen sind mit dem ersten Ergebnis
 * erledigt – auch wenn dieses unter einem eigenen Schlüssel liegt (Warmwasser-
 * Wartezeit speichert die Entnahmestelle als `roomKey`).
 */
export function measurementProgress(
  results: Results,
  meta: MeasurementMeta,
  instances: RoomInstance[],
): { done: number; total: number } {
  if (meta.perRoom) {
    const done = instances.filter((inst) => results[instanceKey(meta.id, inst.key)]).length
    return { done, total: instances.length }
  }
  return { done: anyResultFor(results, meta.id) ? 1 : 0, total: 1 }
}

/** Erledigt = alle zählenden Räume gemessen (bzw. ein Ergebnis vorhanden). */
export function isMeasurementDone(
  results: Results,
  meta: MeasurementMeta,
  instances: RoomInstance[],
): boolean {
  const { done, total } = measurementProgress(results, meta, instances)
  return total > 0 && done === total
}

/**
 * Messungen, die überhaupt in eine Fortschrittszahl gehören: verfügbar, nicht
 * übersprungen, und – bei Pro-Raum-Checks – nur solange es zählende Räume gibt.
 * Ohne Räume wäre der Nenner sonst unerreichbar.
 *
 * Ein übersprungener Check fällt aus Zähler **und** Nenner. „Wir haben kein
 * Gefriergerät" hieße sonst 8 von 9 für immer – eine Zahl, die dem Nutzer einen
 * Rückstand vorwirft, den es nicht gibt.
 */
export function countableMeasurements(
  instances: RoomInstance[],
  skipped: readonly string[] = [],
): MeasurementMeta[] {
  const set = new Set(skipped)
  return MEASUREMENT_CATALOG.filter(
    (m) => m.available && !set.has(m.id) && (!m.perRoom || instances.length > 0),
  )
}

/**
 * Katalog-Fortschritt – die Zahl hinter dem Ring im Messungen-Kopf **und** auf
 * der Zuhause-Karte. Beide Ringe zeigen damit zwangsläufig dasselbe.
 */
export function catalogProgress(
  results: Results,
  rooms: RoomEntry[],
  skipped: readonly string[] = [],
): { done: number; total: number } {
  const instances = countingRooms(rooms, skipped)
  const countable = countableMeasurements(instances, skipped)
  return {
    done: countable.filter((meta) => isMeasurementDone(results, meta, instances)).length,
    total: countable.length,
  }
}
