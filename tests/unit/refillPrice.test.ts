// Abnahme Etappe 4 des Tank-Umbaus: der gemessene Preis aus den Lieferscheinen.
import { describe, expect, it } from 'vitest'
import { priceFromRefills } from '@/features/monitoring/priceConfig'
import type { MeterReading } from '@/store/readingsStore'

const TODAY = new Date('2026-08-30T00:00:00')

/** Lieferung mit Menge und Betrag. */
function refill(date: string, amount: number, costEur?: number): MeterReading {
  return {
    id: `${date}-${amount}`,
    date,
    value: 3000,
    refill: amount,
    ...(costEur !== undefined ? { refillCostEur: costEur } : {}),
  }
}

describe('priceFromRefills', () => {
  it('gewichtet nach Menge, nicht arithmetisch', () => {
    // 3.000 l zu 0,95 € und 500 l zu 1,30 €: tatsächlich gezahlt sind
    // 3.500 € / 3.500 l = 1,00 €/l. Der arithmetische Mittelwert läge bei
    // 1,125 €/l und gäbe der kleinen Nachbestellung dasselbe Gewicht.
    const p = priceFromRefills(
      [refill('2026-03-01', 3000, 2850), refill('2026-07-01', 500, 650)],
      { today: TODAY },
    )
    expect(p?.eurPerUnit).toBeCloseTo(1.0, 6)
    expect(p?.count).toBe(2)
    expect(p?.amount).toBe(3500)
  })

  it('mittelt über drei Lieferungen zu verschiedenen Preisen', () => {
    const p = priceFromRefills(
      [
        refill('2025-10-01', 2000, 1800), // 0,90
        refill('2026-02-01', 1000, 1150), // 1,15
        refill('2026-06-01', 3000, 2700), // 0,90
      ],
      { today: TODAY },
    )
    // (1800 + 1150 + 2700) / 6000
    expect(p?.eurPerUnit).toBeCloseTo(5650 / 6000, 6)
    expect(p?.count).toBe(3)
  })

  it('lässt Lieferungen älter als zwölf Monate weg', () => {
    const p = priceFromRefills(
      [refill('2024-01-01', 3000, 4500), refill('2026-06-01', 2000, 1800)],
      { today: TODAY },
    )
    // Nur die junge Lieferung zählt: 1800 / 2000 = 0,90.
    expect(p?.eurPerUnit).toBeCloseTo(0.9, 6)
    expect(p?.count).toBe(1)
  })

  it('behauptet ohne Beleg nichts', () => {
    // Eine Lieferung ohne Betrag ist kein Preis – und eine Ablesung erst recht
    // nicht.
    expect(priceFromRefills([refill('2026-06-01', 2000)], { today: TODAY })).toBeUndefined()
    expect(priceFromRefills([], { today: TODAY })).toBeUndefined()
    expect(
      priceFromRefills([{ id: 'a', date: '2026-06-01', value: 1200 }], { today: TODAY }),
    ).toBeUndefined()
  })

  it('überspringt unsinnige Werte, statt sie einzurechnen', () => {
    const p = priceFromRefills(
      [
        refill('2026-05-01', 0, 1800),
        refill('2026-05-02', 2000, 0),
        refill('2026-05-03', Number.NaN, 1800),
        refill('2026-05-04', 2000, Number.NaN),
        refill('kaputt', 2000, 1800),
        refill('2026-06-01', 2000, 1800),
      ],
      { today: TODAY },
    )
    expect(p?.count).toBe(1)
    expect(p?.eurPerUnit).toBeCloseTo(0.9, 6)
  })
})
