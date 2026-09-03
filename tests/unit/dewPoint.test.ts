// Taupunkt und Kellerklima.
//
// Schimmel entsteht nicht bei einer Prozentzahl, sondern wenn feuchte Luft auf
// eine Fläche trifft, die kälter ist als ihr Taupunkt. Ein Keller mit 65 % bei
// 16 °C ist unauffällig; dieselbe Wand wird gefährlich, wenn im Sommer warme
// Außenluft hereinkommt. Genau das rechnet dieses Modul.
//
// Die Vergleichswerte sind mit der Magnus-Formel von Hand nachgerechnet
// (Sonntag 1990, a = 17.62, b = 243.12 °C) und decken sich mit gängigen
// Taupunkt-Tabellen.

import { describe, expect, it } from 'vitest'
import {
  ASSUMED_BASEMENT_WALL_C,
  condensationRisk,
  dewPoint,
} from '@/features/measurements/room_temperature/dewPoint'

describe('Taupunkt', () => {
  it('trifft von Hand nachgerechnete Werte', () => {
    expect(dewPoint(20, 50)!).toBeCloseTo(9.26, 1)
    expect(dewPoint(16, 65)!).toBeCloseTo(9.42, 1)
    expect(dewPoint(20, 70)!).toBeCloseTo(14.36, 1)
    expect(dewPoint(25, 60)!).toBeCloseTo(16.69, 1)
    expect(dewPoint(30, 30)!).toBeCloseTo(10.53, 1)
  })

  it('kennt auch Minusgrade', () => {
    expect(dewPoint(0, 50)!).toBeCloseTo(-9.2, 1)
  })

  it('liefert bei 100 % die Lufttemperatur selbst', () => {
    // Gesättigte Luft kondensiert sofort – Taupunkt = Temperatur.
    expect(dewPoint(20, 100)!).toBeCloseTo(20, 3)
  })

  it('liegt nie über der Lufttemperatur', () => {
    for (const t of [-5, 0, 10, 16, 20, 30]) {
      for (const rh of [1, 20, 50, 80, 99.9]) {
        expect(dewPoint(t, rh)!).toBeLessThanOrEqual(t + 1e-9)
      }
    }
  })

  it('weist unbrauchbare Eingaben zurück, statt Unsinn zu rechnen', () => {
    // 0 % hat keinen Taupunkt (der Logarithmus divergiert) – das ist kein
    // Messwert, sondern ein defektes Hygrometer.
    expect(dewPoint(20, 0)).toBeUndefined()
    expect(dewPoint(20, 101)).toBeUndefined()
    expect(dewPoint(20, -5)).toBeUndefined()
    expect(dewPoint(NaN, 50)).toBeUndefined()
    expect(dewPoint(20, NaN)).toBeUndefined()
  })
})

describe('Kondensat an der Kellerwand', () => {
  it('warnt bei warmer Sommerluft im Keller', () => {
    // 20 °C und 70 % → Taupunkt 14,4 °C, über der 12 °C kalten Wand.
    expect(condensationRisk(20, 70)).toBe(true)
  })

  it('warnt nicht bei kühler Kellerluft, auch wenn sie feucht ist', () => {
    // 16 °C und 65 % → Taupunkt 9,4 °C, deutlich unter der Wand. Genau der
    // Fall, den die alte Prozent-Bewertung als „zu feucht" meldete.
    expect(condensationRisk(16, 65)).toBe(false)
  })

  it('nimmt die Wandtemperatur als Grenze, nicht die Luftfeuchte', () => {
    // Dieselbe Luft, zwei Wände: 20 °C/70 % (Taupunkt 14,4 °C) ist an einer
    // 20 °C warmen Wand harmlos und an einer 12 °C kalten gefährlich.
    expect(condensationRisk(20, 70, 20)).toBe(false)
    expect(condensationRisk(20, 70, 12)).toBe(true)
    // 16 °C/50 % → Taupunkt 5,6 °C: an einer 5 °C kalten Wand noch kritisch.
    expect(condensationRisk(16, 50, 5)).toBe(true)
    expect(condensationRisk(16, 50, 6)).toBe(false)
    expect(ASSUMED_BASEMENT_WALL_C).toBe(12)
  })

  it('warnt nicht bei unbrauchbarer Eingabe', () => {
    expect(condensationRisk(20, 0)).toBe(false)
  })
})
