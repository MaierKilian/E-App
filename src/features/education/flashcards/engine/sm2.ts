// SM-2 – der Anki-Klassiker (Alternative zu FSRS).
//
// Modelliert das Gedächtnis mit einer einzigen Größe, dem Leichtigkeitsfaktor
// („ease", Startwert 2,5). Jedes erfolgreiche Intervall ist das vorherige mal
// diesem Faktor; die Bewertung verschiebt den Faktor nach oben oder unten.
//
// Weniger treffsicher als FSRS, aber sehr leicht zu erklären und über Jahrzehnte
// erprobt – deshalb als wählbare Alternative erhalten.

import type { Grade } from './types'
import type { SchedulerParams } from './params'
import { clamp, type MemoryModel } from './core'

/** Untergrenze des Leichtigkeitsfaktors – SM-2 lässt Karten nie darunter. */
const MIN_EASE = 1.3

/** Die klassischen Anfangsintervalle nach dem Graduieren. */
const FIRST_INTERVAL_DAYS = 1
const SECOND_INTERVAL_DAYS = 6

/**
 * Übersetzt die kanonische Note in SM-2s Antwortqualität q (0–5).
 * again → 2 (nicht erinnert), hard → 3, good → 4, easy → 5.
 */
function qualityOf(grade: Grade): number {
  return grade + 1
}

/** SM-2s Formel für den neuen Leichtigkeitsfaktor. */
function nextEase(ease: number, grade: Grade): number {
  const q = qualityOf(grade)
  const next = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  return clamp(next, MIN_EASE, 4)
}

function easeOf(ease: number | null, p: SchedulerParams): number {
  return clamp(ease ?? p.startingEase, MIN_EASE, 4)
}

export const sm2Model: MemoryModel = {
  id: 'sm2',

  init(grade, p) {
    return {
      ease: nextEase(p.startingEase, grade),
      stability: null,
      difficulty: null,
      box: null,
    }
  },

  update(state, grade, _elapsedDays, p) {
    return {
      ease: nextEase(easeOf(state.ease, p), grade),
      stability: null,
      difficulty: null,
      box: null,
    }
  },

  interval(memory, prev, grade, p) {
    const ease = easeOf(memory.ease, p)
    const previous = prev.intervalDays

    // Staffelung wie im Original: 1 Tag → 6 Tage → jeweils mal Leichtigkeit.
    // Das bisherige Intervall dient als Zustand, ein eigener Zähler ist unnötig.
    let next: number
    if (previous < FIRST_INTERVAL_DAYS) next = FIRST_INTERVAL_DAYS
    else if (previous < SECOND_INTERVAL_DAYS) next = SECOND_INTERVAL_DAYS
    // „Fast" wächst bewusst nur leicht statt mit der Leichtigkeit – sonst könnte
    // eine schlechtere Bewertung ein längeres Intervall ergeben als „Gewusst".
    else if (grade === 2) next = previous * p.hardFactor
    else next = previous * ease

    // Zuschlag für „Zu einfach" (bei FSRS steckt er im Modellgewicht w16,
    // deshalb gilt er nur hier).
    if (grade === 4) next *= p.easyBonus
    return next
  },
}
