// Euro-Beträge im Messungen-Bericht.
//
// Der Bericht ist das Dokument, das jemand einem Dritten vorlegt – dort darf
// keine Zahl stehen, die die App selbst nicht mehr behauptet. Die Tests halten
// die drei Wege fest, auf denen das schiefging:
//
//  • Ein Check schafft seine Euro-Rechnung ab, ein altes Ergebnis trägt den
//    Betrag aber weiter (Ergebnisse werden nie migriert, siehe CLAUDE.md).
//  • Eine als Schätzung markierte Ersparnis verlor im Bericht ihren Vorbehalt.
//  • Die Ersparnis verdrängte den Messwert aus der Kopfzeile der Karte.

import { describe, expect, it } from 'vitest'
import { buildMeasurementsReportData } from '@/features/reports/measurementsReportData'
import type { MeasurementResult } from '@/features/measurements/types'
import type { RoomEntry } from '@/types'

const NOW = '2026-08-25T08:00:00.000Z'

function result(
  id: string,
  primaryValue: number,
  unit: string,
  details?: Record<string, number>,
): MeasurementResult {
  return { id, rating: 'good', primaryValue, unit, completedAt: NOW, details }
}

const ROOMS: RoomEntry[] = [{ type: 'bedroom', count: 1 }]

function entryOf(results: Record<string, MeasurementResult>, id: string) {
  const data = buildMeasurementsReportData({ results, rooms: ROOMS })
  return data.entries.find((e) => e.id === id)
}

describe('Geister-Beträge aus Altergebnissen', () => {
  it('zeigt beim LED-Check kein Sparpotenzial, auch wenn eines gespeichert ist', () => {
    // Genau der Fall aus dem Bericht: „0 Räume · Sehr gut · Sparpotenzial 45 €".
    // Der LED-Check rechnet bewusst keinen Euro-Betrag mehr; der Wert stammt
    // aus einer früheren Version und steht bis heute im localStorage.
    const entry = entryOf(
      { lighting: result('lighting', 0, 'Räume', { openRooms: 0, yearlySaving: 45 }) },
      'lighting',
    )
    expect(entry?.yearlySaving).toBeUndefined()
    expect(entry?.savingRange).toBeUndefined()
  })

  it('lässt einen solchen Betrag auch nicht in die Summe einfließen', () => {
    const data = buildMeasurementsReportData({
      results: { lighting: result('lighting', 0, 'Räume', { yearlySaving: 45 }) },
      rooms: ROOMS,
    })
    expect(data.savingsTotal).toBe(0)
    expect(data.savingsRange).toBeUndefined()
  })

  it('schweigt ebenso bei der Grundlast – sie ist Diagnose, kein Euro-Check', () => {
    const entry = entryOf(
      { base_load: result('base_load', 25, 'W', { avoidableCost: 60 }) },
      'base_load',
    )
    expect(entry?.yearlySaving).toBeUndefined()
  })
})

describe('Als Schätzung markierte Beträge', () => {
  it('erscheinen im Bericht nicht', () => {
    const entry = entryOf(
      {
        'room_temperature@bedroom#0': result('room_temperature', 21, '°C', {
          yearlySaving: 45,
          savingEstimated: 1,
        }),
      },
      'room_temperature',
    )
    expect(entry?.yearlySaving).toBeUndefined()
  })

  it('ein belegbarer Betrag derselben Messung dagegen schon', () => {
    const entry = entryOf(
      {
        'room_temperature@bedroom#0': result('room_temperature', 21, '°C', {
          yearlySaving: 45,
          savingEstimated: 0,
        }),
      },
      'room_temperature',
    )
    expect(entry?.yearlySaving).toBe(45)
  })
})

describe('Hauptwert der Karte', () => {
  it('bleibt die gemessene Größe, auch wenn eine Ersparnis vorliegt', () => {
    // Früher ersetzte die Ersparnis bei Pro-Raum-Messungen den Messwert – der
    // Raumklima-Check zeigte „45 €/Jahr" statt der gemessenen 21 °C und
    // wiederholte dieselbe Zahl im Chip daneben.
    const entry = entryOf(
      {
        'room_temperature@bedroom#0': result('room_temperature', 21, '°C', {
          yearlySaving: 45,
          savingEstimated: 0,
        }),
      },
      'room_temperature',
    )
    expect(entry?.primaryValue).toBe(21)
    expect(entry?.unit).toBe('°C')
  })
})

describe('Spannen statt Punktwerten', () => {
  it('gibt je Eintrag eine Spanne um den Betrag aus', () => {
    const entry = entryOf(
      { standby: result('standby', 30, 'W', { avoidableCost: 50 }) },
      'standby',
    )
    expect(entry?.yearlySaving).toBe(50)
    expect(entry?.savingRange).toEqual({ low: 40, high: 60 })
  })

  it('auch die Summe ist eine Spanne', () => {
    const data = buildMeasurementsReportData({
      results: { standby: result('standby', 30, 'W', { avoidableCost: 50 }) },
      rooms: ROOMS,
    })
    expect(data.savingsTotal).toBe(50)
    expect(data.savingsRange).toEqual({ low: 40, high: 60 })
  })
})
