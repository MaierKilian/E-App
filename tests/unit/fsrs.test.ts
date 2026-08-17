// FSRS-spezifische Zusagen: Vergessenskurve, Ziel-Behaltensquote, Gedächtnis.

import { describe, expect, it } from 'vitest'
import {
  currentRetrievability,
  intervalForRetention,
  retrievability,
} from '@/features/education/flashcards/engine/fsrs'
import { normalizeParams } from '@/features/education/flashcards/engine/params'
import { getScheduler } from '@/features/education/flashcards/engine/scheduler'
import { newCardState } from '@/features/education/flashcards/engine/types'

const NOW = new Date(2026, 1, 15, 10, 0, 0).getTime()
const DAY = 86_400_000
const p = normalizeParams({ algorithm: 'fsrs', learningStepsMinutes: [] })
const fsrs = getScheduler('fsrs')

describe('Vergessenskurve', () => {
  it('ist zum Zeitpunkt der Bewertung 1 und fällt danach monoton', () => {
    expect(retrievability(0, 10)).toBeCloseTo(1, 6)
    let prev = 1
    for (const t of [1, 5, 10, 30, 100]) {
      const r = retrievability(t, 10)
      expect(r).toBeLessThan(prev)
      expect(r).toBeGreaterThan(0)
      prev = r
    }
  })

  it('erreicht nach genau S Tagen 90 % – die Definition der Stabilität', () => {
    for (const s of [1, 7, 42, 365]) {
      expect(retrievability(s, s)).toBeCloseTo(0.9, 6)
    }
  })

  it('kehrt das Intervall zur Ziel-Behaltensquote korrekt um', () => {
    for (const s of [1, 7, 42, 365]) {
      // Umkehrung: R(I(S, r), S) muss wieder r ergeben.
      for (const r of [0.8, 0.88, 0.95]) {
        expect(retrievability(intervalForRetention(s, r), s)).toBeCloseTo(r, 6)
      }
      expect(intervalForRetention(s, 0.9)).toBeCloseTo(s, 6)
    }
  })

  it('verlangt bei höherer Ziel-Behaltensquote kürzere Intervalle', () => {
    expect(intervalForRetention(100, 0.95)).toBeLessThan(intervalForRetention(100, 0.85))
  })
})

describe('Ziel-Behaltensquote als Regler', () => {
  it('führt zu deutlich dichteren Wiederholungen', () => {
    const relaxed = fsrs.next(newCardState('c1'), 3, NOW, normalizeParams({ ...p, requestRetention: 0.8 }))
    const strict = fsrs.next(newCardState('c1'), 3, NOW, normalizeParams({ ...p, requestRetention: 0.95 }))
    expect(strict.intervalDays).toBeLessThan(relaxed.intervalDays)
  })
})

describe('Gedächtniszustand', () => {
  it('wächst in der Stabilität bei Erfolg und sinkt bei einem Rückfall', () => {
    let state = fsrs.next(newCardState('c1'), 3, NOW, p)
    const first = state.stability ?? 0
    state = fsrs.next(state, 3, NOW + 5 * DAY, p)
    expect(state.stability ?? 0).toBeGreaterThan(first)

    const before = state.stability ?? 0
    state = fsrs.next(state, 1, NOW + 20 * DAY, p)
    expect(state.stability ?? 0).toBeLessThanOrEqual(before)
  })

  it('hält die Schwierigkeit im Bereich 1–10', () => {
    let hard = newCardState('c1')
    let easy = newCardState('c2')
    let now = NOW
    for (let i = 0; i < 30; i++) {
      hard = fsrs.next(hard, 1, now, p)
      easy = fsrs.next(easy, 4, now, p)
      now += DAY
      for (const s of [hard, easy]) {
        expect(s.difficulty ?? 0).toBeGreaterThanOrEqual(1)
        expect(s.difficulty ?? 0).toBeLessThanOrEqual(10)
      }
    }
    // Wer eine Karte dauernd vergisst, hat eine schwerere Karte als jemand,
    // der sie durchweg als zu einfach bewertet.
    expect(hard.difficulty ?? 0).toBeGreaterThan(easy.difficulty ?? 0)
  })

  it('übernimmt beim Verfahrenswechsel das bisherige Intervall als Stabilität', () => {
    // Karte in SM-2 großgezogen, dann auf FSRS umgestellt: Der Zeitplan darf
    // nicht auf Anfang zurückfallen.
    const sm2 = getScheduler('sm2')
    const sm2Params = normalizeParams({ algorithm: 'sm2', learningStepsMinutes: [] })
    let state = newCardState('c1')
    let now = NOW
    for (let i = 0; i < 5; i++) {
      state = sm2.next(state, 3, now, sm2Params)
      now += state.intervalDays * DAY
    }
    expect(state.stability).toBeNull()
    const before = state.intervalDays
    const switched = fsrs.next(state, 3, now, p)
    expect(switched.stability ?? 0).toBeGreaterThan(before / 2)
    expect(switched.intervalDays).toBeGreaterThan(before / 2)
  })

  it('liefert die aktuelle Erinnerungswahrscheinlichkeit einer Karte', () => {
    const state = fsrs.next(newCardState('c1'), 3, NOW, p)
    expect(currentRetrievability(state, NOW)).toBeCloseTo(1, 4)
    const later = currentRetrievability(state, NOW + 90 * DAY) ?? 1
    expect(later).toBeLessThan(0.9)
    expect(currentRetrievability(newCardState('c2'), NOW)).toBeNull()
  })
})
