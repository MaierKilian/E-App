// Lerntage und Tagesgrenze.
//
// Alle Tests arbeiten mit Ortszeit (`new Date(...)` ohne UTC), weil der Lerntag
// bewusst in der Zeitzone des Geräts liegt – der Nutzer erlebt seinen Tag lokal.

import { describe, expect, it } from 'vitest'
import {
  dayDiff,
  dayKey,
  dayKeyRange,
  dayStart,
  nextDayStart,
} from '@/features/education/flashcards/engine/time'

const CUTOFF = 4

describe('Tagesgrenze', () => {
  it('zählt die Nacht noch zum Vortag', () => {
    const nightOwl = new Date(2026, 1, 16, 1, 30).getTime() // 16.02., 01:30
    expect(dayKey(nightOwl, CUTOFF)).toBe('2026-02-15')
  })

  it('beginnt den neuen Lerntag mit der Grenze', () => {
    const morning = new Date(2026, 1, 16, 4, 0).getTime()
    expect(dayKey(morning, CUTOFF)).toBe('2026-02-16')
    expect(dayStart(morning, CUTOFF)).toBe(morning)
  })

  it('verhält sich bei Grenze 0 wie ein Kalendertag', () => {
    const nightOwl = new Date(2026, 1, 16, 1, 30).getTime()
    expect(dayKey(nightOwl, 0)).toBe('2026-02-16')
  })

  it('ordnet alle Zeitpunkte eines Lerntags demselben Schlüssel zu', () => {
    const keys = [5, 12, 23].map((h) => dayKey(new Date(2026, 1, 16, h).getTime(), CUTOFF))
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('2026-02-16')
  })

  it('springt auf den folgenden Lerntag', () => {
    const ts = new Date(2026, 1, 16, 22, 0).getTime()
    expect(dayKey(nextDayStart(ts, CUTOFF), CUTOFF)).toBe('2026-02-17')
  })

  it('zählt Lerntage über Monatsgrenzen hinweg', () => {
    const from = new Date(2026, 1, 26, 12).getTime()
    const to = new Date(2026, 2, 3, 12).getTime()
    expect(dayDiff(from, to, CUTOFF)).toBe(5) // 2026 ist kein Schaltjahr
    expect(dayDiff(to, from, CUTOFF)).toBe(-5)
    expect(dayDiff(from, from, CUTOFF)).toBe(0)
  })

  it('liefert einen lückenlosen Bereich von Lerntagen', () => {
    const from = new Date(2026, 1, 27, 12).getTime()
    const to = new Date(2026, 2, 2, 12).getTime()
    expect(dayKeyRange(from, to, CUTOFF)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ])
    expect(dayKeyRange(to, from, CUTOFF)).toEqual([])
  })
})
