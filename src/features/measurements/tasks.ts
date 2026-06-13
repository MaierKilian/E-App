import type { TFunction } from 'i18next'
import type { RoomEntry } from '@/types'
import type { MeasurementResult } from './types'
import { MEASUREMENT_CATALOG, type MeasurementMeta } from './catalog'
import { roomInstances, roomLabel, instanceKey, anyResultFor } from './rooms'

/** Ein gruppierter Schritt (eine Messung; bei Pro-Raum mit Raum-Fortschritt). */
export interface MeasurementStep {
  meta: MeasurementMeta
  perRoom: boolean
  /** Anzahl Räume (bei Pro-Raum) bzw. 1. */
  roomsTotal: number
  /** Bereits gemessene Räume bzw. 0/1. */
  roomsDone: number
  /** Schritt vollständig erledigt. */
  done: boolean
  /** Nächster offener Raum (nur Pro-Raum). */
  nextRoomKey?: string
  nextRoomName?: string
}

/**
 * Baut die gruppierte Schrittliste: ein Schritt je verfügbarer Messung.
 * Pro-Raum-Messungen werden NICHT expandiert, sondern als ein Schritt mit
 * Raum-Fortschritt geführt (z. B. „Raumklima 2/4 Räume").
 */
export function buildSteps(
  rooms: RoomEntry[],
  results: Partial<Record<string, MeasurementResult>>,
  t: TFunction,
): MeasurementStep[] {
  const instances = roomInstances(rooms)
  const steps: MeasurementStep[] = []
  for (const meta of MEASUREMENT_CATALOG) {
    if (!meta.available) continue
    if (meta.perRoom) {
      if (instances.length === 0) continue // ohne Räume nicht messbar
      const open = instances.filter((inst) => !results[instanceKey(meta.id, inst.key)])
      const next = open[0]
      steps.push({
        meta,
        perRoom: true,
        roomsTotal: instances.length,
        roomsDone: instances.length - open.length,
        done: open.length === 0,
        nextRoomKey: next?.key,
        nextRoomName: next ? roomLabel(t, next) : undefined,
      })
    } else {
      // Erledigt, sobald ein Ergebnis vorliegt – auch bei mehreren Entnahme-
      // stellen (z. B. Warmwasser-Wartezeit, je Stelle ein Ergebnis).
      const done = Boolean(anyResultFor(results, meta.id))
      steps.push({ meta, perRoom: false, roomsTotal: 1, roomsDone: done ? 1 : 0, done })
    }
  }
  return steps
}

/** Pfad zum Starten/Fortsetzen eines Schritts (nächster offener Raum bzw. Messung). */
export function stepHref(step: MeasurementStep): string {
  if (step.perRoom && step.nextRoomKey) {
    return `/measurements/${step.meta.id}?room=${encodeURIComponent(step.nextRoomKey)}`
  }
  return `/measurements/${step.meta.id}`
}
