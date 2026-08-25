// Folgemessungen: der Gefrier-Check meldet sich ein halbes Jahr nach dem
// abgehakten Abtauen erneut.

import { describe, expect, it } from 'vitest'
import {
  pendingFollowUpKeys,
  DEFROST_RECHECK_DAYS,
} from '@/features/measurements/followUps'
import type { MeasurementResult } from '@/features/measurements/types'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-08-25T12:00:00.000Z')
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString()

function freezerResult(completedAt: string): MeasurementResult {
  return {
    id: 'freezer',
    rating: 'high',
    primaryValue: 30,
    unit: '%',
    completedAt,
    details: { iced: 1, frostStage: 3 },
  }
}

/** Nur der Gefrier-Schlüssel; die übrigen Folgemessungen prüft ihr eigener Test. */
const freezerDue = (
  results: Record<string, MeasurementResult>,
  doneAt: string | undefined,
) => pendingFollowUpKeys(results, NOW, doneAt).has('freezer')

describe('Gefrier-Check – Erinnerung nach dem Abtauen', () => {
  it('meldet sich ein halbes Jahr nach dem abgehakten Abtauen', () => {
    const results = { freezer: freezerResult(daysAgo(DEFROST_RECHECK_DAYS + 30)) }
    expect(freezerDue(results, daysAgo(DEFROST_RECHECK_DAYS + 1))).toBe(true)
  })

  it('schweigt, solange das halbe Jahr nicht um ist', () => {
    // Direkt nach dem Abtauen ist die Truhe erwartbar eisfrei – eine Messung
    // am nächsten Tag bestätigt nur die eigene Arbeit.
    const results = { freezer: freezerResult(daysAgo(200)) }
    expect(freezerDue(results, daysAgo(10))).toBe(false)
    expect(freezerDue(results, daysAgo(DEFROST_RECHECK_DAYS - 1))).toBe(false)
  })

  it('schweigt, wenn das Abtauen nie abgehakt wurde', () => {
    const results = { freezer: freezerResult(daysAgo(400)) }
    expect(freezerDue(results, undefined)).toBe(false)
  })

  it('räumt sich nach einer neuen Messung selbst ab', () => {
    // Seit dem Abhaken wurde erneut gemessen – der Anlass ist erledigt.
    const doneAt = daysAgo(DEFROST_RECHECK_DAYS + 10)
    const results = { freezer: freezerResult(daysAgo(3)) }
    expect(freezerDue(results, doneAt)).toBe(false)
  })

  it('meldet sich auch ohne jede Gefrier-Messung', () => {
    // Abgehakt, halbes Jahr vorbei, nie gemessen: Der Anlass besteht.
    expect(freezerDue({}, daysAgo(DEFROST_RECHECK_DAYS + 5))).toBe(true)
  })

  it('ignoriert einen unbrauchbaren Zeitpunkt', () => {
    expect(freezerDue({}, 'irgendwann')).toBe(false)
  })
})
