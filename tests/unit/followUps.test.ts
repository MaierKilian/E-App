// Folgemessungen: der Gefrier-Check meldet sich ein halbes Jahr nach dem
// abgehakten Abtauen erneut.

import { describe, expect, it } from 'vitest'
import {
  pendingFollowUpKeys,
  DEFROST_RECHECK_DAYS,
} from '@/features/measurements/followUps'
import type { ApplianceEntry } from '@/types'
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
) => pendingFollowUpKeys(results, NOW, doneAt ? { freezer: doneAt } : {}).has('freezer')

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

// Ab Etappe 12c gilt der Abtau-Zeitstempel je Gerät: Die Truhe im Keller kann
// wieder dran sein, während das Gefrierfach in der Küche es nicht ist. Ein
// gemeinsamer Zeitstempel für vier Geräte wäre falsch.
describe('Folgemessungen je Gerät', () => {
  const truhe = { id: 'freezer-keller', kind: 'freezer' } as ApplianceEntry
  const fach = { id: 'freezer-kueche', kind: 'freezer' } as ApplianceEntry
  const laengstFaellig = daysAgo(DEFROST_RECHECK_DAYS + 10)

  it('meldet nur das Gerät, dessen Abtauen lange her ist', () => {
    const keys = pendingFollowUpKeys(
      {},
      NOW,
      { 'freezer@freezer-keller': laengstFaellig, 'freezer@freezer-kueche': daysAgo(3) },
      [truhe, fach],
    )
    expect(keys.has('freezer@freezer-keller')).toBe(true)
    expect(keys.has('freezer@freezer-kueche')).toBe(false)
  })

  it('lässt einem Bestandsnutzer seine Abtau-Erinnerung', () => {
    // Sein Ergebnis und sein abgehakter Tipp liegen beide unter `freezer`.
    // Ohne die Rückfallkette fiele die Erinnerung ersatzlos weg.
    const keys = pendingFollowUpKeys(
      { freezer: freezerResult(daysAgo(400)) },
      NOW,
      { freezer: laengstFaellig },
      [truhe],
    )
    expect(keys.has('freezer')).toBe(true)
  })

  it('meldet den Kühlschrank je Gerät, nicht je Check', () => {
    const kalt = { id: 'fridge-a', kind: 'fridge' } as ApplianceEntry
    const gut = { id: 'fridge-b', kind: 'fridge' } as ApplianceEntry
    const keys = pendingFollowUpKeys(
      {
        'fridge@fridge-a': { ...freezerResult(daysAgo(5)), id: 'fridge', rating: 'high' },
        'fridge@fridge-b': { ...freezerResult(daysAgo(5)), id: 'fridge', rating: 'good' },
      },
      NOW,
      {},
      [kalt, gut],
    )
    expect(keys.has('fridge@fridge-a')).toBe(true)
    expect(keys.has('fridge@fridge-b')).toBe(false)
  })

  it('verhält sich ohne Geräteangabe wie vorher', () => {
    const keys = pendingFollowUpKeys(
      { fridge: { ...freezerResult(daysAgo(5)), id: 'fridge', rating: 'high' } },
      NOW,
      {},
      [],
    )
    expect(keys.has('fridge')).toBe(true)
  })
})
