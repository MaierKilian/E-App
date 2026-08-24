// Messungs-Karte auf dem Zuhause-Einstieg: was sie zählt und was sie zeigt.
//
// Der Grund für die Karte: Eine Messung ohne Befund erzeugt keine Empfehlung.
// Wer seinen Kühlschrank misst und ihn in Ordnung vorfindet, sah davon auf dem
// Startbildschirm bisher nichts.

import { describe, expect, it } from 'vitest'
import { measurementProgress, recentResults } from '@/features/home/measurementSummary'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import type { MeasurementResult } from '@/features/measurements/types'
import type { RoomEntry } from '@/types'

function result(id: string, completedAt: string, roomKey?: string): MeasurementResult {
  return { id, rating: 'good', primaryValue: 1, unit: '°C', completedAt, roomKey }
}

const AVAILABLE = MEASUREMENT_CATALOG.filter((m) => m.available)
const PER_ROOM = MEASUREMENT_CATALOG.find((m) => m.available && m.perRoom)!
const ROOMS: RoomEntry[] = [
  { type: 'living_room', count: 1, heatTransfer: 'radiator' },
  { type: 'bedroom', count: 1, heatTransfer: 'radiator' },
]

describe('Fortschritt', () => {
  it('zählt nur verfügbare Messungen', () => {
    expect(measurementProgress({}, ROOMS).total).toBe(AVAILABLE.length)
    expect(measurementProgress({}, ROOMS).total).toBeLessThanOrEqual(MEASUREMENT_CATALOG.length)
  })

  it('lässt Pro-Raum-Messungen ohne Räume aus dem Nenner', () => {
    // Ohne Räume ist ein Pro-Raum-Check nicht messbar – im Nenner wäre er ein
    // dauerhaft unerreichbarer Rest.
    const perRoomCount = AVAILABLE.filter((m) => m.perRoom).length
    expect(measurementProgress({}, []).total).toBe(AVAILABLE.length - perRoomCount)
  })

  it('zählt eine Pro-Raum-Messung erst mit dem letzten Raum als erledigt', () => {
    const id = PER_ROOM.id
    const one = measurementProgress({ [`${id}@living_room#0`]: result(id, '2026-08-01') }, ROOMS)
    const two = measurementProgress(
      {
        [`${id}@living_room#0`]: result(id, '2026-08-01'),
        [`${id}@bedroom#0`]: result(id, '2026-08-02'),
      },
      ROOMS,
    )
    expect(one.done).toBe(0)
    expect(two.done).toBe(1)
  })

  it('lässt als „nichts zu messen" markierte Räume den Fortschritt nicht blockieren', () => {
    const id = PER_ROOM.id
    const progress = measurementProgress(
      { [`${id}@living_room#0`]: result(id, '2026-08-01') },
      ROOMS,
      ['bedroom#0'],
    )
    expect(progress.done).toBe(1)
  })
})

describe('Zuletzt gemessen', () => {
  it('zeigt je Messung nur das jüngste Ergebnis', () => {
    const id = AVAILABLE[0].id
    const recent = recentResults(
      {
        [`${id}@a`]: result(id, '2026-08-01', 'living_room#0'),
        [`${id}@b`]: result(id, '2026-08-09', 'bedroom#0'),
      },
      3,
    )
    expect(recent).toHaveLength(1)
    expect(recent[0].completedAt).toBe('2026-08-09')
  })

  it('sortiert das Neueste nach vorn und hält das Limit ein', () => {
    const ids = AVAILABLE.slice(0, 4).map((m) => m.id)
    const results = Object.fromEntries(
      ids.map((id, i) => [id, result(id, `2026-08-0${i + 1}T00:00:00.000Z`)]),
    )
    const recent = recentResults(results, 3)
    expect(recent).toHaveLength(3)
    expect(recent.map((r) => r.id)).toEqual([ids[3], ids[2], ids[1]])
  })

  it('überspringt Ergebnisse ohne Katalog-Eintrag', () => {
    // Altdaten einer entfernten Messung hätten weder Titel noch Sprungziel.
    expect(recentResults({ ghost: result('ghost', '2026-08-09') }, 3)).toEqual([])
  })

  it('kommt ohne Ergebnisse ohne Fehler aus', () => {
    expect(recentResults({}, 3)).toEqual([])
    expect(measurementProgress({}, ROOMS).done).toBe(0)
  })
})
