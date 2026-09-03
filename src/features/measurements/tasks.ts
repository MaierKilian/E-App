import type { TFunction } from 'i18next'
import type { ApplianceEntry, RoomEntry } from '@/types'
import type { MeasurementResult } from './types'
import { type MeasurementMeta } from './catalog'
import { roomLabel, instanceKey } from './rooms'
import { countableMeasurements, countingRooms, measurementProgress } from './progress'
import { orderedMeasurements } from './order'
import type { UserGoal } from '@/types'

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
 * Baut die gruppierte Schrittliste: ein Schritt je zählender Messung.
 * Pro-Raum-Messungen werden NICHT expandiert, sondern als ein Schritt mit
 * Raum-Fortschritt geführt (z. B. „Raumklima 2/4 Räume").
 *
 * Zählen und „erledigt?" kommen aus `progress.ts` – derselben Quelle, aus der
 * auch die Zuhause-Karte und die Gewerke-/Raum-Kacheln rechnen. Die Reihenfolge
 * kommt aus `order.ts` und gewichtet nach denselben Zielen wie die
 * Empfehlungen; ohne Ziele bleibt es bei der Katalog-Reihenfolge.
 */
export function buildSteps(
  rooms: RoomEntry[],
  results: Partial<Record<string, MeasurementResult>>,
  t: TFunction,
  skipped: readonly string[] = [],
  goals: readonly UserGoal[] = [],
  appliances: readonly ApplianceEntry[] = [],
): MeasurementStep[] {
  const instances = countingRooms(rooms, skipped)
  const steps: MeasurementStep[] = []
  for (const meta of orderedMeasurements(countableMeasurements(instances, skipped), goals)) {
    const { done, total } = measurementProgress(results, meta, instances, appliances)
    const next = meta.perRoom
      ? instances.find((inst) => !results[instanceKey(meta.id, inst.key)])
      : undefined
    steps.push({
      meta,
      perRoom: Boolean(meta.perRoom),
      roomsTotal: total,
      roomsDone: done,
      done: done === total,
      nextRoomKey: next?.key,
      nextRoomName: next ? roomLabel(t, next) : undefined,
    })
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
