// Jahres-Hochrechnung und Trend aus Zählerständen.
//
// Kern der Sache: Bei Heizenergie darf die Jahreszahl nicht davon abhängen, in
// welcher Jahreszeit zuletzt abgelesen wurde. Vorher tat sie genau das – eine
// Sommermessung ergab rund ein Viertel, eine Wintermessung das Doppelte.

import { describe, expect, it } from 'vitest'
import { stats, consumptionTrend, yearOverYearTrend } from '@/features/monitoring/readings'
import { seasonalShareBetween } from '@/features/monitoring/seasonality'
import type { MeterReading } from '@/store/readingsStore'

/** Baut Ablesungen aus Paaren [ISO-Datum, Zählerstand]. */
function readings(...pairs: [string, number][]): MeterReading[] {
  return pairs.map(([date, value], i) => ({ id: `r${i}`, date, value }))
}

/**
 * Gasverbrauch eines Jahres, monatsweise nach Heizprofil verteilt.
 * Erzeugt Ablesungen zum Monatsersten – so wie ein Nutzer sie einträgt.
 */
const MONTH_SHARE = [0.155, 0.135, 0.115, 0.08, 0.045, 0.025, 0.02, 0.02, 0.035, 0.08, 0.12, 0.17]

function gasYearReadings(annual: number, fromYear: number, years = 2): MeterReading[] {
  const pairs: [string, number][] = []
  let meter = 1000
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      const date = `${fromYear + y}-${String(m + 1).padStart(2, '0')}-01`
      pairs.push([date, meter])
      meter += annual * MONTH_SHARE[m]
    }
  }
  pairs.push([`${fromYear + years}-01-01`, meter])
  return readings(...pairs)
}

describe('seasonalShareBetween', () => {
  it('deckt über ein volles Jahr genau 100 % ab', () => {
    const share = seasonalShareBetween(new Date(2025, 0, 1), new Date(2026, 0, 1))
    expect(share).toBeCloseTo(1, 6)
  })

  it('erkennt den Sommer als kleinen Jahresanteil', () => {
    // Mitte Juli bis Mitte August: rund 2 % des Jahresverbrauchs.
    const share = seasonalShareBetween(new Date(2026, 6, 15), new Date(2026, 7, 15))
    expect(share).toBeGreaterThan(0.015)
    expect(share).toBeLessThan(0.025)
  })

  it('erkennt den Winter als großen Jahresanteil', () => {
    const share = seasonalShareBetween(new Date(2025, 11, 1), new Date(2026, 0, 1))
    expect(share).toBeCloseTo(0.17, 2)
  })
})

describe('stats – Jahreswert bei voller Historie', () => {
  it('summiert die letzten 12 Monate statt hochzurechnen', () => {
    const s = stats(gasYearReadings(2000, 2024), undefined, { seasonal: true })
    expect(s.projectionBasis).toBe('fullYear')
    expect(s.projectedYearKwh).toBeCloseTo(2000, 0)
  })

  it('liefert denselben Jahreswert, egal ob im Sommer oder Winter abgelesen', () => {
    const full = gasYearReadings(2000, 2024)
    // Historie einmal bis zum 1. August, einmal bis zum 1. Januar abschneiden.
    const bisAugust = full.filter((r) => r.date <= '2025-08-01')
    const bisJanuar = full.filter((r) => r.date <= '2026-01-01')
    const sommer = stats(bisAugust, undefined, { seasonal: true })
    const winter = stats(bisJanuar, undefined, { seasonal: true })
    expect(sommer.projectedYearKwh).toBeCloseTo(2000, 0)
    expect(winter.projectedYearKwh).toBeCloseTo(2000, 0)
  })
})

describe('stats – Schätzung bei kurzer Historie', () => {
  it('gewichtet eine reine Sommermessung aufs Jahr hoch', () => {
    // 1. Juni bis 1. September deckt laut Profil 6,5 % des Jahres ab
    // (2,5 + 2,0 + 2,0). Bei 2000 kWh/Jahr sind das 130 kWh.
    const s = stats(readings(['2026-06-01', 1000], ['2026-09-01', 1130]), undefined, {
      seasonal: true,
    })
    expect(s.projectionBasis).toBe('seasonal')
    expect(s.projectedYearKwh).toBeCloseTo(2000, -2)
  })

  it('haette linear gestreckt nur rund ein Viertel ergeben (Regression)', () => {
    // Dieselben 130 kWh in 92 Tagen: 130/92*365 = 516 kWh statt 2000. Genau
    // dieser Fehler liess die Gas-Jahreszahl im Sommer viel zu niedrig wirken.
    const measured = 130
    const linear = (measured / 92) * 365
    expect(linear).toBeCloseTo(516, 0)
    const s = stats(readings(['2026-06-01', 1000], ['2026-09-01', 1130]), undefined, {
      seasonal: true,
    })
    expect(s.projectedYearKwh! / linear).toBeGreaterThan(3.5)
  })

  it('streckt bei flachen Trägern linear', () => {
    // Strom: 100 kWh in 100 Tagen -> 365 kWh im Jahr.
    const s = stats(readings(['2026-01-01', 0], ['2026-04-11', 100]), undefined, {
      seasonal: false,
    })
    expect(s.projectionBasis).toBe('linear')
    expect(s.projectedYearKwh).toBeCloseTo(365, 0)
  })

  it('rechnet unter drei Wochen Messung gar nicht hoch', () => {
    const s = stats(readings(['2026-08-01', 1000], ['2026-08-10', 1005]), undefined, {
      seasonal: true,
    })
    expect(s.projectedYearKwh).toBeUndefined()
    expect(s.projectionBasis).toBeUndefined()
    // Der gemessene Abschnitt selbst bleibt erhalten.
    expect(s.lastConsumptionKwh).toBe(5)
  })

  it('nennt die Zahl der gemessenen Tage', () => {
    const s = stats(readings(['2026-01-01', 0], ['2026-04-11', 100]), undefined, {
      seasonal: false,
    })
    expect(s.projectionDays).toBe(100)
  })
})

describe('stats – Kosten', () => {
  it('rechnet den Jahreswert mit dem Preis je Einheit', () => {
    const s = stats(gasYearReadings(1000, 2024), 1.2, { seasonal: true })
    expect(s.projectedYearCostEur).toBeCloseTo(1200, 0)
  })
})

describe('yearOverYearTrend', () => {
  it('meldet bei zwei gleichen Jahren keine Veränderung', () => {
    const s = yearOverYearTrend(gasYearReadings(2000, 2024))
    expect(s?.baseline).toBe('lastYear')
    expect(s?.direction).toBe('flat')
    // Nicht exakt 0: die Fenster sind feste 365 Tage, 2024 hat aber 366. Der
    // Schalttag und die nicht auf Monatsgrenzen fallenden Fensterränder
    // erzeugen unter 1 % Rauschen – weit unter der 3-%-Schwelle für „flat".
    expect(Math.abs(s!.changePct!)).toBeLessThan(0.01)
  })

  it('erkennt ein um ein Fünftel teureres Jahr', () => {
    // Jahr 1: 2000 kWh, Jahr 2: 2400 kWh -> +20 %.
    const y1 = gasYearReadings(2000, 2024, 1)
    const start = y1[y1.length - 1].value
    const y2 = gasYearReadings(2400, 2025, 1).map((r, i) => ({
      ...r,
      id: `b${i}`,
      value: r.value - 1000 + start,
    }))
    const s = yearOverYearTrend([...y1, ...y2])
    expect(s?.direction).toBe('up')
    expect(s?.changePct).toBeCloseTo(0.2, 1)
  })

  it('schweigt, solange keine zwei vollen Jahre gemessen sind', () => {
    // Nur ein Jahr Historie -> kein Vorjahr zum Vergleichen.
    expect(yearOverYearTrend(gasYearReadings(2000, 2024, 1))).toBeUndefined()
  })

  it('schweigt ohne jede Ablesung', () => {
    expect(yearOverYearTrend([])).toBeUndefined()
  })
})

describe('consumptionTrend', () => {
  it('vergleicht immer mit dem vorherigen Abschnitt', () => {
    const s = consumptionTrend(
      readings(['2026-01-01', 0], ['2026-02-01', 100], ['2026-03-01', 300]),
    )
    expect(s?.baseline).toBe('previousPeriod')
    expect(s?.direction).toBe('up')
  })

  it('rechnet ungleich lange Ableseabstände auf den Tag herunter', () => {
    // 1.1. -> 1.2. sind 31 Tage, 1.2. -> 15.2. nur 14. Beide Male 10 kWh/Tag,
    // also hat sich nichts geändert – der kürzere Abstand darf den Prozentwert
    // nicht bewegen.
    const s = consumptionTrend(
      readings(['2026-01-01', 0], ['2026-02-01', 310], ['2026-02-15', 450]),
    )
    expect(s?.changePct).toBeCloseTo(0, 10)
    expect(s?.direction).toBe('flat')
  })

  it('meldet den doppelten Tagesverbrauch als +100 %', () => {
    // Wieder 31 gegen 14 Tage, diesmal 10 gegen 20 kWh/Tag.
    const s = consumptionTrend(
      readings(['2026-01-01', 0], ['2026-02-01', 310], ['2026-02-15', 590]),
    )
    expect(s?.changePct).toBeCloseTo(1, 10)
    expect(s?.direction).toBe('up')
  })

  it('lässt sich von einer langen Lücke in der Historie nicht beeinflussen', () => {
    // Der gemeldete Fehler: Zwischen der ersten und der zweiten Ablesung lagen
    // 385 Tage. Der frühere Vorjahres-Vergleich schnitt aus diesem einen
    // Abschnitt 31 interpolierte Tage heraus und meldete +52 %, obwohl der
    // Verbrauch gegenüber dem echten Vorzeitraum kaum gestiegen war.
    const recent: [string, number][] = [
      ['2026-06-05', 4980],
      ['2026-07-18', 5319],
      ['2026-08-18', 5606],
    ]
    const withGap = consumptionTrend(readings(['2024-12-15', 1231], ['2026-01-04', 3576], ...recent))
    const withoutGap = consumptionTrend(readings(...recent))

    expect(withGap?.baseline).toBe('previousPeriod')
    expect(withGap?.changePct).toBeCloseTo(withoutGap?.changePct ?? NaN, 10)
    // 287 kWh in 31 Tagen gegen 339 kWh in 43 Tagen: 9,26 gegen 7,88 kWh/Tag.
    expect(withGap?.changePct).toBeCloseTo(0.174, 3)
  })

  it('vergleicht auch bei Heizenergie mit dem Vorzeitraum', () => {
    // Bewusste Abwägung: Der Vorjahres-Vergleich hätte die Jahreszeit
    // herausgerechnet, beruhte aber zu oft auf interpolierten Lücken. Bei Gas
    // misst der Vorzeitraum-Vergleich damit den Übergang November -> Dezember
    // mit – ehrlich verzerrt statt erfunden.
    const s = consumptionTrend(gasYearReadings(2000, 2024))
    expect(s?.baseline).toBe('previousPeriod')
  })

  it('nennt ohne Vorgänger-Abschnitt keinen Prozentwert', () => {
    const s = consumptionTrend(readings(['2026-01-01', 0], ['2026-02-01', 310]))
    expect(s?.perDay).toBeCloseTo(10, 10)
    expect(s?.changePct).toBeUndefined()
    expect(s?.baseline).toBeUndefined()
  })

  it('schweigt ohne verwertbare Ablesungen', () => {
    expect(consumptionTrend([])).toBeUndefined()
    expect(consumptionTrend(readings(['2026-01-01', 100]))).toBeUndefined()
  })
})
