// Ableitung des Kartenzustands aus dem Ereignis-Log.
//
// Die zentrale Zusage: Der Zustand ist eine reine Funktion des Logs. Alles, was
// später darauf aufbaut – Zusammenführen zweier Geräte, Verfahrenswechsel,
// Neuberechnung des Zeitplans – hängt daran.

import { describe, expect, it } from 'vitest'
import {
  deriveCardState,
  deriveStates,
  emptySnapshot,
} from '@/features/education/flashcards/engine/derive'
import { createAction, createReview } from '@/features/education/flashcards/engine/log'
import { normalizeParams } from '@/features/education/flashcards/engine/params'
import type {
  Grade,
  LogEntry,
  ReviewEntry,
  SchedulerId,
  StudyMode,
} from '@/features/education/flashcards/engine/types'

const NOW = new Date(2026, 1, 15, 10, 0, 0).getTime()
const DAY = 86_400_000
const params = normalizeParams({ algorithm: 'fsrs' })
const options = { params }

function review(
  cardId: string,
  grade: Grade,
  ts: number,
  extra: { mode?: StudyMode; algo?: SchedulerId; elapsedDays?: number } = {},
): ReviewEntry {
  return createReview({
    cardId,
    grade,
    scale: 3,
    mode: extra.mode ?? 'study',
    algo: extra.algo ?? 'fsrs',
    msToFlip: 2000,
    msToGrade: 800,
    elapsedDays: extra.elapsedDays ?? 0,
    scheduledDays: 0,
    ts,
  })
}

describe('Ableitung', () => {
  it('kennt nur Karten, über die das Log etwas weiß', () => {
    const snapshot = deriveStates([review('a', 3, NOW)], options)
    expect(Object.keys(snapshot.states)).toEqual(['a'])
    expect(snapshot.entryCount).toBe(1)
    expect(snapshot.throughTs).toBe(NOW)
  })

  it('liefert unabhängig von der Eingabereihenfolge dasselbe Ergebnis', () => {
    const entries = [
      review('a', 3, NOW),
      review('a', 1, NOW + DAY),
      review('a', 3, NOW + DAY + 600_000),
    ]
    const forward = deriveStates(entries, options).states.a
    const backward = deriveStates([...entries].reverse(), options).states.a
    expect(backward).toEqual(forward)
  })

  it('rechnet inkrementell genauso wie von Null an', () => {
    const early = [review('a', 3, NOW), review('b', 3, NOW + 1000)]
    const late = [review('a', 3, NOW + DAY), review('b', 1, NOW + DAY + 1000)]

    const full = deriveStates([...early, ...late], options)
    const base = deriveStates(early, options)
    const incremental = deriveStates(late, options, base)

    expect(incremental.states).toEqual(full.states)
    expect(incremental.entryCount).toBe(full.entryCount)
    expect(incremental.throughTs).toBe(full.throughTs)
  })

  it('ignoriert Einträge, die im Schnappschuss schon enthalten sind', () => {
    const entries = [review('a', 3, NOW)]
    const base = deriveStates(entries, options)
    const again = deriveStates(entries, options, base)
    expect(again.states.a).toEqual(base.states.a)
    expect(again.entryCount).toBe(base.entryCount)
  })

  it('beginnt mit einem leeren Schnappschuss bei Null', () => {
    const empty = emptySnapshot()
    expect(empty.states).toEqual({})
    expect(deriveStates([review('a', 3, NOW)], options, empty).entryCount).toBe(1)
  })

  it('lässt den Klausur-Sprint den Zeitplan unberührt', () => {
    const planned = deriveStates([review('a', 3, NOW)], options).states.a
    const withCram = deriveStates(
      [review('a', 3, NOW), review('a', 1, NOW + 3600_000, { mode: 'cram' })],
      options,
    ).states.a
    expect(withCram).toEqual(planned)
  })

  it('nutzt die damals gemessene Zwischenzeit statt sie zu schätzen', () => {
    const entries = [
      review('a', 3, NOW),
      review('a', 3, NOW + 600_000),
      // Bewertung nach 30 Tagen, ausdrücklich protokolliert.
      review('a', 3, NOW + 31 * DAY, { elapsedDays: 30 }),
    ]
    const state = deriveStates(entries, options).states.a
    expect(state.reps).toBe(3)
    expect(state.intervalDays).toBeGreaterThan(5)
  })

  it('setzt eine Karte über eine Aktion aus und wieder fort', () => {
    const base = [review('a', 3, NOW), review('a', 3, NOW + 600_000)]
    const suspended = deriveStates([...base, createAction('a', 'suspend', NOW + DAY)], options)
    expect(suspended.states.a.status).toBe('suspended')

    const resumed = deriveStates(
      [...base, createAction('a', 'suspend', NOW + DAY), createAction('a', 'unsuspend', NOW + 2 * DAY)],
      options,
    )
    expect(resumed.states.a.status).toBe('young')
    // Intervall und Zähler überleben das Aussetzen.
    expect(resumed.states.a.intervalDays).toBe(suspended.states.a.intervalDays)
    expect(resumed.states.a.reps).toBe(2)
  })

  it('vertagt eine Karte auf den nächsten Lerntag, ohne das Intervall zu ändern', () => {
    const base = [review('a', 3, NOW)]
    const before = deriveStates(base, options).states.a
    const buried = deriveStates([...base, createAction('a', 'bury', NOW)], options).states.a
    expect(buried.intervalDays).toBe(before.intervalDays)
    expect(buried.due).toBeGreaterThan(before.due)
  })

  it('setzt eine Karte vollständig zurück', () => {
    const entries = [review('a', 3, NOW), review('a', 1, NOW + DAY), createAction('a', 'reset', NOW + 2 * DAY)]
    const state = deriveStates(entries, options).states.a
    expect(state.reps).toBe(0)
    expect(state.status).toBe('new')
    expect(state.lapses).toBe(0)
  })

  it('rechnet auf Wunsch den ganzen Zeitplan mit dem heutigen Verfahren neu', () => {
    // Historie mit SM-2 aufgebaut …
    const entries: LogEntry[] = [
      review('a', 3, NOW, { algo: 'sm2' }),
      review('a', 3, NOW + 600_000, { algo: 'sm2' }),
    ]
    const historic = deriveStates(entries, { params }).states.a
    // … einmal treu nachgerechnet (SM-2 kennt kein FSRS-Gedächtnis) …
    expect(historic.ease).not.toBeNull()
    expect(historic.stability).toBeNull()

    // … und einmal mit dem heute eingestellten FSRS neu gerechnet.
    const recomputed = deriveStates(entries, { params, useHistoricAlgorithm: false }).states.a
    expect(recomputed.stability).not.toBeNull()
    expect(recomputed.reps).toBe(historic.reps)
  })

  it('leitet den Zustand einer einzelnen Karte ab', () => {
    const entries = [review('a', 3, NOW), review('b', 1, NOW + 1000)]
    const a = deriveCardState('a', entries, options)
    expect(a.cardId).toBe('a')
    expect(a.reps).toBe(1)
    expect(deriveCardState('unbekannt', entries, options).status).toBe('new')
  })
})
