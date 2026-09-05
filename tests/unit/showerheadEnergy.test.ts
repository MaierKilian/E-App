// Die Ersparnis-Rechnung des Duschkopf-Checks.
//
// Sie steht seit dem 05.09.2026 als Prozentsatz statt als Euro-Betrag. Der
// Grund ist eine Eigenschaft der Formel, nicht eine Geschmacksfrage: Kosten
// und Wassermenge sind beide linear im Durchfluss, also kürzt sich im
// Verhältnis jede Annahme weg, die für beide Durchflüsse dieselbe ist –
// Personenzahl, Duschhäufigkeit, Duschdauer, Temperaturhub, Arbeitspreis.
//
// Genau das halten diese Tests fest. Fiele die Eigenschaft weg, wäre der
// Prozentsatz wieder eine Schätzung wie jede andere – und die Frage nach der
// Warmwasserquelle, die dieser Umbau entfernt hat, wieder berechtigt.

import { describe, expect, it } from 'vitest'
import {
  EFFICIENT_FLOW_LPM,
  GOOD_MAX,
  MINUTES_PER_SHOWER,
  SHOWERS_PER_PERSON_PER_DAY,
  calcShowerhead,
  savingShareForFlow,
} from '@/features/measurements/showerhead/showerhead'

describe('Duschkopf – Ersparnis in Prozent', () => {
  it('hängt allein am gemessenen Durchfluss, nicht am Haushalt', () => {
    // Dieselbe Messung, zwei sehr verschiedene Haushalte: gleicher Prozentsatz.
    // Ein Euro-Betrag hätte hier um den Faktor fünf auseinandergelegen.
    const einer = calcShowerhead({ liters: 2.4, seconds: 10, persons: 1 })
    const fuenf = calcShowerhead({ liters: 2.4, seconds: 10, persons: 5 })
    expect(einer.flowLpm).toBe(14.4)
    expect(fuenf.flowLpm).toBe(14.4)
    expect(einer.savingPct).toBe(fuenf.savingPct)
    // Die Wassermenge dagegen skaliert mit dem Haushalt – sie ist die einzige
    // Kennzahl, die noch Annahmen enthält.
    expect(fuenf.litersSavedPerYear).toBe(einer.litersSavedPerYear * 5)
  })

  it('rechnet (Durchfluss − Sparduschkopf) ÷ Durchfluss', () => {
    // 12 l/min → 8 l/min sind genau ein Drittel weniger.
    expect(savingShareForFlow(12)).toBeCloseTo(1 / 3, 10)
    expect(calcShowerhead({ liters: 2, seconds: 10, persons: 2 }).savingPct).toBe(33)
  })

  it('weist erst oberhalb des Richtwerts eine Ersparnis aus', () => {
    const sparsam = calcShowerhead({ liters: 1.5, seconds: 10, persons: 2 })
    expect(sparsam.flowLpm).toBe(GOOD_MAX)
    expect(sparsam.savingPct).toBe(0)
    expect(sparsam.litersSavedPerYear).toBe(0)

    const hoch = calcShowerhead({ liters: 2.4, seconds: 10, persons: 2 })
    expect(hoch.flowLpm).toBeGreaterThan(GOOD_MAX)
    expect(hoch.savingPct).toBeGreaterThan(0)
    // Verglichen wird gegen den Sparduschkopf, nicht gegen die Bewertungsgrenze.
    expect(EFFICIENT_FLOW_LPM).toBeLessThan(GOOD_MAX)
  })

  it('bleibt unter 100 % und wächst mit dem Durchfluss', () => {
    let vorher = 0
    for (const flow of [10, 12, 15, 20, 30]) {
      const anteil = savingShareForFlow(flow)
      expect(anteil).toBeGreaterThan(vorher)
      expect(anteil).toBeLessThan(1)
      vorher = anteil
    }
  })

  it('hochgerechnet wird die Wassermenge über Duschen und Minuten', () => {
    // Die Jahresmenge ist die einzige Kennzahl mit Annahmen – der Aufklapper
    // nennt beide, und diese Rechnung muss aus ihnen folgen.
    const persons = 2
    const { flowLpm, litersSavedPerYear } = calcShowerhead({ liters: 2, seconds: 10, persons })
    const minuten = persons * SHOWERS_PER_PERSON_PER_DAY * MINUTES_PER_SHOWER * 365
    expect(litersSavedPerYear).toBe(Math.round((flowLpm - EFFICIENT_FLOW_LPM) * minuten))
  })

  it('rechnet keinen Euro-Betrag mehr', () => {
    // Der Riegel gegen die Rückkehr: Kein Feld des Ergebnisses trägt Geld,
    // und `resultSavingsEur` findet über den Katalog ohnehin nichts mehr.
    const calc = calcShowerhead({ liters: 2.4, seconds: 10, persons: 2 })
    expect(Object.keys(calc).sort()).toEqual(
      ['flowLpm', 'litersSavedPerYear', 'rating', 'savingPct'].sort(),
    )
  })
})
