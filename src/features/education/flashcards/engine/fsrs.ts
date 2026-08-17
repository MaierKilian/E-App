// FSRS – Free Spaced Repetition Scheduler (Standardverfahren).
//
// Modelliert das Gedächtnis mit drei Größen:
//   Stabilität S    – Tage, nach denen die Erinnerungswahrscheinlichkeit auf 90 %
//                     gefallen ist
//   Schwierigkeit D – 1–10, wie zäh die Karte für diesen Nutzer ist
//   Abrufbarkeit R  – Wahrscheinlichkeit, die Karte JETZT noch zu wissen
//
// Der entscheidende Vorteil gegenüber SM-2 für die Klausurvorbereitung: Das
// Intervall wird aus einer frei wählbaren ZIEL-BEHALTENSQUOTE berechnet
// (`requestRetention`). „Im Semester 0,85, zwei Wochen vor der Klausur 0,95" ist
// damit ein Regler statt einer Bastelei.
//
// Umgesetzt ist der FSRS-4.5-Kern mit den Standardgewichten aus `params.ts`.
// Bewusst NICHT umgesetzt: das Nachtrainieren der Gewichte auf den eigenen
// Bewertungen. Das Ereignis-Log enthält alles Nötige, um das später
// nachzurüsten, ohne die Engine zu ändern.

import type { CardState, Grade } from './types'
import { clamp, DAY_MS, type MemoryModel } from './core'

/** Abfall-Exponent der Vergessenskurve. */
const DECAY = -0.5
/** Aus DECAY abgeleitet, sodass R(S) = 0,9 gilt: 0,9^(1/DECAY) − 1 = 19/81. */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1

const MIN_STABILITY = 0.1
const MAX_STABILITY = 36_500

/**
 * Erinnerungswahrscheinlichkeit nach `t` Tagen bei Stabilität `s`.
 * Es gilt per Konstruktion: R(s, s) = 0,9.
 */
export function retrievability(t: number, s: number): number {
  if (s <= 0) return 0
  return Math.pow(1 + (FACTOR * t) / s, DECAY)
}

/** Intervall in Tagen, nach dem die Erinnerung auf `retention` gefallen ist. */
export function intervalForRetention(s: number, retention: number): number {
  const r = clamp(retention, 0.5, 0.999)
  return (s / FACTOR) * (Math.pow(r, 1 / DECAY) - 1)
}

/** Anfangsstabilität je Note (w0–w3). */
function initialStability(grade: Grade, w: number[]): number {
  return clamp(w[grade - 1], MIN_STABILITY, MAX_STABILITY)
}

/** Anfangsschwierigkeit je Note (w4, w5). */
function initialDifficulty(grade: Grade, w: number[]): number {
  return clamp(w[4] - (grade - 3) * w[5], 1, 10)
}

/** Schwierigkeit fortschreiben, mit leichter Rückkehr zum Mittel (w6, w7). */
function nextDifficulty(d: number, grade: Grade, w: number[]): number {
  const shifted = d - w[6] * (grade - 3)
  // Rückkehr zum Mittel verhindert, dass Karten dauerhaft am Rand kleben.
  const reverted = w[7] * initialDifficulty(4, w) + (1 - w[7]) * shifted
  return clamp(reverted, 1, 10)
}

/** Stabilität nach einer erinnerten Karte (w8–w10, w15, w16). */
function stabilityAfterSuccess(
  s: number,
  d: number,
  r: number,
  grade: Grade,
  w: number[],
): number {
  const hardPenalty = grade === 2 ? w[15] : 1
  const easyBonus = grade === 4 ? w[16] : 1
  const inc =
    1 +
    Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[9]) *
      (Math.exp(w[10] * (1 - r)) - 1) *
      hardPenalty *
      easyBonus
  return clamp(s * Math.max(1, inc), MIN_STABILITY, MAX_STABILITY)
}

/** Stabilität nach einem Rückfall (w11–w14). */
function stabilityAfterLapse(s: number, d: number, r: number, w: number[]): number {
  const next =
    w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r))
  // Sicherheitsklammer: Ein Rückfall darf die Stabilität nie erhöhen.
  return clamp(Math.min(next, s), MIN_STABILITY, MAX_STABILITY)
}

/**
 * Gedächtniszustand aus dem bisherigen Intervall schätzen. Nötig, wenn eine
 * Karte aus einem anderen Verfahren kommt (Nutzer wechselt den Algorithmus):
 * Ein Intervall von 30 Tagen entspricht näherungsweise S = 30.
 */
function seedFromState(state: CardState, w: number[]): { s: number; d: number } {
  return {
    s: clamp(state.stability ?? Math.max(state.intervalDays, MIN_STABILITY), MIN_STABILITY, MAX_STABILITY),
    d: clamp(state.difficulty ?? initialDifficulty(3, w), 1, 10),
  }
}

export const fsrsModel: MemoryModel = {
  id: 'fsrs',

  init(grade, p) {
    const w = p.fsrsWeights
    return {
      ease: null,
      stability: initialStability(grade, w),
      difficulty: initialDifficulty(grade, w),
      box: null,
    }
  },

  update(state, grade, elapsedDays, p) {
    const w = p.fsrsWeights
    const { s, d } = seedFromState(state, w)
    const r = retrievability(elapsedDays, s)
    return {
      ease: null,
      stability:
        grade === 1 ? stabilityAfterLapse(s, d, r, w) : stabilityAfterSuccess(s, d, r, grade, w),
      difficulty: nextDifficulty(d, grade, w),
      box: null,
    }
  },

  interval(memory, _prev, _grade, p) {
    const s = memory.stability ?? MIN_STABILITY
    return intervalForRetention(s, p.requestRetention)
  },
}

/**
 * Aktuelle Erinnerungswahrscheinlichkeit einer Karte – die Antwort auf „wie gut
 * sitzt diese Karte gerade?". Grundlage des Bereitschafts-Scores (Phase 6) und
 * der Erklärung „warum sehe ich diese Karte?" (Phase 1).
 */
export function currentRetrievability(state: CardState, now: number): number | null {
  if (state.stability == null || state.lastReviewed == null) return null
  const t = Math.max(0, (now - state.lastReviewed) / DAY_MS)
  return retrievability(t, state.stability)
}
