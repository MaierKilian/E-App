// Der Sommer-Check beantwortet Kilians Frage aus dem Live-Test: „Läuft die
// Heizung wirklich nur in der Heizperiode?"
//
// Die Antwort kommt bewusst ohne Wetterdaten aus. Der Maßstab ist der Haushalt
// selbst: Was im Hochsommer durch den Zähler geht, ist der
// Warmwasser-Grundbedarf – gehalten gegen den Bedarf, den die App aus der
// Personenzahl ohnehin kennt. Diese Tests halten die beiden Enden fest: dass
// aus zu dünner Datenlage kein Befund entsteht, und dass die Bewertung an der
// Rechnung hängt und nicht an einer Zahl im Text.

import { describe, expect, it } from 'vitest'
import {
  HOT_WATER_KWH_PER_PERSON_DAY,
  MIN_SUMMER_DAYS,
  hasSummerCheck,
  heatingSpans,
  isHeatingMonth,
  summerHeatCheck,
} from '@/features/monitoring/heatingPeriod'
import type { MeterReading } from '@/store/readingsStore'

function reading(date: string, value: number): MeterReading {
  return { id: date, date, value } as MeterReading
}

/**
 * Gas-Ablesungen über ein Sommerfenster.
 *
 * @param m3PerDay Verbrauch je Tag, den der Zähler zeigen soll.
 */
function summerReadings(m3PerDay: number, from = '2026-06-01', to = '2026-09-01'): MeterReading[] {
  const days = (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000
  return [reading(from, 1000), reading(to, 1000 + m3PerDay * days)]
}

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

  it('gibt bei vertauschten oder unbrauchbaren Grenzen nichts zurück', () => {
    expect(heatingSpans(new Date(2026, 5, 1).getTime(), new Date(2026, 0, 1).getTime())).toEqual([])
    expect(heatingSpans(NaN, 0)).toEqual([])
  })
})

describe('Sommer-Check: wo er gilt', () => {
  it('gilt für Wärmeträger, nicht für Strom, Wasser oder Solarthermie', () => {
    expect(hasSummerCheck('gas')).toBe(true)
    expect(hasSummerCheck('oil')).toBe(true)
    expect(hasSummerCheck('pellets')).toBe(true)
    expect(hasSummerCheck('heat_pump')).toBe(true)
    expect(hasSummerCheck('electricity')).toBe(false)
    expect(hasSummerCheck('water')).toBe(false)
    // Solarthermie liefert im Sommer am meisten – ein hoher Wert ist dort das
    // Ziel, nicht der Befund.
    expect(hasSummerCheck('solar_thermal')).toBe(false)
  })
})

describe('Sommer-Check: kein Befund aus dünner Datenlage', () => {
  it('schweigt ohne Personenzahl', () => {
    expect(summerHeatCheck(summerReadings(1), { type: 'gas', persons: 0 })).toBeUndefined()
  })

  it('schweigt ohne Ablesungen', () => {
    expect(summerHeatCheck([], { type: 'gas', persons: 2 })).toBeUndefined()
  })

  it('schweigt, wenn der Sommer nur gestreift wurde', () => {
    // Zwei Wochen im Sommerfenster – unter der Mindestabdeckung.
    const kurz = [reading('2026-07-01', 1000), reading('2026-07-14', 1013)]
    expect(summerHeatCheck(kurz, { type: 'gas', persons: 2 })).toBeUndefined()
    expect(MIN_SUMMER_DAYS).toBeGreaterThan(14)
  })

  it('zählt nur Tage innerhalb des Sommerfensters', () => {
    // Ein ganzes Jahr Ablesungen, aber die einzige Ablesestrecke liegt im
    // Winter: Das Sommerfenster ist trotzdem abgedeckt (die Strecke überspannt
    // es), deshalb hier bewusst ein Abstand, der vor dem 15.6. endet.
    const winter = [reading('2026-01-01', 1000), reading('2026-06-01', 2000)]
    expect(summerHeatCheck(winter, { type: 'gas', persons: 2 })).toBeUndefined()
  })
})

describe('Sommer-Check: die Bewertung hängt an der Rechnung', () => {
  const persons = 2
  // Erwarteter Zählerverbrauch je Tag: Warmwasserwärme ÷ Wirkungsgrad (Gas 0,9)
  // ÷ Energieinhalt (10 kWh/m³).
  const expectedM3PerDay = (persons * HOT_WATER_KWH_PER_PERSON_DAY) / 0.9 / 10

  it('nennt genau den erwarteten Verbrauch ein Verhältnis von 1', () => {
    const check = summerHeatCheck(summerReadings(expectedM3PerDay), { type: 'gas', persons })
    expect(check).toBeDefined()
    expect(check!.ratio).toBeCloseTo(1, 5)
    expect(check!.expectedPerDay).toBeCloseTo(expectedM3PerDay, 8)
    expect(check!.rating).toBe('good')
  })

  it('bewertet knapp darüber weiter als gut – ein Kessel verliert im Sommer etwas', () => {
    const check = summerHeatCheck(summerReadings(expectedM3PerDay * 1.4), { type: 'gas', persons })
    expect(check!.rating).toBe('good')
  })

  it('meldet das Doppelte als auffällig, das Dreifache als deutlich', () => {
    expect(
      summerHeatCheck(summerReadings(expectedM3PerDay * 2), { type: 'gas', persons })!.rating,
    ).toBe('medium')
    expect(
      summerHeatCheck(summerReadings(expectedM3PerDay * 3), { type: 'gas', persons })!.rating,
    ).toBe('high')
  })

  it('weist den Überschuss nur aus, wenn es einen gibt', () => {
    const gut = summerHeatCheck(summerReadings(expectedM3PerDay * 0.8), { type: 'gas', persons })!
    expect(gut.excessPerSummer).toBeUndefined()
    const viel = summerHeatCheck(summerReadings(expectedM3PerDay * 3), { type: 'gas', persons })!
    expect(viel.excessPerSummer).toBeGreaterThan(0)
  })

  it('rechnet den Energieinhalt des Zählers mit', () => {
    // Derselbe Zählerverbrauch bei halbem Energieinhalt je m³ ist nur die
    // Hälfte an Wärme – das Verhältnis muss sich verdoppeln.
    const standard = summerHeatCheck(summerReadings(expectedM3PerDay), {
      type: 'gas',
      persons,
    })!
    const halb = summerHeatCheck(summerReadings(expectedM3PerDay), {
      type: 'gas',
      persons,
      kwhPerUnit: 5,
    })!
    expect(halb.ratio).toBeCloseTo(standard.ratio / 2, 5)
  })

  it('rechnet bei der Wärmepumpe mit der Arbeitszahl statt einem Wirkungsgrad', () => {
    // Die Wärmepumpe macht aus einer Kilowattstunde Strom mehrere Wärme – ihr
    // erwarteter Zählerwert muss deutlich unter dem der Gasheizung liegen.
    const wp = summerHeatCheck(summerReadings(1), { type: 'heat_pump', persons })!
    const erwarteteWaerme = persons * HOT_WATER_KWH_PER_PERSON_DAY
    expect(wp.expectedPerDay).toBeLessThan(erwarteteWaerme)
    expect(wp.expectedPerDay).toBeCloseTo(erwarteteWaerme / 2.8, 8)
  })

  it('nennt die Belastbarkeit in gemessenen Sommertagen', () => {
    const check = summerHeatCheck(summerReadings(expectedM3PerDay), { type: 'gas', persons })!
    // Fenster 15.6.–31.8. = 78 Tage, vollständig von den Ablesungen überspannt.
    expect(check.daysCovered).toBe(78)
  })
})

describe('Der Warmwasser-Maßstab bleibt an den Duschkopf-Annahmen', () => {
  it('liegt bei rund 500 kWh je Person und Jahr', () => {
    // Die übliche Angabe ist 500–600 kWh je Person – der abgeleitete Wert muss
    // dort landen, sonst ist die Herleitung entgleist.
    const proJahr = HOT_WATER_KWH_PER_PERSON_DAY * 365
    expect(proJahr).toBeGreaterThan(450)
    expect(proJahr).toBeLessThan(650)
  })
})
