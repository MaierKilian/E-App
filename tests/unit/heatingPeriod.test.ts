// Die Heizperiode hinter dem Verlaufsdiagramm: Sie ordnet ein, wann ein
// Verbrauch entstanden ist, und behauptet nichts darüber, ob er richtig war.
//
// Die Spannen laufen über den Jahreswechsel – das ist die einzige Stelle, an
// der hier etwas schiefgehen kann, und genau darauf zielen diese Tests.

import { describe, expect, it } from 'vitest'
import {
  hasHeatingSeason,
  heatingSpans,
  isHeatingMonth,
} from '@/features/monitoring/heatingPeriod'

describe('Heizperiode', () => {
  it('zählt Oktober bis April dazu, Mai bis September nicht', () => {
    // 0-basiert: 9 = Oktober, 3 = April, 4 = Mai, 8 = September.
    expect([9, 10, 11, 0, 1, 2, 3].every(isHeatingMonth)).toBe(true)
    expect([4, 5, 6, 7, 8].some(isHeatingMonth)).toBe(false)
  })

  it('schneidet die Spannen auf den angefragten Zeitraum zu', () => {
    // Ein volles Jahr enthält genau zwei angeschnittene Heizperioden: die, die
    // im Vorjahr begann, und die, die im Oktober beginnt.
    const from = new Date(2026, 0, 1).getTime()
    const to = new Date(2026, 11, 31).getTime()
    const spans = heatingSpans(from, to)
    expect(spans).toHaveLength(2)
    expect(spans[0].from).toBe(from)
    // Erste Spanne endet am 1. Mai (Ende exklusiv – der 30. April gehört dazu).
    expect(new Date(spans[0].to).getMonth()).toBe(4)
    expect(new Date(spans[0].to).getDate()).toBe(1)
    // Zweite Spanne beginnt am 1. Oktober.
    expect(new Date(spans[1].from).getMonth()).toBe(9)
    expect(spans[1].to).toBe(to)
  })

  it('liefert für einen reinen Sommer-Zeitraum keine Spanne', () => {
    expect(heatingSpans(new Date(2026, 5, 1).getTime(), new Date(2026, 7, 1).getTime())).toEqual([])
  })

  it('führt eine Heizperiode über den Jahreswechsel als eine Spanne', () => {
    // Dezember bis Februar darf nicht in zwei Stücke zerfallen – sonst zeigte
    // das Diagramm mitten im Winter eine Kante.
    const spans = heatingSpans(
      new Date(2025, 11, 1).getTime(),
      new Date(2026, 1, 1).getTime(),
    )
    expect(spans).toHaveLength(1)
  })

  it('gibt bei vertauschten oder unbrauchbaren Grenzen nichts zurück', () => {
    expect(heatingSpans(new Date(2026, 5, 1).getTime(), new Date(2026, 0, 1).getTime())).toEqual([])
    expect(heatingSpans(NaN, 0)).toEqual([])
  })
})

describe('Wo die Heizperiode hinterlegt wird', () => {
  it('gilt für Wärmeträger, nicht für Strom, Wasser oder Solarthermie', () => {
    expect(hasHeatingSeason('gas')).toBe(true)
    expect(hasHeatingSeason('oil')).toBe(true)
    expect(hasHeatingSeason('pellets')).toBe(true)
    expect(hasHeatingSeason('heat_pump')).toBe(true)
    expect(hasHeatingSeason('electricity')).toBe(false)
    expect(hasHeatingSeason('water')).toBe(false)
    // Solarthermie liefert im Sommer am meisten – ein Band, das ihre stärkste
    // Zeit als „außerhalb" markiert, führte in die Irre.
    expect(hasHeatingSeason('solar_thermal')).toBe(false)
  })
})
