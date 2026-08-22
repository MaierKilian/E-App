// Anzeigepolitik für geschätzte Ersparnisse.
//
// Diese Regeln entscheiden, welche Euro-Beträge die App überhaupt behauptet.
// Sie sind der Grund, warum aus einer errechneten Ersparnis von 1 € kein
// „ca. 5–10 €/Jahr" mehr wird – ein Boden in der Spannen-Berechnung hatte genau
// das getan und damit Geld erfunden, das die Rechnung nie hergab.

import { describe, expect, it } from 'vitest'
import {
  EUR_ROUNDING_STEP,
  MIN_DISPLAY_EUR,
  displaySavingEur,
  savingRange,
} from '@/features/measurements/savingsDisplay'

describe('Anzeigeschwelle', () => {
  it('zeigt Kleinbeträge gar nicht erst als Euro', () => {
    expect(displaySavingEur(0)).toBeUndefined()
    expect(displaySavingEur(1)).toBeUndefined()
    expect(displaySavingEur(MIN_DISPLAY_EUR - 0.01)).toBeUndefined()
    expect(displaySavingEur(undefined)).toBeUndefined()
    expect(displaySavingEur(Number.NaN)).toBeUndefined()
  })

  it('rundet ab der Schwelle auf die Anzeigeschrittweite', () => {
    expect(displaySavingEur(MIN_DISPLAY_EUR)).toBe(20)
    expect(displaySavingEur(36)).toBe(35)
    expect(displaySavingEur(38)).toBe(40)
  })
})

describe('Spanne', () => {
  it('hat keinen Boden, der kleine Beträge nach oben zieht', () => {
    // Der frühere `Math.max(5, …)` machte hieraus „5–10 €".
    expect(savingRange(1).low).toBe(0)
  })

  it('legt die Spanne um den Wert, nicht daneben', () => {
    const { low, high } = savingRange(40)
    expect(low).toBeLessThanOrEqual(40)
    expect(high).toBeGreaterThanOrEqual(40)
    expect(high - low).toBeGreaterThanOrEqual(EUR_ROUNDING_STEP)
  })

  it('bleibt auch bei einem Grenzbetrag eine echte Spanne', () => {
    const { low, high } = savingRange(MIN_DISPLAY_EUR)
    expect(high).toBeGreaterThan(low)
  })
})
