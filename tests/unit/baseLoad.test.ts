import { describe, it, expect } from 'vitest'
import { baseLoadShare, calcBaseLoad } from '@/features/measurements/base_load/baseLoad'
import { stats } from '@/features/monitoring/readings'
import type { MeterReading } from '@/store/readingsStore'

/** Ablesungen als (Datum, Zählerstand)-Paare. */
function readings(...pairs: [string, number][]): MeterReading[] {
  return pairs.map(([date, value], i) => ({ id: String(i), date, value }))
}

describe('baseLoadShare', () => {
  it('setzt die Grundlast ins Verhältnis zum gemessenen Jahresverbrauch', () => {
    // 3000 kWh über volle 365 Tage.
    const s = stats(readings(['2024-01-01', 0], ['2024-12-31', 3000]))
    // 100 W Grundlast ≈ 876 kWh/Jahr → knapp 29 %.
    const share = baseLoadShare(calcBaseLoad(100, 30).annualKwh, s)
    expect(share).toBeDefined()
    expect(share!.share).toBeCloseTo(876 / 3000, 2)
    expect(share!.totalYearKwh).toBe(3000)
    expect(share!.implausible).toBe(false)
  })

  it('meldet einen unmöglich hohen Anteil als unplausibel', () => {
    // Sparsamer Haushalt, 800 kWh/Jahr – gegen eine Grundlast von 300 W (2628 kWh).
    const s = stats(readings(['2024-01-01', 0], ['2024-12-31', 800]))
    const share = baseLoadShare(calcBaseLoad(300, 30).annualKwh, s)
    expect(share!.share).toBeGreaterThan(1)
    expect(share!.implausible).toBe(true)
  })

  it('liefert undefined ohne belastbare Ableshistorie', () => {
    // Eine einzelne Ablesung ergibt keinen Verbrauch …
    expect(baseLoadShare(876, stats(readings(['2024-01-01', 0])))).toBeUndefined()
    // … und zwei Ablesungen mit wenigen Tagen Abstand werden nicht hochgerechnet.
    expect(
      baseLoadShare(876, stats(readings(['2024-01-01', 0], ['2024-01-05', 40]))),
    ).toBeUndefined()
  })

  it('liefert undefined ohne verwertbare Grundlast', () => {
    const s = stats(readings(['2024-01-01', 0], ['2024-12-31', 3000]))
    expect(baseLoadShare(0, s)).toBeUndefined()
    expect(baseLoadShare(Number.NaN, s)).toBeUndefined()
  })

  it('reicht durch, worauf der Jahreswert beruht', () => {
    const full = baseLoadShare(876, stats(readings(['2024-01-01', 0], ['2024-12-31', 3000])))
    expect(full!.basis).toBe('fullYear')

    // Nur ein Quartal gemessen → linear gestreckt, Anteil bezieht sich darauf.
    const partial = baseLoadShare(876, stats(readings(['2024-01-01', 0], ['2024-04-01', 750])))
    expect(partial!.basis).toBe('linear')
    expect(partial!.measuredDays).toBe(91)
  })
})
