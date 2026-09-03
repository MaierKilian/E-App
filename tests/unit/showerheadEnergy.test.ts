// Die Warmwasser-Rechnung des Duschkopf-Checks.
//
// Der Kommentar über `yearlyCostForFlow` behauptete bis September 2026 einen
// 60-%-Warmwasseranteil und ΔT = 25 K – beides stand nie im Code. Wer die Zahl
// nachrechnen wollte, prüfte die falsche Formel.
//
// Diese Tests binden die Beschreibung an die Rechnung: Der „So gerechnet"-
// Aufklapper nennt rund 516 kWh pro Person und Jahr als Kalibrierung, und diese
// Zahl muss aus den exportierten Konstanten tatsächlich folgen.

import { describe, expect, it } from 'vitest'
import {
  COLD_WATER_C,
  DELTA_T,
  EFFICIENT_FLOW_LPM,
  GOOD_MAX,
  MINUTES_PER_SHOWER,
  SHOWERS_PER_PERSON_PER_DAY,
  WH_PER_LITER_PER_K,
  calcShowerhead,
} from '@/features/measurements/showerhead/showerhead'

/** Die Rechnung, wie der Aufklapper sie beschreibt – von Hand nachgezogen. */
function kWhPerPersonPerYear(flowLpm: number): number {
  const minutes = SHOWERS_PER_PERSON_PER_DAY * MINUTES_PER_SHOWER * 365
  return (minutes * flowLpm * DELTA_T * WH_PER_LITER_PER_K) / 1000
}

describe('Duschkopf – Warmwasser-Energie', () => {
  it('landet bei der Kalibrierung, die der Aufklapper nennt', () => {
    // 9 l/min ist der Kalibrierungspunkt; die Literatur nennt 500–600 kWh je
    // Person und Jahr für die Warmwasserbereitung.
    const kWh = kWhPerPersonPerYear(GOOD_MAX)
    expect(kWh).toBeGreaterThan(500)
    expect(kWh).toBeLessThan(600)
    expect(Math.round(kWh)).toBe(516)
  })

  it('erwärmt von 11 auf 38 °C – die Zahlen im Aufklapper passen zusammen', () => {
    expect(COLD_WATER_C).toBe(11)
    expect(COLD_WATER_C + DELTA_T).toBe(38)
  })

  it('rechnet ohne Warmwasser-Anteil: doppelter Durchfluss, doppelte Kosten', () => {
    // Ein zusätzlicher Prozentsatz würde die Menge ein zweites Mal kürzen. Der
    // Test hält fest, dass der Zusammenhang linear im Durchfluss bleibt.
    const eins = calcShowerhead({ liters: 1, seconds: 6, persons: 1, eurPerKwh: 0.3 })
    const zwei = calcShowerhead({ liters: 2, seconds: 6, persons: 1, eurPerKwh: 0.3 })
    expect(eins.flowLpm).toBe(10)
    expect(zwei.flowLpm).toBe(20)
    expect(zwei.yearlyCost / eins.yearlyCost).toBeCloseTo(2, 1)
  })

  it('weist erst oberhalb des Richtwerts eine Ersparnis aus', () => {
    const sparsam = calcShowerhead({ liters: 1.5, seconds: 10, persons: 2, eurPerKwh: 0.3 })
    expect(sparsam.flowLpm).toBe(GOOD_MAX)
    expect(sparsam.yearlySaving).toBe(0)

    const hoch = calcShowerhead({ liters: 2.4, seconds: 10, persons: 2, eurPerKwh: 0.3 })
    expect(hoch.flowLpm).toBeGreaterThan(GOOD_MAX)
    expect(hoch.yearlySaving).toBeGreaterThan(0)
    // Verglichen wird gegen den Sparduschkopf, nicht gegen die Bewertungsgrenze.
    expect(EFFICIENT_FLOW_LPM).toBeLessThan(GOOD_MAX)
  })
})
