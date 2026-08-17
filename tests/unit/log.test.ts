// Ereignis-Log: Erzeugen, Zusammenführen, Aufteilen.
//
// Idempotenz und Kommutativität des Zusammenführens sind die Voraussetzung
// dafür, dass die geräteübergreifende Synchronisation (Phase 5) ohne Sperren,
// Versionsnummern und Konfliktdialoge funktioniert.

import { describe, expect, it } from 'vitest'
import {
  chunkKey,
  createAction,
  createReview,
  groupByChunk,
  idsOf,
  makeEntryId,
  mergeEntries,
} from '@/features/education/flashcards/engine/log'
import type { Grade, LogEntry } from '@/features/education/flashcards/engine/types'

const NOW = Date.UTC(2026, 1, 15, 10, 0, 0)
const DAY = 86_400_000

function review(cardId: string, ts: number, grade: Grade = 3, taken?: Set<string>) {
  return createReview(
    {
      cardId,
      grade,
      scale: 3,
      mode: 'study',
      algo: 'fsrs',
      msToFlip: 1500,
      msToGrade: 500,
      elapsedDays: 0,
      scheduledDays: 0,
      ts,
    },
    taken,
  )
}

describe('Einträge erzeugen', () => {
  it('vergibt eine stabile, aus Karte und Zeit abgeleitete ID', () => {
    const entry = review('karte-1', NOW)
    expect(entry.id).toBe(makeEntryId('karte-1', NOW))
    expect(entry.kind).toBe('review')
  })

  it('rundet Zeitmessungen und lässt keine negativen Werte zu', () => {
    const entry = createReview({
      cardId: 'a',
      grade: 3,
      scale: 3,
      mode: 'study',
      algo: 'fsrs',
      msToFlip: -50,
      msToGrade: 1234.7,
      elapsedDays: -3,
      scheduledDays: 5,
      ts: NOW,
    })
    expect(entry.msToFlip).toBe(0)
    expect(entry.msToGrade).toBe(1235)
    expect(entry.elapsedDays).toBe(0)
  })

  it('weicht auf die nächste Millisekunde aus, wenn eine ID schon vergeben ist', () => {
    const first = review('a', NOW)
    const second = review('a', NOW, 3, idsOf([first]))
    expect(second.id).not.toBe(first.id)
    expect(second.ts).toBe(NOW + 1)
  })

  it('erzeugt Aktions-Einträge', () => {
    const entry = createAction('a', 'suspend', NOW)
    expect(entry.kind).toBe('action')
    expect(entry.action).toBe('suspend')
  })
})

describe('Zusammenführen', () => {
  const a = review('a', NOW)
  const b = review('b', NOW + 1000)
  const c = review('c', NOW + 2000)

  it('ist idempotent – dasselbe Log doppelt eingemischt ändert nichts', () => {
    expect(mergeEntries([a, b], [a, b])).toEqual([a, b])
  })

  it('ist kommutativ – die Reihenfolge der Geräte ist bedeutungslos', () => {
    expect(mergeEntries([a, b], [c])).toEqual(mergeEntries([c], [b, a]))
  })

  it('sortiert nach Zeit', () => {
    const merged = mergeEntries([c, a], [b])
    expect(merged.map((e) => e.cardId)).toEqual(['a', 'b', 'c'])
  })

  it('behält bei gleicher ID den zuerst gesehenen Eintrag (Einträge sind unveränderlich)', () => {
    const tampered: LogEntry = { ...a, grade: 1 }
    const merged = mergeEntries([a], [tampered])
    expect(merged).toHaveLength(1)
    expect(merged[0]).toEqual(a)
  })
})

describe('Monatspakete', () => {
  it('bildet den Schlüssel zeitzonenunabhängig aus UTC', () => {
    expect(chunkKey(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01')
    expect(chunkKey(Date.UTC(2026, 11, 31, 23, 59, 59))).toBe('2026-12')
  })

  it('gruppiert Einträge und sortiert innerhalb des Pakets', () => {
    const groups = groupByChunk([review('b', NOW + 40 * DAY), review('a', NOW), review('c', NOW + 1000)])
    expect(Object.keys(groups).sort()).toEqual(['2026-02', '2026-03'])
    expect(groups['2026-02'].map((e) => e.cardId)).toEqual(['a', 'c'])
  })
})
