// Wirkungs-Summe der Messungen.
//
// Sie erscheint auf der Messungen-Übersicht und muss dieselbe Zahl nennen wie
// die Empfehlungen: Vorher zeigte sie Beträge, die die Empfehlungen bewusst
// nicht mehr behaupteten – zwei Zahlen für dieselben Daten.

import { describe, expect, it } from 'vitest'
import { displayableSavingEur, impactSummary } from '@/features/measurements/impact'
import { MIN_DISPLAY_EUR } from '@/features/measurements/savingsDisplay'
import type { MeasurementResult } from '@/features/measurements/types'

const NOW = '2026-08-22T08:00:00.000Z'

function result(id: string, details: Record<string, number>): MeasurementResult {
  return { id, rating: 'elevated', primaryValue: 1, unit: '', completedAt: NOW, details }
}

describe('Einzelwert', () => {
  it('schweigt bei einer als Schätzung markierten Ersparnis', () => {
    expect(displayableSavingEur(result('fridge', { yearlySaving: 40, savingEstimated: 1 }))).toBeUndefined()
  })

  it('schweigt unterhalb der Anzeigeschwelle', () => {
    expect(displayableSavingEur(result('fridge', { yearlySaving: MIN_DISPLAY_EUR - 1 }))).toBeUndefined()
  })

  it('nennt einen gemessenen Betrag über der Schwelle', () => {
    expect(displayableSavingEur(result('standby', { avoidableCost: 42 }))).toBe(40)
  })
})

describe('Summe über alle Messungen', () => {
  it('wendet die Schwelle auf die Messung an, nicht auf den einzelnen Raum', () => {
    // Fünf Räume à 8 € liegen einzeln unter der Schwelle, zusammen deutlich
    // darüber – die Beleuchtung als Ganzes zählt.
    const results: Record<string, MeasurementResult> = {}
    for (let i = 0; i < 5; i += 1) {
      results[`lighting@room#${i}`] = result('lighting', { yearlySaving: 8 })
    }
    const { savingsEur, contributing } = impactSummary(results, 35)
    expect(savingsEur).toBe(40)
    expect(contributing).toBe(1)
  })

  it('verwirft eine Messung, sobald ein Teilergebnis geschätzt ist', () => {
    const { savingsEur } = impactSummary(
      {
        'lighting@a': result('lighting', { yearlySaving: 30 }),
        'lighting@b': result('lighting', { yearlySaving: 30, savingEstimated: 1 }),
      },
      35,
    )
    expect(savingsEur).toBe(0)
  })

  it('zählt Messungen getrennt und lässt Kleinbeträge weg', () => {
    const { savingsEur, contributing } = impactSummary(
      {
        standby: result('standby', { avoidableCost: 60 }),
        // Unter der Schwelle: faellt heraus, auch wenn es gemessen ist.
        fridge: result('fridge', { yearlySaving: 6 }),
      },
      35,
    )
    expect(savingsEur).toBe(60)
    expect(contributing).toBe(1)
  })

  it('leitet CO₂ aus der gezeigten Summe ab', () => {
    const { co2Kg } = impactSummary({ standby: result('standby', { avoidableCost: 35 }) }, 35)
    // 35 € / 0,35 €/kWh = 100 kWh × 0,38 kg
    expect(co2Kg).toBeCloseTo(38, 5)
  })

  it('bleibt ohne Ergebnisse bei null', () => {
    expect(impactSummary({}, 35)).toEqual({ savingsEur: 0, co2Kg: 0, contributing: 0 })
  })
})
