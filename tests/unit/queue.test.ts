// Bau der Lern-Warteschlange.

import { describe, expect, it } from 'vitest'
import { buildQueue, doneToday, dueCounts, type QueueCard } from '@/features/education/flashcards/engine/queue'
import { normalizeParams } from '@/features/education/flashcards/engine/params'
import { getScheduler } from '@/features/education/flashcards/engine/scheduler'
import { newCardState, type CardState } from '@/features/education/flashcards/engine/types'

const NOW = new Date(2026, 1, 16, 10, 0).getTime()
const DAY = 86_400_000
const params = normalizeParams({ algorithm: 'fsrs' })

function card(id: string, subjectId = 'thermo', setId = 'set1'): QueueCard {
  return { cardId: id, subjectId, setId }
}

/** Karte mit Fälligkeit in `dueInDays` (negativ = überfällig). */
function due(id: string, dueInDays: number): CardState {
  return {
    ...newCardState(id),
    status: dueInDays >= 21 ? 'mature' : 'young',
    reps: 5,
    intervalDays: 10,
    due: NOW + dueInDays * DAY,
    lastReviewed: NOW - 10 * DAY,
  }
}

describe('Warteschlange', () => {
  it('nimmt nur fällige Karten und neue Karten auf', () => {
    const cards = [card('a'), card('b'), card('c')]
    const states = { a: due('a', -1), b: due('b', 5) } // c ist neu
    const queue = buildQueue({ cards, states, params, now: NOW })
    expect(queue.map((i) => i.card.cardId)).toEqual(['a', 'c'])
  })

  it('stellt vergessene Karten vor die regulären Wiederholungen', () => {
    const cards = [card('a'), card('b')]
    const states = {
      a: due('a', -1),
      b: { ...due('b', -1), status: 'relearning' as const, intervalDays: 0.007 },
    }
    const queue = buildQueue({ cards, states, params, now: NOW })
    expect(queue.map((i) => i.source)).toEqual(['relearning', 'review'])
    expect(queue[0].card.cardId).toBe('b')
  })

  it('setzt neue Karten ans Ende – Rückstand geht vor Nachschub', () => {
    const cards = [card('neu1'), card('alt'), card('neu2')]
    const states = { alt: due('alt', -1) }
    const queue = buildQueue({ cards, states, params, now: NOW })
    expect(queue[0].card.cardId).toBe('alt')
    expect(queue.map((i) => i.source)).toEqual(['review', 'new', 'new'])
  })

  it('hält das Tageslimit für neue Karten ein', () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`c${i}`))
    const limited = normalizeParams({ newCardsPerDay: 5 })
    const queue = buildQueue({ cards, states: {}, params: limited, now: NOW })
    expect(queue).toHaveLength(5)
  })

  it('rechnet bereits erledigte Karten des Tages gegen das Limit', () => {
    const cards = Array.from({ length: 30 }, (_, i) => card(`c${i}`))
    const limited = normalizeParams({ newCardsPerDay: 5 })
    const queue = buildQueue({
      cards,
      states: {},
      params: limited,
      now: NOW,
      doneToday: { reviews: 0, newCards: 3 },
    })
    expect(queue).toHaveLength(2)
  })

  it('lässt den Klausur-Sprint alle Karten ohne Rücksicht auf Fälligkeit ziehen', () => {
    const cards = [card('a'), card('b'), card('c')]
    const states = { a: due('a', 30), b: due('b', 60) }
    const queue = buildQueue({ cards, states, params, now: NOW, cram: true })
    expect(queue).toHaveLength(3)
  })

  it('überspringt ausgesetzte Karten – auch im Klausur-Sprint', () => {
    const cards = [card('a'), card('b')]
    const states = { a: { ...due('a', -1), status: 'suspended' as const } }
    expect(buildQueue({ cards, states, params, now: NOW }).map((i) => i.card.cardId)).toEqual(['b'])
    expect(
      buildQueue({ cards, states, params, now: NOW, cram: true }).map((i) => i.card.cardId),
    ).toEqual(['b'])
  })

  it('filtert auf Wunsch auf schwierige Karten', () => {
    const cards = [card('leech'), card('ok')]
    const states = {
      leech: { ...due('leech', -1), leech: true },
      ok: due('ok', -1),
    }
    const queue = buildQueue({ cards, states, params, now: NOW, hardOnly: true })
    expect(queue.map((i) => i.card.cardId)).toEqual(['leech'])
  })

  it('verschachtelt über Fächer statt blockweise abzuarbeiten', () => {
    const cards = [
      card('a1', 'thermo'),
      card('a2', 'thermo'),
      card('b1', 'hydraulik'),
      card('b2', 'hydraulik'),
    ]
    const queue = buildQueue({ cards, states: {}, params, now: NOW })
    const subjects = queue.map((i) => i.card.subjectId)
    expect(subjects).toEqual(['thermo', 'hydraulik', 'thermo', 'hydraulik'])
  })

  it('lässt die Verschachtelung abschalten', () => {
    const cards = [card('a1', 'thermo'), card('b1', 'hydraulik'), card('a2', 'thermo')]
    const blocked = normalizeParams({ interleaveSubjects: false })
    const queue = buildQueue({ cards, states: {}, params: blocked, now: NOW })
    expect(queue.map((i) => i.card.cardId)).toEqual(['a1', 'b1', 'a2'])
  })

  it('sortiert auf Wunsch die schwierigsten Karten nach vorn', () => {
    const cards = [card('leicht'), card('schwer')]
    const states = {
      leicht: due('leicht', -1),
      schwer: { ...due('schwer', -1), lapses: 4 },
    }
    const hardest = normalizeParams({ order: 'hardestFirst', interleaveSubjects: false })
    const queue = buildQueue({ cards, states, params: hardest, now: NOW })
    expect(queue[0].card.cardId).toBe('schwer')
  })

  it('mischt reproduzierbar – zweimal dieselbe Eingabe, dieselbe Reihenfolge', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(`c${i}`))
    const states = Object.fromEntries(cards.map((c) => [c.cardId, due(c.cardId, -1)]))
    const mixed = normalizeParams({ order: 'mixed', interleaveSubjects: false })
    const first = buildQueue({ cards, states, params: mixed, now: NOW }).map((i) => i.card.cardId)
    const second = buildQueue({ cards, states, params: mixed, now: NOW }).map((i) => i.card.cardId)
    expect(second).toEqual(first)
  })
})

describe('Fälligkeits-Zähler', () => {
  it('zählt die drei Töpfe getrennt und weist Rückstand aus', () => {
    const cards = [card('a'), card('b'), card('c'), card('d')]
    const states = {
      a: { ...due('a', -1), status: 'relearning' as const },
      b: due('b', -2),
      c: due('c', -3),
    }
    const limited = normalizeParams({ maxReviewsPerDay: 1 })
    const counts = dueCounts({ cards, states, params: limited, now: NOW })
    expect(counts.relearning).toBe(1)
    expect(counts.review).toBe(1) // Tageslimit greift
    expect(counts.new).toBe(1)
    expect(counts.total).toBe(3)
    expect(counts.backlog).toBe(3) // tatsächlich fällig, ohne Limit
  })
})

describe('Heute bereits erledigt', () => {
  it('trennt neue Karten von Wiederholungen', () => {
    const rollups = { '2026-02-16': { reviews: 12, newCards: 4 } }
    expect(doneToday(rollups, NOW, 4)).toEqual({ reviews: 8, newCards: 4 })
  })

  it('ist an einem Tag ohne Bewertungen null', () => {
    expect(doneToday({}, NOW, 4)).toEqual({ reviews: 0, newCards: 0 })
  })
})

describe('Zusammenspiel mit dem Scheduler', () => {
  it('nimmt eine gerade bewertete Karte aus der heutigen Warteschlange', () => {
    const cards = [card('a')]
    const state = getScheduler('fsrs').next(due('a', -1), 3, NOW, params)
    const queue = buildQueue({ cards, states: { a: state }, params, now: NOW })
    expect(queue).toHaveLength(0)
  })

  it('holt eine vergessene Karte noch heute zurück', () => {
    const cards = [card('a')]
    const state = getScheduler('fsrs').next(due('a', -1), 1, NOW, params)
    const queue = buildQueue({
      cards,
      states: { a: state },
      params,
      now: NOW + 15 * 60_000, // eine Viertelstunde später
    })
    expect(queue.map((i) => i.source)).toEqual(['relearning'])
  })
})
