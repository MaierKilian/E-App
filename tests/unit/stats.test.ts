// Auswertungen der Statistik-Seite.

import { describe, expect, it } from 'vitest'
import {
  dayBars,
  dueForecast,
  heatmapCells,
  periodStats,
  statusDistribution,
} from '@/features/education/flashcards/engine/stats'
import { dailyRollups, maturityOf } from '@/features/education/flashcards/engine/rollups'
import { createReview } from '@/features/education/flashcards/engine/log'
import type { QueueCard } from '@/features/education/flashcards/engine/queue'
import { newCardState, type CardState, type Grade } from '@/features/education/flashcards/engine/types'

const CUTOFF = 4
const DAY = 86_400_000
// Montag, 16.02.2026, 10:00 Ortszeit
const MONDAY = new Date(2026, 1, 16, 10, 0).getTime()

function review(cardId: string, grade: Grade, ts: number, scheduledDays = 0) {
  return createReview({
    cardId,
    grade,
    scale: 3,
    mode: 'study',
    algo: 'fsrs',
    msToFlip: 4000,
    msToGrade: 1000,
    elapsedDays: 0,
    scheduledDays,
    ts,
  })
}

function card(id: string): QueueCard {
  return { cardId: id, subjectId: 'thermo', setId: 'set1' }
}

function state(id: string, over: Partial<CardState>): CardState {
  return { ...newCardState(id), reps: 4, status: 'young', ...over }
}

describe('Reifegrad einer Bewertung', () => {
  it('leitet sich aus dem damals geplanten Intervall ab', () => {
    expect(maturityOf(review('a', 3, MONDAY, 0))).toBe('new')
    expect(maturityOf(review('a', 3, MONDAY, 10 / 1440))).toBe('learning')
    expect(maturityOf(review('a', 3, MONDAY, 5))).toBe('young')
    expect(maturityOf(review('a', 3, MONDAY, 21))).toBe('mature')
  })
})

describe('Kalender-Heatmap', () => {
  const rollups = dailyRollups(
    [
      ...Array.from({ length: 8 }, (_, i) => review(`a${i}`, 3, MONDAY)),
      review('b', 3, MONDAY - DAY),
      review('c', 3, MONDAY - 30 * DAY),
    ],
    CUTOFF,
  )

  it('liefert ein volles Wochenraster', () => {
    const cells = heatmapCells(rollups, MONDAY, CUTOFF, 12)
    expect(cells).toHaveLength(84)
    expect(new Set(cells.map((c) => c.day)).size).toBe(84)
  })

  it('endet mit der laufenden Woche und stellt Montag oben ein', () => {
    const cells = heatmapCells(rollups, MONDAY, CUTOFF, 4)
    const today = cells.find((c) => c.day === '2026-02-16')
    expect(today?.weekday).toBe(0) // Montag
    expect(today?.week).toBe(3) // letzte Spalte
  })

  it('stuft relativ zum stärksten Tag ab', () => {
    const cells = heatmapCells(rollups, MONDAY, CUTOFF, 12)
    const strongest = cells.find((c) => c.day === '2026-02-16')
    const weak = cells.find((c) => c.day === '2026-02-15')
    expect(strongest?.count).toBe(8)
    expect(strongest?.level).toBe(4)
    expect(weak?.count).toBe(1)
    expect(weak?.level).toBe(1)
  })

  it('lässt Tage ohne Bewertung auf Stufe 0', () => {
    const cells = heatmapCells(rollups, MONDAY, CUTOFF, 12)
    expect(cells.filter((c) => c.level === 0).length).toBeGreaterThan(70)
  })

  it('zählt in die Zukunft reichende Zellen nicht mit', () => {
    // Dienstag: Der Rest der Woche liegt in der Zukunft und bleibt leer.
    const cells = heatmapCells(rollups, MONDAY + DAY, CUTOFF, 2)
    const future = cells.filter((c) => c.day > '2026-02-17')
    expect(future.every((c) => c.count === 0 && c.level === 0)).toBe(true)
  })
})

describe('Balken je Tag', () => {
  it('schlüsselt nach Reifegrad auf', () => {
    const rollups = dailyRollups(
      [
        review('a', 3, MONDAY, 0), // neu
        review('b', 3, MONDAY, 10 / 1440), // Lernschritt
        review('c', 3, MONDAY, 5), // jung
        review('d', 3, MONDAY, 40), // reif
      ],
      CUTOFF,
    )
    const bars = dayBars(rollups, MONDAY, CUTOFF, 3)
    expect(bars).toHaveLength(3)
    const today = bars[2]
    expect(today.total).toBe(4)
    expect(today.byMaturity).toEqual({ new: 1, learning: 1, young: 1, mature: 1 })
  })

  it('füllt Tage ohne Bewertungen mit Nullen', () => {
    const bars = dayBars({}, MONDAY, CUTOFF, 7)
    expect(bars).toHaveLength(7)
    expect(bars.every((b) => b.total === 0)).toBe(true)
  })
})

describe('Fälligkeits-Prognose', () => {
  const cards = [card('a'), card('b'), card('c'), card('d'), card('e')]

  it('verteilt Karten auf die kommenden Tage', () => {
    const states = {
      a: state('a', { due: MONDAY + 2 * DAY }),
      b: state('b', { due: MONDAY + 2 * DAY }),
      c: state('c', { due: MONDAY + 10 * DAY }),
    }
    const forecast = dueForecast(cards, states, MONDAY, CUTOFF, 30)
    expect(forecast.perDay[2]).toBe(2)
    expect(forecast.perDay[10]).toBe(1)
    expect(forecast.max).toBe(2)
  })

  it('weist Rückstand getrennt aus', () => {
    const states = {
      a: state('a', { due: MONDAY - DAY }),
      b: state('b', { due: MONDAY + 3 * DAY }),
    }
    const forecast = dueForecast(cards, states, MONDAY, CUTOFF, 30)
    expect(forecast.overdue).toBe(1)
    expect(forecast.perDay.reduce((s, n) => s + n, 0)).toBe(1)
  })

  it('lässt neue und ausgesetzte Karten außen vor – sie haben keinen Termin', () => {
    const states = {
      a: newCardState('a'),
      b: state('b', { due: MONDAY + DAY, status: 'suspended' }),
    }
    const forecast = dueForecast(cards, states, MONDAY, CUTOFF, 30)
    expect(forecast.perDay.reduce((s, n) => s + n, 0)).toBe(0)
    expect(forecast.overdue).toBe(0)
  })

  it('ignoriert Termine jenseits des Zeitraums', () => {
    const states = { a: state('a', { due: MONDAY + 90 * DAY }) }
    const forecast = dueForecast(cards, states, MONDAY, CUTOFF, 30)
    expect(forecast.perDay.reduce((s, n) => s + n, 0)).toBe(0)
  })
})

describe('Kartenzustands-Verteilung', () => {
  const cards = [card('a'), card('b'), card('c'), card('d'), card('e'), card('f')]

  it('zählt jede Karte genau einmal', () => {
    const states = {
      b: state('b', { status: 'learning', intervalDays: 0.007 }),
      c: state('c', { status: 'relearning', intervalDays: 0.007 }),
      d: state('d', { status: 'young' }),
      e: state('e', { status: 'mature', intervalDays: 40 }),
      f: state('f', { status: 'suspended' }),
    }
    const dist = statusDistribution(cards, states)
    expect(dist.total).toBe(6)
    expect(dist.new).toBe(1) // a ist unbekannt = neu
    expect(dist.learning).toBe(2) // Lernschritt und Rückfall zusammen
    expect(dist.young).toBe(1)
    expect(dist.mature).toBe(1)
    expect(dist.suspended).toBe(1)
    expect(dist.new + dist.learning + dist.young + dist.mature + dist.suspended).toBe(dist.total)
  })

  it('weist Problemkarten zusätzlich aus, ohne sie doppelt zu zählen', () => {
    const states = { a: state('a', { status: 'young', leech: true, lapses: 9 }) }
    const dist = statusDistribution([card('a')], states)
    expect(dist.leech).toBe(1)
    expect(dist.young).toBe(1)
    expect(dist.total).toBe(1)
  })
})

describe('Kennzahlen eines Zeitraums', () => {
  it('trennt Behaltens- und Trefferquote', () => {
    const rollups = dailyRollups(
      [
        review('a', 3, MONDAY),
        review('b', 2, MONDAY),
        review('c', 1, MONDAY),
        review('d', 4, MONDAY - DAY),
      ],
      CUTOFF,
    )
    const stats = periodStats(rollups, MONDAY, CUTOFF, 30)
    expect(stats.reviews).toBe(4)
    expect(stats.retention).toBeCloseTo(3 / 4, 5)
    expect(stats.accuracy).toBeCloseTo(2 / 4, 5)
    expect(stats.again).toBe(1)
    expect(stats.activeDays).toBe(2)
    expect(stats.secondsPerReview).toBeCloseTo(5, 5)
  })

  it('lässt Tage außerhalb des Zeitraums weg', () => {
    const rollups = dailyRollups([review('a', 3, MONDAY - 40 * DAY)], CUTOFF)
    expect(periodStats(rollups, MONDAY, CUTOFF, 30).reviews).toBe(0)
  })

  it('ist ohne Daten null statt NaN', () => {
    const stats = periodStats({}, MONDAY, CUTOFF, 30)
    expect(stats.retention).toBe(0)
    expect(stats.accuracy).toBe(0)
    expect(stats.secondsPerReview).toBe(0)
  })
})
