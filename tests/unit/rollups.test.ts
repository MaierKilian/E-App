// Tages-Aggregate und Lernserie.

import { describe, expect, it } from 'vitest'
import { dailyRollups, streakInfo, sumRollups } from '@/features/education/flashcards/engine/rollups'
import { createAction, createReview } from '@/features/education/flashcards/engine/log'
import type { Grade, LogEntry, StudyMode } from '@/features/education/flashcards/engine/types'

const CUTOFF = 4
const DAY = 86_400_000
const MONDAY = new Date(2026, 1, 16, 10, 0).getTime()

function review(cardId: string, grade: Grade, ts: number, mode: StudyMode = 'study'): LogEntry {
  return createReview({
    cardId,
    grade,
    scale: 3,
    mode,
    algo: 'fsrs',
    msToFlip: 3000,
    msToGrade: 1000,
    elapsedDays: 0,
    scheduledDays: 0,
    ts,
  })
}

describe('Tages-Aggregate', () => {
  it('trennt Behaltensquote und strenge Trefferquote', () => {
    const rollups = dailyRollups(
      [
        review('a', 3, MONDAY),
        review('b', 2, MONDAY + 1000),
        review('c', 1, MONDAY + 2000),
        review('d', 4, MONDAY + 3000),
      ],
      CUTOFF,
    )
    const day = rollups['2026-02-16']
    expect(day.reviews).toBe(4)
    expect(day.passed).toBe(3) // „Fast" zählt als erinnert
    expect(day.correct).toBe(2) // streng: nur „Gewusst" und „Zu einfach"
    expect(day.again).toBe(1)
    expect(day.msTotal).toBe(4 * 4000)
  })

  it('zählt erstmals bewertete Karten als neu', () => {
    const rollups = dailyRollups(
      [review('a', 3, MONDAY), review('a', 3, MONDAY + 600_000), review('b', 3, MONDAY + DAY)],
      CUTOFF,
    )
    expect(rollups['2026-02-16'].newCards).toBe(1)
    expect(rollups['2026-02-16'].reviews).toBe(2)
    expect(rollups['2026-02-17'].newCards).toBe(1)
  })

  it('weist Klausur-Sprint getrennt aus, zählt ihn aber als Lernleistung', () => {
    const rollups = dailyRollups([review('a', 3, MONDAY), review('b', 3, MONDAY + 1000, 'cram')], CUTOFF)
    expect(rollups['2026-02-16'].reviews).toBe(2)
    expect(rollups['2026-02-16'].cram).toBe(1)
  })

  it('ignoriert Aktionen – Aussetzen ist keine Lernleistung', () => {
    const rollups = dailyRollups([createAction('a', 'suspend', MONDAY)], CUTOFF)
    expect(Object.keys(rollups)).toHaveLength(0)
  })

  it('summiert über einen Zeitraum', () => {
    const rollups = dailyRollups([review('a', 3, MONDAY), review('b', 1, MONDAY + DAY)], CUTOFF)
    const total = sumRollups(Object.values(rollups))
    expect(total.reviews).toBe(2)
    expect(total.again).toBe(1)
  })
})

describe('Lernserie', () => {
  function withDays(offsets: number[]) {
    return dailyRollups(
      offsets.map((d, i) => review(`c${i}`, 3, MONDAY + d * DAY)),
      CUTOFF,
    )
  }

  it('zählt aufeinanderfolgende Lerntage', () => {
    const rollups = withDays([0, 1, 2])
    expect(streakInfo(rollups, MONDAY + 2 * DAY + 3600_000, CUTOFF).current).toBe(3)
  })

  it('reißt bei einer Lücke', () => {
    const rollups = withDays([0, 1, 3])
    const info = streakInfo(rollups, MONDAY + 3 * DAY + 3600_000, CUTOFF)
    expect(info.current).toBe(1)
    expect(info.longest).toBe(2)
  })

  it('lässt die Serie am laufenden Tag bestehen, solange er nicht vorbei ist', () => {
    const rollups = withDays([0, 1])
    // Tag darauf, noch keine Karte gemacht: die Serie von gestern gilt weiter.
    expect(streakInfo(rollups, MONDAY + 2 * DAY, CUTOFF).current).toBe(2)
  })

  it('ist ohne Lerntage null', () => {
    expect(streakInfo({}, MONDAY, CUTOFF)).toEqual({ current: 0, longest: 0 })
  })

  it('behält die längste Serie, auch wenn die aktuelle kürzer ist', () => {
    const rollups = withDays([0, 1, 2, 3, 6])
    const info = streakInfo(rollups, MONDAY + 6 * DAY + 3600_000, CUTOFF)
    expect(info.current).toBe(1)
    expect(info.longest).toBe(4)
  })
})
