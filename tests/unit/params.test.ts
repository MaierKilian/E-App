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
  isUnlimitedReviews,
  normalizeParams,
  paramsFromPreset,
  type PresetId,
} from '@/features/education/flashcards/engine/params'

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
