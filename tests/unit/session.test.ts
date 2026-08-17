// Ablauf einer Lernsession.

import { describe, expect, it } from 'vitest'
import {
  buryCurrent,
  canUndo,
  currentCard,
  doneCount,
  finishSession,
  flip,
  gradeCurrent,
  isFinished,
  sessionSummary,
  startSession,
  suspendCurrent,
  undoLast,
  type SessionState,
} from '@/features/education/flashcards/engine/session'
import type { QueueItem } from '@/features/education/flashcards/engine/queue'
import { normalizeParams } from '@/features/education/flashcards/engine/params'
import { newCardState, type Grade } from '@/features/education/flashcards/engine/types'

const NOW = new Date(2026, 1, 16, 10, 0).getTime()
const SECOND = 1000
const params = normalizeParams({ algorithm: 'fsrs', reinsertAfterCards: 2 })

/** Neue Karte – läuft erst durch die Lernschritte, ehe sie die Runde verlässt. */
function item(id: string): QueueItem {
  return {
    card: { cardId: id, subjectId: 'thermo', setId: 'set1' },
    state: newCardState(id),
    source: 'new',
  }
}

/**
 * Bereits gelernte, heute fällige Karte. „Gewusst" bringt sie sofort auf ein
 * Intervall von Tagen – sie ist damit für heute erledigt.
 */
function dueItem(id: string): QueueItem {
  return {
    card: { cardId: id, subjectId: 'thermo', setId: 'set1' },
    state: {
      ...newCardState(id),
      status: 'young',
      reps: 4,
      intervalDays: 10,
      due: NOW - 1000,
      lastReviewed: NOW - 10 * 86_400_000,
      stability: 10,
      difficulty: 5,
    },
    source: 'review',
  }
}

function session(ids: string[]): SessionState {
  return startSession(ids.map(item), 'study', NOW)
}

/** Runde aus bereits gelernten Karten. */
function dueSession(ids: string[]): SessionState {
  return startSession(ids.map(dueItem), 'study', NOW)
}

/** Bewertet die aktuelle Karte und liefert die neue Sitzung. */
function rate(s: SessionState, grade: Grade, at: number): SessionState {
  return gradeCurrent(s, grade, at, params).session
}

describe('Ablauf', () => {
  it('beginnt bei der ersten Karte, verdeckt', () => {
    const s = session(['a', 'b', 'c'])
    expect(currentCard(s)?.card.cardId).toBe('a')
    expect(s.flipped).toBe(false)
    expect(s.total).toBe(3)
    expect(doneCount(s)).toBe(0)
  })

  it('dreht um und merkt sich den Zeitpunkt für die Zeitmessung', () => {
    const s = flip(session(['a']), NOW + 3 * SECOND)
    expect(s.flipped).toBe(true)
    expect(s.flippedAt).toBe(NOW + 3 * SECOND)
  })

  it('misst Nachdenk- und Bewertungszeit getrennt', () => {
    let s = session(['a'])
    s = flip(s, NOW + 4 * SECOND)
    const { flushed, session: after } = gradeCurrent(s, 3, NOW + 6 * SECOND, params)
    // Die erste Bewertung liegt noch im Rückgängig-Puffer.
    expect(flushed).toHaveLength(0)
    const entry = after.pending?.entry
    expect(entry?.msToFlip).toBe(4000)
    expect(entry?.msToGrade).toBe(2000)
  })

  it('rückt nach einer guten Bewertung zur nächsten Karte vor', () => {
    let s = dueSession(['a', 'b'])
    s = rate(flip(s, NOW), 3, NOW + SECOND)
    expect(currentCard(s)?.card.cardId).toBe('b')
    expect(doneCount(s)).toBe(1)
  })

  it('lässt eine NEUE Karte erst nach den Lernschritten los', () => {
    // Neues Material sofort auf Tage zu vertagen wäre der klassische Fehler:
    // Beim ersten „Gewusst" ist die Karte gesehen, nicht gelernt.
    let s = session(['a', 'b'])
    s = rate(flip(s, NOW), 3, NOW + SECOND)
    expect(s.queue.map((i) => i.card.cardId)).toContain('a')
    expect(doneCount(s)).toBe(0)

    // Zweites „Gewusst" – jetzt graduiert sie in den Tagesrhythmus.
    const index = s.queue.findIndex((i) => i.card.cardId === 'a')
    for (let i = 0; i < index; i++) s = rate(flip(s, NOW), 3, NOW + SECOND)
    s = rate(flip(s, NOW + 10 * 60_000), 3, NOW + 10 * 60_000 + SECOND)
    expect(s.queue.some((i) => i.card.cardId === 'a')).toBe(false)
  })

  it('bringt eine nicht gewusste Karte in derselben Runde zurück', () => {
    let s = session(['a', 'b', 'c', 'd'])
    s = rate(flip(s, NOW), 1, NOW + SECOND)
    // reinsertAfterCards = 2 → nach zwei weiteren Karten wieder.
    expect(s.queue.map((i) => i.card.cardId)).toEqual(['b', 'c', 'a', 'd'])
    expect(s.queue[2].source).toBe('relearning')
  })

  it('legt sie bei reinsertAfterCards = 0 sofort wieder vor', () => {
    const sofort = normalizeParams({ reinsertAfterCards: 0 })
    const s = gradeCurrent(flip(session(['a', 'b']), NOW), 1, NOW + SECOND, sofort).session
    expect(currentCard(s)?.card.cardId).toBe('a')
  })

  it('zählt eine wiederholte Karte nicht doppelt als erledigt', () => {
    let s = session(['a', 'b'])
    s = rate(flip(s, NOW), 1, NOW + SECOND) // a kommt zurück
    expect(doneCount(s)).toBe(0)
    expect(s.graded).toBe(1)
  })

  it('ist durch, wenn keine Karte mehr übrig ist', () => {
    let s = dueSession(['a'])
    s = rate(flip(s, NOW), 3, NOW + SECOND)
    expect(isFinished(s)).toBe(true)
    expect(currentCard(s)).toBeNull()
    expect(s.finishedAt).toBe(NOW + SECOND)
  })
})

describe('Rückgängig', () => {
  it('stellt den Stand vor der letzten Bewertung wieder her', () => {
    const before = flip(session(['a', 'b']), NOW)
    const after = rate(before, 3, NOW + SECOND)
    expect(canUndo(after)).toBe(true)

    const undone = undoLast(after)
    expect(currentCard(undone)?.card.cardId).toBe('a')
    expect(undone.graded).toBe(0)
    expect(undone.counts[3]).toBe(0)
    expect(canUndo(undone)).toBe(false)
  })

  it('macht auch eine irrtümliche „Nochmal"-Bewertung rückgängig', () => {
    let s = session(['a', 'b', 'c'])
    s = rate(flip(s, NOW), 1, NOW + SECOND)
    expect(s.queue).toHaveLength(3) // a wurde wieder eingereiht
    const undone = undoLast(s)
    expect(undone.queue.map((i) => i.card.cardId)).toEqual(['a', 'b', 'c'])
  })

  it('geht nur einen Schritt zurück – die vorletzte Bewertung ist geschrieben', () => {
    let s = session(['a', 'b', 'c'])
    s = rate(flip(s, NOW), 3, NOW + SECOND)
    const second = gradeCurrent(flip(s, NOW + 2 * SECOND), 3, NOW + 3 * SECOND, params)
    // Mit der zweiten Bewertung wird die erste endgültig geschrieben.
    expect(second.flushed).toHaveLength(1)
    expect(second.flushed[0].cardId).toBe('a')

    const undone = undoLast(second.session)
    expect(currentCard(undone)?.card.cardId).toBe('b')
    expect(canUndo(undone)).toBe(false)
  })
})

describe('Karte beiseitelegen', () => {
  it('nimmt eine ausgesetzte Karte aus der Runde und schreibt die Aktion', () => {
    const s = session(['a', 'b'])
    const { session: after, flushed } = suspendCurrent(s, NOW + SECOND)
    expect(after.queue.map((i) => i.card.cardId)).toEqual(['b'])
    expect(flushed).toHaveLength(1)
    expect(flushed[0]).toMatchObject({ kind: 'action', action: 'suspend', cardId: 'a' })
  })

  it('vertagt eine Karte und schreibt die gepufferte Bewertung mit', () => {
    let s = dueSession(['a', 'b', 'c'])
    s = rate(flip(s, NOW), 3, NOW + SECOND) // a bewertet, liegt im Puffer
    const { session: after, flushed } = buryCurrent(s, NOW + 2 * SECOND)
    expect(after.queue.map((i) => i.card.cardId)).toEqual(['c'])
    expect(flushed.map((e) => e.kind)).toEqual(['review', 'action'])
    expect(canUndo(after)).toBe(false)
  })

  it('entfernt eine wieder eingereihte Karte vollständig', () => {
    const sofort = normalizeParams({ reinsertAfterCards: 0 })
    let s = dueSession(['a', 'b'])
    s = gradeCurrent(flip(s, NOW), 1, NOW + SECOND, sofort).session // a kommt sofort zurück
    expect(currentCard(s)?.card.cardId).toBe('a')
    const { session: after } = suspendCurrent(s, NOW + 2 * SECOND)
    expect(after.queue.every((i) => i.card.cardId !== 'a')).toBe(true)
  })
})

describe('Abschluss', () => {
  it('schreibt die letzte gepufferte Bewertung endgültig', () => {
    let s = dueSession(['a'])
    s = rate(flip(s, NOW), 3, NOW + SECOND)
    const { flushed, session: after } = finishSession(s, NOW + 2 * SECOND)
    expect(flushed).toHaveLength(1)
    expect(after.pending).toBeNull()
  })

  it('fasst die Runde zusammen', () => {
    let s = dueSession(['a', 'b', 'c'])
    s = rate(flip(s, NOW), 3, NOW + SECOND)
    s = rate(flip(s, NOW + 2 * SECOND), 2, NOW + 3 * SECOND)
    s = rate(flip(s, NOW + 4 * SECOND), 1, NOW + 5 * SECOND)

    const summary = sessionSummary(s, NOW + 6 * SECOND)
    expect(summary.ratings).toBe(3)
    expect(summary.passed).toBe(2)
    expect(summary.correct).toBe(1)
    expect(summary.again).toBe(1)
    expect(summary.retention).toBeCloseTo(2 / 3, 5)
    expect(summary.dueAgainToday).toBe(1) // die vergessene Karte steht noch an
  })
})

describe('Klausur-Sprint', () => {
  const cram = (ids: string[]) => startSession(ids.map(item), 'cram', NOW)

  it('protokolliert als „cram" und lässt den Kartenzustand unberührt', () => {
    const s = flip(cram(['a', 'b']), NOW)
    const { session: after } = gradeCurrent(s, 3, NOW + SECOND, params)
    expect(after.pending?.entry.mode).toBe('cram')
    // Zustand der Karte bleibt, wie er war – kein neuer Zeitplan.
    expect(after.queue[0].state.reps).toBe(0)
  })

  it('wiederholt nicht gewusste Karten trotzdem innerhalb der Runde', () => {
    const sofort = normalizeParams({ reinsertAfterCards: 0 })
    const s = gradeCurrent(flip(cram(['a', 'b']), NOW), 1, NOW + SECOND, sofort).session
    expect(currentCard(s)?.card.cardId).toBe('a')
  })
})
