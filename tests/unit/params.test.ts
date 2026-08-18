// Einstellungen: Presets und das Absichern fremder Werte.
//
// Parameter kommen aus localStorage und (Phase 5) aus der Cloud. Sie können
// veraltet, unvollständig oder – bei manipulierten Daten – unsinnig sein. Ein
// unsinniger Wert darf höchstens die Lernkurve verschieben, niemals die Engine
// in einen kaputten Zustand bringen.

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FSRS_WEIGHTS,
  DEFAULT_PARAMS,
  PRESETS,
  currentPreset,
  isUnlimitedReviews,
  normalizeParams,
  paramsFromPreset,
  type PresetId,
} from '@/features/education/flashcards/engine/params'
import { getScheduler } from '@/features/education/flashcards/engine/scheduler'
import { newCardState } from '@/features/education/flashcards/engine/types'

describe('Presets', () => {
  const ids = Object.keys(PRESETS) as PresetId[]

  it('ergeben vollständige Parametersätze', () => {
    for (const id of ids) {
      const p = paramsFromPreset(id)
      expect(Object.keys(p).sort()).toEqual(Object.keys(DEFAULT_PARAMS).sort())
    }
  })

  it('werden von locker nach intensiv anspruchsvoller', () => {
    const order: PresetId[] = ['relaxed', 'standard', 'intensive', 'sprint']
    for (let i = 1; i < order.length; i++) {
      const prev = paramsFromPreset(order[i - 1])
      const curr = paramsFromPreset(order[i])
      expect(curr.requestRetention).toBeGreaterThan(prev.requestRetention)
      expect(curr.newCardsPerDay).toBeGreaterThan(prev.newCardsPerDay)
    }
  })

  it('lässt den Klausur-Sprint unbegrenzt wiederholen', () => {
    expect(isUnlimitedReviews(paramsFromPreset('sprint'))).toBe(true)
    expect(isUnlimitedReviews(paramsFromPreset('standard'))).toBe(false)
  })
})

describe('Absichern der Werte', () => {
  it('füllt Fehlendes mit den Standardwerten', () => {
    expect(normalizeParams()).toEqual(DEFAULT_PARAMS)
    expect(normalizeParams(null)).toEqual(DEFAULT_PARAMS)
    expect(normalizeParams({ newCardsPerDay: 7 }).newCardsPerDay).toBe(7)
    expect(normalizeParams({ newCardsPerDay: 7 }).algorithm).toBe(DEFAULT_PARAMS.algorithm)
  })

  it('begrenzt die Ziel-Behaltensquote auf einen sinnvollen Bereich', () => {
    expect(normalizeParams({ requestRetention: 0.1 }).requestRetention).toBe(0.7)
    expect(normalizeParams({ requestRetention: 1 }).requestRetention).toBe(0.99)
  })

  it('wehrt unsinnige Zahlen ab', () => {
    const p = normalizeParams({
      newCardsPerDay: -5,
      maxIntervalDays: 0,
      intervalModifier: 99,
      leechThreshold: 0,
      dayCutoffHour: 48,
      startingEase: 0.2,
    })
    expect(p.newCardsPerDay).toBe(0)
    expect(p.maxIntervalDays).toBe(1)
    expect(p.intervalModifier).toBe(2)
    expect(p.leechThreshold).toBe(2)
    expect(p.dayCutoffHour).toBe(23)
    expect(p.startingEase).toBe(1.3)
  })

  it('verwirft ungültige Lernschritte statt daran zu scheitern', () => {
    expect(normalizeParams({ learningStepsMinutes: [1, -3, 0, 10] }).learningStepsMinutes).toEqual([1, 10])
    expect(normalizeParams({ relearningStepsMinutes: [] }).relearningStepsMinutes).toEqual([])
  })

  it('fällt bei unpassenden FSRS-Gewichten auf die Standardgewichte zurück', () => {
    expect(normalizeParams({ fsrsWeights: [1, 2, 3] }).fsrsWeights).toEqual(DEFAULT_FSRS_WEIGHTS)
    expect(DEFAULT_FSRS_WEIGHTS).toHaveLength(17)
  })

  it('fällt bei leeren Leitner-Boxen auf die Standardboxen zurück', () => {
    expect(normalizeParams({ leitnerBoxDays: [] }).leitnerBoxDays).toEqual(DEFAULT_PARAMS.leitnerBoxDays)
  })
})

describe('Aktives Preset erkennen', () => {
  it('erkennt jedes Preset an seinen Werten', () => {
    for (const id of Object.keys(PRESETS) as PresetId[]) {
      expect(currentPreset(paramsFromPreset(id))).toBe(id)
    }
  })

  it('meldet ohne Einstellung „Standard" – das ist der Auslieferungszustand', () => {
    expect(currentPreset(DEFAULT_PARAMS)).toBe('standard')
    expect(currentPreset(normalizeParams())).toBe('standard')
  })

  it('meldet null, wenn die Werte zu keinem Preset passen', () => {
    expect(currentPreset(normalizeParams({ requestRetention: 0.83 }))).toBeNull()
  })

  it('unterscheidet die Presets nach dem Intervall einer gewussten Karte', () => {
    // Das ist die Zahl, die in der Tempo-Auswahl steht: Sie muss von locker
    // nach intensiv streng kürzer werden, sonst führt die Anzeige in die Irre.
    const sample = {
      ...newCardState('x'),
      status: 'young' as const,
      reps: 4,
      intervalDays: 10,
      stability: 10,
      difficulty: 5,
      lastReviewed: 0,
    }
    const order: PresetId[] = ['relaxed', 'standard', 'intensive', 'sprint']
    const intervals = order.map((id) => {
      const p = paramsFromPreset(id)
      return getScheduler(p.algorithm).preview(sample, 10 * 86_400_000, p)[3]
    })
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeLessThan(intervals[i - 1])
    }
  })
})
