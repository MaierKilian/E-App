// Gemeinsamer Kern aller Wiederholungs-Verfahren (Phase 0).
//
// Aufteilung: Was sich zwischen den Verfahren UNTERSCHEIDET, ist allein das
// Gedächtnismodell (`MemoryModel`) – wie sich der innere Zustand einer Karte
// nach einer Bewertung ändert und welches Langzeit-Intervall daraus folgt.
// Alles, was für alle Verfahren GLEICH gilt – Lernschritte, Rückfälle, Status,
// Zähler, Fälligkeit, Ober-/Untergrenzen – liegt hier und wird einmal getestet.

import type { CardState, Grade, SchedulerId } from './types'
import { MATURE_THRESHOLD_DAYS } from './types'
import type { SchedulerParams } from './params'

export const MINUTE_MS = 60_000
export const DAY_MS = 86_400_000
/** Ein Tag in Minuten – Umrechnung der Lernschritte. */
const MINUTES_PER_DAY = 1440

/** Innerer Gedächtniszustand einer Karte, je Verfahren unterschiedlich belegt. */
export interface MemoryFields {
  ease: number | null
  stability: number | null
  difficulty: number | null
  box: number | null
}

/** Ein Verfahren beschreibt nur sein Gedächtnismodell – der Rest ist gemeinsam. */
export interface MemoryModel {
  id: SchedulerId
  /** Gedächtniszustand nach der allerersten Bewertung einer Karte. */
  init(grade: Grade, p: SchedulerParams): MemoryFields
  /** Gedächtniszustand nach einer weiteren Bewertung. */
  update(state: CardState, grade: Grade, elapsedDays: number, p: SchedulerParams): MemoryFields
  /**
   * Langzeit-Intervall in Tagen (vor `intervalModifier` und Obergrenze – die
   * wendet der Kern zentral an, damit sie für alle Verfahren gelten).
   */
  interval(memory: MemoryFields, prev: CardState, grade: Grade, p: SchedulerParams): number
}

/** Phase, in der sich eine Karte vor der Bewertung befindet. */
type Phase = 'learning' | 'relearning' | 'graduated'

function phaseOf(state: CardState): Phase {
  if (state.status === 'relearning') return 'relearning'
  if (state.status === 'new' || state.status === 'learning') return 'learning'
  // young/mature/suspended: die Karte hat den Tagesrhythmus erreicht.
  return 'graduated'
}

/**
 * Wendet eine Bewertung auf eine Karte an und liefert den neuen Zustand.
 *
 * Ablauf:
 *  1. Gedächtniszustand über das Modell fortschreiben (immer – auch bei
 *     Rückfällen, damit die Historie der Karte nicht verloren geht).
 *  2. Zeitpunkt bestimmen: entweder ein Lernschritt (Minutenbereich) oder das
 *     Langzeit-Intervall des Modells.
 *  3. Zähler, Status und Fälligkeit setzen.
 *
 * Lernschritte („Nochmal"/„Fast"/„Gewusst"/„Zu einfach"):
 *  - 1 → zurück auf den ersten Schritt
 *  - 2 → derselbe Schritt noch einmal
 *  - 3 → ein Schritt weiter (nach dem letzten Schritt: graduiert)
 *  - 4 → graduiert sofort
 * Ein leeres Schritt-Array lässt Karten unmittelbar in den Tagesrhythmus
 * graduieren (so verhält sich z. B. der Leitner-Modus klassisch).
 */
export function scheduleNext(
  model: MemoryModel,
  state: CardState,
  grade: Grade,
  now: number,
  elapsedDays: number,
  p: SchedulerParams,
): CardState {
  const phase = phaseOf(state)
  const memory = state.reps === 0 ? model.init(grade, p) : model.update(state, grade, elapsedDays, p)

  // Rückfall: eine bereits graduierte Karte wurde nicht gewusst.
  const lapsed = phase === 'graduated' && grade === 1
  const nextPhase: Phase = lapsed ? 'relearning' : phase

  const steps =
    nextPhase === 'relearning' ? p.relearningStepsMinutes : p.learningStepsMinutes

  let intervalDays: number
  let step: number
  let graduated: boolean

  if (nextPhase === 'graduated') {
    // Bereits im Tagesrhythmus und gewusst → nächstes Langzeit-Intervall.
    intervalDays = longTermInterval(model, memory, state, grade, p)
    step = 0
    graduated = true
  } else {
    // Lernschritte. Bei einem frischen Rückfall beginnt die Karte bei Schritt 0.
    const currentStep = lapsed ? 0 : state.step
    const target = nextStepIndex(currentStep, grade)
    if (steps.length === 0 || target >= steps.length) {
      intervalDays = longTermInterval(model, memory, state, grade, p)
      step = 0
      graduated = true
    } else {
      intervalDays = steps[target] / MINUTES_PER_DAY
      step = target
      graduated = false
    }
  }

  const reps = state.reps + 1
  const lapses = state.lapses + (lapsed ? 1 : 0)
  const streak = grade >= 2 ? state.streak + 1 : 0

  return {
    ...state,
    ...memory,
    status: graduated
      ? intervalDays >= MATURE_THRESHOLD_DAYS
        ? 'mature'
        : 'young'
      : nextPhase === 'relearning'
        ? 'relearning'
        : 'learning',
    due: now + intervalDays * DAY_MS,
    intervalDays,
    step,
    reps,
    lapses,
    streak,
    lastReviewed: now,
    leech: lapses >= p.leechThreshold,
  }
}

/**
 * Voraussichtliche Intervalle für alle vier Noten – Grundlage der Anzeige
 * „Gewusst → in 5 Tagen" direkt auf den Bewertungsknöpfen (Phase 4).
 */
export function previewIntervals(
  model: MemoryModel,
  state: CardState,
  now: number,
  p: SchedulerParams,
): Record<Grade, number> {
  const elapsedDays = elapsedDaysSince(state, now)
  const out = {} as Record<Grade, number>
  for (const grade of [1, 2, 3, 4] as Grade[]) {
    out[grade] = scheduleNext(model, state, grade, now, elapsedDays, p).intervalDays
  }
  return out
}

/** Tatsächlich verstrichene Tage seit der letzten Bewertung (0, wenn neu). */
export function elapsedDaysSince(state: CardState, now: number): number {
  if (!state.lastReviewed) return 0
  return Math.max(0, (now - state.lastReviewed) / DAY_MS)
}

/**
 * Langzeit-Intervall inklusive der zentral geltenden Grenzen: globaler
 * Intervall-Faktor, mindestens ein Tag, höchstens `maxIntervalDays`.
 */
function longTermInterval(
  model: MemoryModel,
  memory: MemoryFields,
  prev: CardState,
  grade: Grade,
  p: SchedulerParams,
): number {
  const raw = model.interval(memory, prev, grade, p) * p.intervalModifier
  if (!Number.isFinite(raw)) return 1
  return Math.min(p.maxIntervalDays, Math.max(1, Math.round(raw)))
}

/** Zielschritt gemäß der Bewertung (siehe Beschreibung an `scheduleNext`). */
function nextStepIndex(currentStep: number, grade: Grade): number {
  if (grade === 1) return 0
  if (grade === 2) return currentStep
  if (grade === 3) return currentStep + 1
  return Number.MAX_SAFE_INTEGER // 4 = sofort graduieren
}

/** Hilfsfunktion für die Modelle: Wert in einen Bereich zwingen. */
export function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}
