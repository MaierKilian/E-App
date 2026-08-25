// Wiedererkennung von Standby-Geräten: Dubletten in der Liste und Geräte, die
// in einer früheren Messung schon vorkamen.

import { describe, expect, it } from 'vitest'
import {
  duplicateIndices,
  normalizeDeviceName,
  previouslyMeasured,
} from '@/features/measurements/standby/deviceHistory'
import type { MeasurementResult } from '@/features/measurements/types'

/** Ergebnis im aktuellen Format: `dev{i}` in details, Name in labels. */
const LAST_RESULT: MeasurementResult = {
  id: 'standby',
  rating: 'medium',
  primaryValue: 40,
  unit: '€/Jahr',
  completedAt: '2026-08-01T10:00:00.000Z',
  details: { dev0: 12.5, dev1: 3, totalWatts: 15.5 },
  labels: { dev0: 'Fernseher Wohnzimmer', dev1: 'Router' },
}

describe('normalizeDeviceName', () => {
  it('ignoriert Groß-/Kleinschreibung und Leerraum', () => {
    expect(normalizeDeviceName('  Fernseher  ')).toBe('fernseher')
    expect(normalizeDeviceName('Fernseher   Schlafzimmer')).toBe('fernseher schlafzimmer')
  })

  it('liefert für einen leeren Namen einen leeren Schlüssel', () => {
    expect(normalizeDeviceName('   ')).toBe('')
  })
})

describe('previouslyMeasured', () => {
  it('findet ein Gerät aus der letzten Messung', () => {
    expect(previouslyMeasured(LAST_RESULT, 'Fernseher Wohnzimmer')).toBe(12.5)
  })

  it('erkennt es auch bei abweichender Schreibweise', () => {
    expect(previouslyMeasured(LAST_RESULT, '  fernseher   wohnzimmer ')).toBe(12.5)
  })

  it('meldet nichts für ein unbekanntes Gerät', () => {
    expect(previouslyMeasured(LAST_RESULT, 'Spielkonsole')).toBeUndefined()
  })

  it('meldet nichts ohne Namen oder ohne frühere Messung', () => {
    expect(previouslyMeasured(LAST_RESULT, '  ')).toBeUndefined()
    expect(previouslyMeasured(undefined, 'Router')).toBeUndefined()
  })

  it('meldet nichts bei einem Altergebnis ohne labels', () => {
    const legacy = { ...LAST_RESULT, labels: undefined, details: { dev0_tv: 12.5 } }
    expect(previouslyMeasured(legacy, 'Fernseher Wohnzimmer')).toBeUndefined()
  })
})

describe('duplicateIndices', () => {
  it('markiert nur den späteren der beiden Einträge', () => {
    const dupes = duplicateIndices(['Fernseher', 'Router', 'Fernseher'])
    expect([...dupes]).toEqual([2])
  })

  it('vergleicht unabhängig von Schreibweise', () => {
    expect([...duplicateIndices(['Router', ' router '])]).toEqual([1])
  })

  it('behandelt leere Namen nicht als Dubletten', () => {
    // Namenlose Geräte sind erlaubt und werden durchnummeriert.
    expect([...duplicateIndices(['', '', 'TV'])]).toEqual([])
  })
})
