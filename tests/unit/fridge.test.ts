// Kuehlschrank-Check: Bewertung und Sparpotenzial aus der Innentemperatur.
//
// Kern dieser Datei ist der Gleichlauf: Was die App als "optimal" bewertet,
// darf daneben kein Sparpotenzial ausweisen.

import { describe, expect, it } from 'vitest'
import {
  calcFridgeSaving,
  fridgeChange,
  fridgeStatus,
  rateFridge,
  GOOD_MIN,
  GOOD_MAX,
} from '@/features/measurements/fridge/fridge'

describe('Bewertung und Status', () => {
  it('nennt das Band 5–7 °C gut', () => {
    expect(rateFridge(GOOD_MIN)).toBe('good')
    expect(rateFridge(6)).toBe('good')
    expect(rateFridge(GOOD_MAX)).toBe('good')
  })

  it('trennt zu kalt, optimal und zu warm', () => {
    expect(fridgeStatus(3)).toBe('tooCold')
    expect(fridgeStatus(5)).toBe('optimal')
    expect(fridgeStatus(7)).toBe('optimal')
    expect(fridgeStatus(9)).toBe('tooWarm')
  })
})

describe('calcFridgeSaving – kein Potenzial im guten Band', () => {
  it('weist bei „optimal" kein Sparpotenzial aus', () => {
    // Der Widerspruch, um den es geht: 5,0 °C ergab "Sehr gut · Optimal
    // eingestellt · Weiter so" und darunter "Sparpotenzial ≈ 12 %", weil bis
    // 7 °C hochgerechnet wurde, ohne den Status zu beachten.
    for (const temp of [GOOD_MIN, 5.5, 6, 6.9, GOOD_MAX]) {
      const c = calcFridgeSaving(temp)
      expect(c.status).toBe('optimal')
      expect(c.savingPct).toBe(0)
    }
  })

  it('rechnet bei „zu kalt" bis zur Empfehlung hoch (~6 % je °C)', () => {
    const c = calcFridgeSaving(3)
    expect(c.status).toBe('tooCold')
    expect(c.savingPct).toBeCloseTo(0.24, 5) // 4 °C bis 7 °C
  })

  it('weist bei „zu warm" kein Sparpotenzial aus – kälter kostet mehr', () => {
    const c = calcFridgeSaving(9)
    expect(c.status).toBe('tooWarm')
    expect(c.savingPct).toBe(0)
  })

  it('deckt sich mit der Schwelle der Empfehlungsliste (Tipp erst unter 5 °C)', () => {
    expect(calcFridgeSaving(4.9).savingPct).toBeGreaterThan(0)
    expect(calcFridgeSaving(5).savingPct).toBe(0)
  })
})

describe('fridgeChange – Folgemessung nach angepasster Stufe', () => {
  it('rechnet die erreichte Erwärmung, gedeckelt bei der Empfehlung', () => {
    const c = fridgeChange(3, 5)
    expect(c.direction).toBe('up')
    expect(c.savingPct).toBeCloseTo(0.12, 5)
  })

  it('zählt über die Empfehlung hinaus nichts dazu', () => {
    // Von 3 °C auf 9 °C sind 6 °C, aber nur 4 °C bis zur Empfehlung zählen.
    expect(fridgeChange(3, 9).savingPct).toBeCloseTo(0.24, 5)
  })

  it('meldet kein Sparen, wenn kälter gestellt wurde', () => {
    const c = fridgeChange(6, 4)
    expect(c.direction).toBe('down')
    expect(c.savingPct).toBe(0)
  })
})
