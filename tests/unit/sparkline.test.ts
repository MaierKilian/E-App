// Abstände in der kleinen Verlaufskachel der Monitoring-Übersicht.
//
// Das große Diagramm und der PDF-Verlauf nutzen seit `02a1f01` eine echte
// Datumsachse, die Kachel bis September 2026 nicht: Sie rechnete mit festem
// Schritt, eine Ablesung nach einer Woche und eine nach drei Monaten standen
// dort gleich weit auseinander.

import { describe, expect, it } from 'vitest'
import { sparklineOffsets } from '@/features/monitoring/sparklineGeometry'

/** Abstände zwischen benachbarten Positionen. */
const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i])

describe('sparklineOffsets', () => {
  it('gibt dem längeren Zeitraum mehr Platz', () => {
    // Eine Woche, dann drei Monate – genau der gemeldete Fall.
    const [kurz, lang] = gaps(sparklineOffsets(3, ['2026-01-01', '2026-01-08', '2026-04-08']))
    expect(lang).toBeGreaterThan(kurz * 3)
  })

  it('steht ohne Daten gleichmäßig – die Beispielkurve hat keine', () => {
    const xs = sparklineOffsets(4)
    const [a, b, c] = gaps(xs)
    expect(b).toBeCloseTo(a)
    expect(c).toBeCloseTo(a)
  })

  it('ignoriert eine Datumsliste, die nicht zu den Werten passt', () => {
    const xs = sparklineOffsets(3, ['2026-01-01', '2026-04-08'])
    expect(gaps(xs)[0]).toBeCloseTo(gaps(xs)[1])
  })

  it('nutzt die volle Breite und beginnt am linken Rand', () => {
    const xs = sparklineOffsets(3, ['2026-01-01', '2026-01-08', '2026-04-08'])
    expect(xs[0]).toBe(0)
    expect(xs[xs.length - 1]).toBe(94)
  })

  it('lässt zwei Ablesungen am selben Tag nicht verschmelzen', () => {
    const xs = sparklineOffsets(3, ['2026-01-01', '2026-01-01', '2026-04-08'])
    expect(gaps(xs)[0]).toBeGreaterThan(0)
  })

  it('zeichnet unter zwei Punkten keine Kurve', () => {
    expect(sparklineOffsets(1, ['2026-01-01'])).toEqual([])
    expect(sparklineOffsets(0)).toEqual([])
  })
})
