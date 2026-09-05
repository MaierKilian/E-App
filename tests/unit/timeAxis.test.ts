// Datums-Achse der Verlaufs-Diagramme: echte Zeitabstände, aber nie so eng,
// dass zwei Ablesungen aufeinanderfallen.

import { describe, expect, it } from 'vitest'
import { isoToTime, offsetForTime, timeAxisPositions } from '@/lib/timeAxis'

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

// Die Umkehrung: Wo auf derselben Achse liegt ein beliebiger Tag? Sie trägt das
// Heizperioden-Band hinter dem Verlaufsdiagramm – läge es nicht auf derselben
// (nicht zeit-proportionalen) Achse wie die Punkte, säßen seine Kanten neben
// der Linie, die sie einordnen sollen.
describe('offsetForTime', () => {
  it('trifft die Stützpunkte genau', () => {
    const times = at('2026-01-01', '2026-02-01', '2026-06-01')
    const xs = timeAxisPositions(times, 300, 0)
    times.forEach((t, i) => expect(offsetForTime(times, xs, t)).toBeCloseTo(xs[i], 6))
  })

  it('interpoliert zwischen zwei Ablesungen, nicht über die Gesamtspanne', () => {
    // Die Achse ist verzerrt (Mindestabstand vor Zeitanteil). Der Mittelpunkt
    // eines Abschnitts muss deshalb in der Mitte **dieses Abschnitts** liegen,
    // nicht bei der Hälfte der Gesamtzeit.
    const times = at('2026-01-01', '2026-01-11', '2026-04-11')
    const xs = timeAxisPositions(times, 300, 20)
    const mitte = (times[0] + times[1]) / 2
    expect(offsetForTime(times, xs, mitte)).toBeCloseTo((xs[0] + xs[1]) / 2, 6)
  })

  it('klemmt Zeitpunkte außerhalb der Messspanne auf den Rand', () => {
    // Eine Heizperiode, die vor der ersten Ablesung begann, soll den Rand
    // ausfüllen statt zu verschwinden.
    const times = at('2026-01-01', '2026-06-01')
    const xs = timeAxisPositions(times, 300, 0)
    expect(offsetForTime(times, xs, isoToTime('2020-01-01'))).toBe(xs[0])
    expect(offsetForTime(times, xs, isoToTime('2030-01-01'))).toBe(xs[1])
  })

  it('gibt bei unbrauchbarer Eingabe nichts zurück', () => {
    const times = at('2026-01-01', '2026-06-01')
    const xs = timeAxisPositions(times, 300, 0)
    expect(offsetForTime([], [], isoToTime('2026-01-01'))).toBeUndefined()
    expect(offsetForTime(times, xs, Number.NaN)).toBeUndefined()
    expect(offsetForTime([isoToTime('2026-01-01'), Number.NaN], xs, 0)).toBeUndefined()
    // Nicht zusammenpassende Längen sind ein Programmierfehler, kein Randfall.
    expect(offsetForTime(times, [0], isoToTime('2026-03-01'))).toBeUndefined()
  })

  it('kommt mit mehreren Ablesungen am selben Tag klar', () => {
    const times = at('2026-01-01', '2026-01-01', '2026-06-01')
    const xs = timeAxisPositions(times, 300, 0)
    expect(offsetForTime(times, xs, isoToTime('2026-01-01'))).toBe(xs[0])
  })
})
