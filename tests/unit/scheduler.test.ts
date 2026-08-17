// Verhalten, das für ALLE Wiederholungs-Verfahren gelten muss.
//
// Diese Zusagen sind wichtiger als konkrete Zahlen: Wenn eine bessere Bewertung
// je ein kürzeres Intervall ergäbe oder ein Rückfall die Karte nicht zeitnah
// zurückbrächte, wäre der Trainer kaputt – und zwar unsichtbar, weil sich der
// Schaden erst nach Wochen zeigt.

import { describe, expect, it } from 'vitest'
import {
  ALL_GRADES,
  MATURE_THRESHOLD_DAYS,
  newCardState,
  type CardState,
  type Grade,
} from '@/features/education/flashcards/engine/types'
import { DEFAULT_PARAMS, normalizeParams } from '@/features/education/flashcards/engine/params'
import {
  SCHEDULER_IDS,
  getScheduler,
} from '@/features/education/flashcards/engine/scheduler'

const NOW = new Date(2026, 1, 15, 10, 0, 0).getTime()
const DAY = 86_400_000

/** Karte, die den Tagesrhythmus erreicht hat (Intervall 10 Tage). */
function graduated(algorithm: 'fsrs' | 'sm2' | 'leitner'): CardState {
  const p = normalizeParams({ algorithm })
  const scheduler = getScheduler(algorithm)
  // Über echte Bewertungen aufbauen statt Felder zu erfinden – so entsteht ein
  // Zustand, den das jeweilige Modell auch selbst erzeugen würde.
  let state = newCardState('c1')
  let now = NOW - 40 * DAY
  for (let i = 0; i < 4; i++) {
    state = scheduler.next(state, 3, now, p)
    now += Math.max(1, state.intervalDays) * DAY
  }
  return state
}

describe.each(SCHEDULER_IDS)('Verfahren %s', (algorithm) => {
  const p = normalizeParams({ algorithm })
  const scheduler = getScheduler(algorithm)

  it('bringt eine neue Karte in den Minutenbereich, statt sie sofort einzuplanen', () => {
    const next = scheduler.next(newCardState('c1'), 3, NOW, p)
    expect(next.status).toBe('learning')
    expect(next.intervalDays).toBeLessThan(1)
    expect(next.due).toBeGreaterThan(NOW)
  })

  it('graduiert eine neue Karte nach zwei „Gewusst"', () => {
    let state = scheduler.next(newCardState('c1'), 3, NOW, p)
    state = scheduler.next(state, 3, NOW + 10 * 60_000, p)
    expect(state.status).toBe('young')
    expect(state.intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('vergibt bei besserer Bewertung nie ein kürzeres Intervall', () => {
    const state = graduated(algorithm)
    const intervals = scheduler.preview(state, NOW, p)
    for (const grade of [2, 3, 4] as Grade[]) {
      expect(intervals[grade]).toBeGreaterThanOrEqual(intervals[(grade - 1) as Grade])
    }
  })

  it('holt eine vergessene Karte binnen eines Tages zurück und zählt den Rückfall', () => {
    const state = graduated(algorithm)
    const next = scheduler.next(state, 1, NOW, p)
    expect(next.status).toBe('relearning')
    expect(next.intervalDays).toBeLessThan(1)
    expect(next.lapses).toBe(state.lapses + 1)
    expect(next.streak).toBe(0)
  })

  it('zählt einen Rückfall im Minutenbereich nicht als Rückfall', () => {
    const learning = scheduler.next(newCardState('c1'), 3, NOW, p)
    const next = scheduler.next(learning, 1, NOW + 60_000, p)
    expect(next.lapses).toBe(0)
    expect(next.status).toBe('learning')
  })

  it('führt eine Karte nach dem Rückfall wieder in den Tagesrhythmus', () => {
    let state = scheduler.next(graduated(algorithm), 1, NOW, p)
    state = scheduler.next(state, 3, NOW + 10 * 60_000, p)
    expect(state.status).toMatch(/young|mature/)
    expect(state.intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('hält die Obergrenze für Intervalle ein', () => {
    const limited = normalizeParams({ algorithm, maxIntervalDays: 30 })
    let state = newCardState('c1')
    let now = NOW
    for (let i = 0; i < 25; i++) {
      state = getScheduler(algorithm).next(state, 4, now, limited)
      now += Math.max(1, state.intervalDays) * DAY
      expect(state.intervalDays).toBeLessThanOrEqual(30)
    }
  })

  it('streckt oder staucht alle Intervalle über den Intervall-Faktor', () => {
    const state = graduated(algorithm)
    const dense = getScheduler(algorithm).next(state, 3, NOW, normalizeParams({ algorithm, intervalModifier: 0.6 }))
    const loose = getScheduler(algorithm).next(state, 3, NOW, normalizeParams({ algorithm, intervalModifier: 1.6 }))
    expect(dense.intervalDays).toBeLessThan(loose.intervalDays)
  })

  it('lässt Karten ohne Lernschritte sofort in den Tagesrhythmus', () => {
    const direct = normalizeParams({ algorithm, learningStepsMinutes: [] })
    const next = getScheduler(algorithm).next(newCardState('c1'), 3, NOW, direct)
    expect(next.status).toMatch(/young|mature/)
    expect(next.intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('markiert Problemkarten ab der eingestellten Anzahl Rückfälle', () => {
    const p2 = normalizeParams({ algorithm, leechThreshold: 2 })
    const s = getScheduler(algorithm)
    let state = graduated(algorithm)
    let now = NOW
    for (let i = 0; i < 2; i++) {
      state = s.next(state, 1, now, p2) // Rückfall
      now += 10 * 60_000
      state = s.next(state, 3, now, p2) // wieder graduiert
      now += Math.max(1, state.intervalDays) * DAY
    }
    expect(state.lapses).toBe(2)
    expect(state.leech).toBe(true)
  })

  it('setzt die Serie bei „Fast" fort und bei „Nochmal" zurück', () => {
    const s = getScheduler(algorithm)
    let state = s.next(newCardState('c1'), 3, NOW, p)
    state = s.next(state, 2, NOW + 60_000, p)
    expect(state.streak).toBe(2)
    state = s.next(state, 1, NOW + 120_000, p)
    expect(state.streak).toBe(0)
  })

  it('liefert für jede Note eine Vorschau', () => {
    const intervals = scheduler.preview(graduated(algorithm), NOW, p)
    for (const grade of ALL_GRADES) {
      expect(intervals[grade]).toBeGreaterThan(0)
      expect(Number.isFinite(intervals[grade])).toBe(true)
    }
  })
})

describe('Reifegrad', () => {
  it('gilt ab 21 Tagen als reif', () => {
    const p = normalizeParams({ algorithm: 'fsrs', learningStepsMinutes: [] })
    let state = newCardState('c1')
    let now = NOW
    // Mit „Zu einfach" wächst das Intervall schnell über die Reife-Schwelle.
    for (let i = 0; i < 6; i++) {
      state = getScheduler('fsrs').next(state, 4, now, p)
      now += state.intervalDays * DAY
    }
    expect(state.intervalDays).toBeGreaterThanOrEqual(MATURE_THRESHOLD_DAYS)
    expect(state.status).toBe('mature')
  })
})

describe('Standardeinstellungen', () => {
  it('nutzen FSRS und eine dreistufige Bewertung', () => {
    expect(DEFAULT_PARAMS.algorithm).toBe('fsrs')
    expect(DEFAULT_PARAMS.scale).toBe(3)
  })
})
