// Fortschrittszahlen der Messungen – eine Rechnung für alle Ansichten.
//
// Der Anlass: Der Ring im Messungen-Kopf zeigte „9/9", während die Gewerke-
// Kacheln darunter „Heizung 0/2" und „Warmwasser 1/2" meldeten. Ursache war,
// dass die Kacheln stumpf `results[id]` nachschlugen – Ergebnisse mit Raum-
// oder Entnahmestellen-Schlüssel (`room_temperature@bedroom#0`,
// `hot_water_wait@shower`) fanden sie damit nie.
//
// Diese Tests halten fest, dass Ring, Zuhause-Karte, Gewerke- und Raum-Ansicht
// dieselbe Quelle benutzen und deshalb nicht mehr auseinanderlaufen können.

import { describe, expect, it } from 'vitest'
import {
  catalogProgress,
  countableMeasurements,
  countingRooms,
  isMeasurementDone,
  measurementProgress,
} from '@/features/measurements/progress'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { buildSteps } from '@/features/measurements/tasks'
import { instanceKey } from '@/features/measurements/rooms'
import type { MeasurementResult } from '@/features/measurements/types'
import type { RoomEntry } from '@/types'

const t = ((key: string) => key) as never

const ROOMS: RoomEntry[] = [
  { type: 'living_room', count: 1, heatTransfer: 'radiator' },
  { type: 'bedroom', count: 2, heatTransfer: 'radiator' },
  { type: 'bathroom', count: 1, heatTransfer: 'radiator' },
  { type: 'kitchen', count: 1, heatTransfer: 'radiator' },
]

function result(id: string, roomKey?: string): MeasurementResult {
  return {
    id,
    rating: 'good',
    primaryValue: 1,
    unit: '°C',
    completedAt: '2026-08-01T00:00:00.000Z',
    roomKey,
  }
}

/** Alles gemessen: jede verfügbare Messung, Pro-Raum-Checks in jedem Raum. */
function allMeasured(rooms: RoomEntry[] = ROOMS): Record<string, MeasurementResult> {
  const instances = countingRooms(rooms)
  const out: Record<string, MeasurementResult> = {}
  for (const meta of MEASUREMENT_CATALOG) {
    if (!meta.available) continue
    if (meta.perRoom) {
      for (const inst of instances) out[instanceKey(meta.id, inst.key)] = result(meta.id, inst.key)
    } else {
      out[meta.id] = result(meta.id)
    }
  }
  return out
}

describe('Katalog-Fortschritt', () => {
  it('erreicht mit allen Messungen den Nenner', () => {
    const p = catalogProgress(allMeasured(), ROOMS)
    expect(p.done).toBe(p.total)
    expect(p.total).toBe(MEASUREMENT_CATALOG.filter((m) => m.available).length)
  })

  it('findet Ergebnisse mit Entnahmestellen-Schlüssel', () => {
    // Der Warmwasser-Check legt die Entnahmestelle als `roomKey` ab; das
    // Ergebnis liegt also unter "hot_water_wait@shower", nicht unter
    // "hot_water_wait". Genau das übersahen die Kacheln vorher.
    const meta = MEASUREMENT_CATALOG.find((m) => m.id === 'hot_water_wait')!
    const results = { 'hot_water_wait@shower': result('hot_water_wait', 'shower') }
    expect(isMeasurementDone(results, meta, countingRooms(ROOMS))).toBe(true)
  })

  it('zählt einen Pro-Raum-Check erst mit dem letzten Raum', () => {
    const meta = MEASUREMENT_CATALOG.find((m) => m.available && m.perRoom)!
    const instances = countingRooms(ROOMS)
    const partial = Object.fromEntries(
      instances.slice(0, 2).map((inst) => [instanceKey(meta.id, inst.key), result(meta.id, inst.key)]),
    )
    expect(measurementProgress(partial, meta, instances)).toEqual({
      done: 2,
      total: instances.length,
    })
    expect(isMeasurementDone(partial, meta, instances)).toBe(false)
  })

  it('nimmt als „nichts zu messen" markierte Räume aus Zähler und Nenner', () => {
    const skipped = ['bedroom#1']
    expect(countingRooms(ROOMS, skipped)).toHaveLength(countingRooms(ROOMS).length - 1)
    // Alles außer dem ausgenommenen Raum gemessen → trotzdem vollständig.
    const results = allMeasured()
    for (const meta of MEASUREMENT_CATALOG) {
      if (meta.perRoom) delete results[instanceKey(meta.id, 'bedroom#1')]
    }
    const p = catalogProgress(results, ROOMS, skipped)
    expect(p.done).toBe(p.total)
  })

  it('lässt Pro-Raum-Checks ohne Räume ganz aus', () => {
    const withoutRooms = countableMeasurements(countingRooms([]))
    expect(withoutRooms.some((m) => m.perRoom)).toBe(false)
    const p = catalogProgress({}, [])
    expect(p.total).toBe(withoutRooms.length)
  })
})

describe('Gleichlauf der Ansichten', () => {
  /**
   * Der eigentliche Punkt: Was die „Empfohlen"-Liste als erledigt abhakt, muss
   * der Ring darüber zählen – und die Summe der Gewerke-Kacheln muss dieselbe
   * Zahl ergeben, weil eine Gewerke-Kachel für die Messung im Ganzen steht.
   */
  const CASES: { name: string; results: Record<string, MeasurementResult>; skipped: string[] }[] = [
    { name: 'nichts gemessen', results: {}, skipped: [] },
    { name: 'alles gemessen', results: allMeasured(), skipped: [] },
    {
      name: 'nur Entnahmestelle und ein Raum',
      results: {
        'hot_water_wait@shower': result('hot_water_wait', 'shower'),
        'room_temperature@bedroom#0': result('room_temperature', 'bedroom#0'),
      },
      skipped: [],
    },
    { name: 'mit ausgenommenem Raum', results: allMeasured(), skipped: ['bedroom#1'] },
  ]

  for (const c of CASES) {
    it(`Ring, Schrittliste und Gewerke stimmen überein – ${c.name}`, () => {
      const ring = catalogProgress(c.results, ROOMS, c.skipped)
      const steps = buildSteps(ROOMS, c.results, t, c.skipped)

      expect(steps.filter((s) => s.done).length).toBe(ring.done)
      expect(steps.length).toBe(ring.total)

      // Gewerke-Ansicht: je Kategorie die Messungen im Ganzen.
      const instances = countingRooms(ROOMS, c.skipped)
      const tilesDone = countableMeasurements(instances).filter((meta) =>
        isMeasurementDone(c.results, meta, instances),
      ).length
      expect(tilesDone).toBe(ring.done)
    })
  }
})

describe('Übersprungene Checks fallen aus Zähler und Nenner', () => {
  /**
   * Der Anlass: Ein Haushalt ohne Gefriergerät bekam einen Check, den er nie
   * abschließen konnte – und der seit der Vereinheitlichung der Zählung den
   * Ring dauerhaft bei 8 von 9 festhielt. Eine Zahl, die einen Rückstand
   * behauptet, den es nicht gibt.
   */
  it('nimmt den Check aus dem Nenner, nicht nur aus dem Zähler', () => {
    const instances = countingRooms(ROOMS)
    const alle = countableMeasurements(instances)
    const ohne = countableMeasurements(instances, ['freezer'])
    expect(ohne).toHaveLength(alle.length - 1)
    expect(ohne.some((m) => m.id === 'freezer')).toBe(false)
  })

  it('lässt denselben Nenner-Wert auch im Ring ankommen', () => {
    const voll = catalogProgress({}, ROOMS)
    const ohne = catalogProgress({}, ROOMS, ['freezer'])
    expect(ohne.total).toBe(voll.total - 1)
  })

  it('erreicht ohne Gefriergerät 100 %', () => {
    const instances = countingRooms(ROOMS)
    const results: Record<string, MeasurementResult> = {}
    for (const meta of countableMeasurements(instances, ['freezer'])) {
      if (meta.perRoom) {
        for (const inst of instances) results[instanceKey(meta.id, inst.key)] = result(meta.id, inst.key)
      } else {
        results[meta.id] = result(meta.id)
      }
    }
    const { done, total } = catalogProgress(results, ROOMS, ['freezer'])
    expect(done).toBe(total)
  })

  it('filtert Räume und Checks aus derselben Liste', () => {
    // Raum-Schlüssel und Mess-Schlüssel können nie kollidieren – deshalb genügt
    // eine Liste für beides.
    const mixed = ['bedroom#1', 'freezer']
    expect(countingRooms(ROOMS, mixed).some((i) => i.key === 'bedroom#1')).toBe(false)
    expect(countableMeasurements(countingRooms(ROOMS, mixed), mixed).some((m) => m.id === 'freezer')).toBe(
      false,
    )
  })

  it('lässt den übersprungenen Check auch aus der Schrittliste fallen', () => {
    const ids = buildSteps(ROOMS, {}, t, ['freezer']).map((s) => s.meta.id)
    expect(ids).not.toContain('freezer')
    expect(ids).toContain('fridge')
  })
})
