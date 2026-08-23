// Datums-Achse der Verlaufs-Diagramme: echte Zeitabstände, aber nie so eng,
// dass zwei Ablesungen aufeinanderfallen.

import { describe, expect, it } from 'vitest'
import { isoToTime, timeAxisPositions } from '@/lib/timeAxis'

const at = (...iso: string[]) => iso.map(isoToTime)
/** Abstände zwischen benachbarten Positionen. */
const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i])

describe('timeAxisPositions', () => {
  it('spannt die volle Breite auf', () => {
    const xs = timeAxisPositions(at('2026-01-01', '2026-02-01', '2026-03-01'), 300, 0)
    expect(xs[0]).toBe(0)
    expect(xs[xs.length - 1]).toBe(300)
  })

  it('gibt längeren Zeiträumen mehr Platz als kürzeren', () => {
    // 10 Tage, dann 90 Tage – der zweite Abschnitt muss deutlich breiter sein.
    const xs = timeAxisPositions(at('2026-01-01', '2026-01-11', '2026-04-11'), 300, 0)
    const [short, long] = gaps(xs)
    expect(long).toBeGreaterThan(short)
    // Ohne Mindestabstand exakt proportional: 10 zu 90 Tage.
    expect(short).toBeCloseTo(30, 6)
    expect(long).toBeCloseTo(270, 6)
  })

  it('hält den Mindestabstand ein, auch wenn zwei Ablesungen fast zusammenfallen', () => {
    // Zwei Ablesungen an aufeinanderfolgenden Tagen, dann ein Jahr Pause.
    const xs = timeAxisPositions(at('2026-01-01', '2026-01-02', '2027-01-01'), 300, 11)
    for (const g of gaps(xs)) expect(g).toBeGreaterThanOrEqual(11)
  })

  it('behält die Reihenfolge der Abstände trotz Mindestabstand', () => {
    const xs = timeAxisPositions(at('2026-01-01', '2026-01-08', '2026-01-22', '2026-03-22'), 300, 11)
    const [g7, g14, g59] = gaps(xs)
    expect(g14).toBeGreaterThan(g7)
    expect(g59).toBeGreaterThan(g14)
  })

  it('verteilt gleichmäßig, wenn der Mindestabstand nicht mehr hineinpasst', () => {
    // 40 Punkte à 11 pt bräuchten 429 pt – vorhanden sind 100.
    const times = Array.from({ length: 40 }, (_, i) => isoToTime('2026-01-01') + i * 86400000)
    const xs = timeAxisPositions(times, 100, 11)
    for (const g of gaps(xs)) expect(g).toBeCloseTo(100 / 39, 6)
  })

  it('verteilt gleichmäßig, wenn alle Ablesungen vom selben Tag sind', () => {
    const xs = timeAxisPositions(at('2026-01-01', '2026-01-01', '2026-01-01'), 300, 11)
    expect(xs).toEqual([0, 150, 300])
  })

  it('verteilt gleichmäßig, wenn ein Datum unlesbar ist', () => {
    const xs = timeAxisPositions([isoToTime('2026-01-01'), Number.NaN, isoToTime('2026-06-01')], 300, 11)
    expect(xs).toEqual([0, 150, 300])
  })

  it('setzt einen einzelnen Punkt in die Mitte und kommt mit leer klar', () => {
    expect(timeAxisPositions(at('2026-01-01'), 300, 11)).toEqual([150])
    expect(timeAxisPositions([], 300, 11)).toEqual([])
  })
})
