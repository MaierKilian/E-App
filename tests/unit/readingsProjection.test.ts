// Jahres-Hochrechnung und Trend aus Zählerständen.
//
// Kern der Sache: Bei Heizenergie darf die Jahreszahl nicht davon abhängen, in
// welcher Jahreszeit zuletzt abgelesen wurde. Vorher tat sie genau das – eine
// Sommermessung ergab rund ein Viertel, eine Wintermessung das Doppelte.

import { describe, expect, it } from 'vitest'
import { stats, consumptionTrend } from '@/features/monitoring/readings'
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

describe('consumptionTrend', () => {
  it('vergleicht mit dem Vorjahreszeitraum statt mit dem Vormonat', () => {
    // Zwei identische Jahre: der Verbrauch hat sich nicht geändert.
    const s = consumptionTrend(gasYearReadings(2000, 2024))
    expect(s?.baseline).toBe('lastYear')
    expect(s?.direction).toBe('flat')
  })

  it('erkennt echten Mehrverbrauch gegenüber dem Vorjahr', () => {
    const base = gasYearReadings(2000, 2024)
    // Letzten Zählerstand anheben -> letzter Abschnitt verbraucht mehr.
    const bumped = base.map((r, i) => (i === base.length - 1 ? { ...r, value: r.value + 200 } : r))
    const s = consumptionTrend(bumped)
    expect(s?.baseline).toBe('lastYear')
    expect(s?.direction).toBe('up')
  })

  it('fällt ohne Vorjahresdaten auf den vorherigen Abschnitt zurück', () => {
    const s = consumptionTrend(
      readings(['2026-01-01', 0], ['2026-02-01', 100], ['2026-03-01', 300]),
    )
    expect(s?.baseline).toBe('previousPeriod')
    expect(s?.direction).toBe('up')
  })
})
