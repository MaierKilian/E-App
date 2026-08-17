// Leitner-Boxen – der „einfache Modus".
//
// Fünf Boxen mit festen Intervallen (Standard 1 · 3 · 7 · 21 · 60 Tage). Gewusst
// heißt eine Box weiter, nicht gewusst heißt zurück in die erste Box. Kein
// Modell, keine Gewichte, keine Überraschungen – dafür sofort verständlich und
// ohne Einarbeitung nutzbar.
//
// Hinweis: Mit gesetzten Lernschritten (`learningStepsMinutes`) laufen neue
// Karten zuerst durch den Minutenbereich, ehe die Boxen greifen. Wer das
// klassische Verhalten will, leert die Lernschritte in den Einstellungen.

import type { Grade } from './types'
import type { SchedulerParams } from './params'
import { clamp, type MemoryModel } from './core'

/** Box-Wechsel je Bewertung: zurück auf Anfang, bleiben, eine oder zwei weiter. */
function boxDelta(grade: Grade): number {
  if (grade === 2) return 0
  if (grade === 3) return 1
  return 2 // 4 = zu einfach, zwei Boxen weiter
}

function lastIndex(p: SchedulerParams): number {
  return Math.max(0, p.leitnerBoxDays.length - 1)
}

/**
 * Box aus dem bisherigen Intervall schätzen – nötig, wenn die Karte aus einem
 * anderen Verfahren kommt (Nutzer wechselt den Algorithmus).
 */
function boxFromInterval(intervalDays: number, p: SchedulerParams): number {
  let box = 0
  p.leitnerBoxDays.forEach((days, i) => {
    if (intervalDays >= days) box = i
  })
  return box
}

export const leitnerModel: MemoryModel = {
  id: 'leitner',

  init(grade, p) {
    return {
      ease: null,
      stability: null,
      difficulty: null,
      box: grade === 1 ? 0 : clamp(boxDelta(grade), 0, lastIndex(p)),
    }
  },

  update(state, grade, _elapsedDays, p) {
    const current = state.box ?? boxFromInterval(state.intervalDays, p)
    return {
      ease: null,
      stability: null,
      difficulty: null,
      box: grade === 1 ? 0 : clamp(current + boxDelta(grade), 0, lastIndex(p)),
    }
  },

  interval(memory, _prev, _grade, p) {
    const box = clamp(memory.box ?? 0, 0, lastIndex(p))
    return p.leitnerBoxDays[box]
  },
}
