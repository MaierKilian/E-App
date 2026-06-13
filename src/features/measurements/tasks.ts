import type { TFunction } from 'i18next'
import type { RoomEntry } from '@/types'
import { MEASUREMENT_CATALOG, type MeasurementMeta } from './catalog'
import { roomInstances, roomLabel, instanceKey } from './rooms'

/** Eine konkrete Mess-Aufgabe: Messung + optional Raum. */
export interface MeasurementTask {
  meta: MeasurementMeta
  /** Raum-Schlüssel bei Pro-Raum-Messungen (sonst undefined). */
  roomKey?: string
  /** Anzeigename des Raums (nur bei Pro-Raum-Aufgaben). */
  roomName?: string
  /** Ergebnis-Schlüssel im Store ("id" oder "id@room"). */
  key: string
}

/**
 * Baut die Aufgabenliste in Katalog-Reihenfolge. Pro-Raum-Messungen werden je
 * Raum expandiert (für die geführte „Raum für Raum"-Reihenfolge).
 */
export function buildTasks(rooms: RoomEntry[], t: TFunction): MeasurementTask[] {
  const instances = roomInstances(rooms)
  const tasks: MeasurementTask[] = []
  for (const meta of MEASUREMENT_CATALOG) {
    if (meta.perRoom) {
      for (const inst of instances) {
        tasks.push({
          meta,
          roomKey: inst.key,
          roomName: roomLabel(t, inst),
          key: instanceKey(meta.id, inst.key),
        })
      }
    } else {
      tasks.push({ meta, key: instanceKey(meta.id) })
    }
  }
  return tasks
}

/** Pfad zum Runner für eine Aufgabe (inkl. Raum, falls vorhanden). */
export function taskHref(task: MeasurementTask): string {
  return task.roomKey
    ? `/measurements/${task.meta.id}?room=${encodeURIComponent(task.roomKey)}`
    : `/measurements/${task.meta.id}`
}
