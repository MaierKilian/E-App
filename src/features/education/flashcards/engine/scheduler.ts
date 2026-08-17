// Öffentliche Schnittstelle der Wiederholungs-Algorithmen (Phase 0).
//
// Alles außerhalb der Engine – Session, Statistik, Einstellungen – arbeitet nur
// gegen diese Schnittstelle und kennt weder FSRS noch SM-2 noch Leitner. Ein
// neues Verfahren zu ergänzen heißt: ein `MemoryModel` schreiben und hier
// eintragen.

import type { CardState, Grade, SchedulerId } from './types'
import type { SchedulerParams } from './params'
import { elapsedDaysSince, previewIntervals, scheduleNext, type MemoryModel } from './core'
import { fsrsModel } from './fsrs'
import { sm2Model } from './sm2'
import { leitnerModel } from './leitner'

/** Ein Wiederholungs-Verfahren, wie es die App verwendet. */
export interface Scheduler {
  id: SchedulerId
  /** Neuer Kartenzustand nach einer Bewertung. */
  next(state: CardState, grade: Grade, now: number, p: SchedulerParams): CardState
  /** Voraussichtliche Intervalle in Tagen je Note (für die Knopf-Beschriftung). */
  preview(state: CardState, now: number, p: SchedulerParams): Record<Grade, number>
}

const MODELS: Record<SchedulerId, MemoryModel> = {
  fsrs: fsrsModel,
  sm2: sm2Model,
  leitner: leitnerModel,
}

/** Verfügbare Verfahren – Reihenfolge wie in der Oberfläche. */
export const SCHEDULER_IDS: SchedulerId[] = ['fsrs', 'sm2', 'leitner']

function wrap(model: MemoryModel): Scheduler {
  return {
    id: model.id,
    next(state, grade, now, p) {
      return scheduleNext(model, state, grade, now, elapsedDaysSince(state, now), p)
    },
    preview(state, now, p) {
      return previewIntervals(model, state, now, p)
    },
  }
}

const SCHEDULERS: Record<SchedulerId, Scheduler> = {
  fsrs: wrap(fsrsModel),
  sm2: wrap(sm2Model),
  leitner: wrap(leitnerModel),
}

/** Verfahren nach ID. Unbekannte IDs fallen auf FSRS zurück. */
export function getScheduler(id: SchedulerId): Scheduler {
  return SCHEDULERS[id] ?? SCHEDULERS.fsrs
}

/** Das laut Einstellungen aktive Verfahren. */
export function schedulerFor(p: SchedulerParams): Scheduler {
  return getScheduler(p.algorithm)
}

/**
 * Wendet eine Bewertung mit ausdrücklich vorgegebener verstrichener Zeit an.
 * Wird von der Neuberechnung aus dem Log gebraucht (`derive.ts`), wo „jetzt"
 * nicht die aktuelle Uhrzeit, sondern der historische Zeitpunkt ist.
 */
export function applyGrade(
  p: SchedulerParams,
  state: CardState,
  grade: Grade,
  at: number,
  elapsedDays: number,
  algorithm: SchedulerId = p.algorithm,
): CardState {
  return scheduleNext(MODELS[algorithm] ?? MODELS.fsrs, state, grade, at, elapsedDays, p)
}
