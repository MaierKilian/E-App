import { describe, it, expect } from 'vitest'
import { remeasurePrompt } from '@/features/measurements/base_load/remeasure'
import type { MeasurementId, MeasurementResult } from '@/features/measurements/types'

const NOW = Date.parse('2026-08-23T12:00:00Z')
const DAY = 86_400_000

/** Ergebnis mit Zeitpunkt „vor n Tagen". */
function result(id: MeasurementId, daysAgo: number): MeasurementResult {
  return {
    id,
    rating: 'medium',
    primaryValue: 1,
    unit: 'W',
    completedAt: new Date(NOW - daysAgo * DAY).toISOString(),
  }
}

describe('remeasurePrompt', () => {
  it('stößt zum Nachmessen an, wenn nach der Grundlast gehandelt wurde', () => {
    const p = remeasurePrompt(
      { base_load: result('base_load', 20), standby: result('standby', 5) },
      NOW,
    )
    expect(p).toEqual({ trigger: 'standby', daysSince: 5 })
  })

  it('wartet, bis der Nutzer Zeit zum Handeln hatte', () => {
    const p = remeasurePrompt(
      { base_load: result('base_load', 20), standby: result('standby', 1) },
      NOW,
    )
    expect(p).toBeUndefined()
  })

  it('verstummt, sobald neu gemessen wurde', () => {
    // Die Grundlast ist jetzt die juengste Messung – der Vergleich liegt vor.
    const p = remeasurePrompt(
      { base_load: result('base_load', 2), standby: result('standby', 10) },
      NOW,
    )
    expect(p).toBeUndefined()
  })

  it('ignoriert Messungen, die die Grundlast gar nicht senken', () => {
    // Duschkopf und LED-Check schlagen sich in der Grundlast nicht nieder.
    const p = remeasurePrompt(
      {
        base_load: result('base_load', 20),
        showerhead: result('showerhead', 5),
        lighting: result('lighting', 4),
      },
      NOW,
    )
    expect(p).toBeUndefined()
  })

  it('nimmt die juengste ausloesende Messung', () => {
    const p = remeasurePrompt(
      {
        base_load: result('base_load', 30),
        standby: result('standby', 12),
        'fridge@kitchen#0': result('fridge', 4),
      },
      NOW,
    )
    expect(p).toEqual({ trigger: 'fridge', daysSince: 4 })
  })

  it('schweigt ohne Grundlast-Messung', () => {
    expect(remeasurePrompt({ standby: result('standby', 5) }, NOW)).toBeUndefined()
    expect(remeasurePrompt({}, NOW)).toBeUndefined()
  })
})
