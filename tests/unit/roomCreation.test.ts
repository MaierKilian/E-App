// Abnahme Etappe 1: Räume entstehen im Check, Instanzen zählen richtig.
import { describe, expect, it, beforeEach } from 'vitest'
import { useOnboardingStore } from '@/store/onboardingStore'
import { roomInstances, instanceKey } from '@/features/measurements/rooms'
import { catalogProgress } from '@/features/measurements/progress'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'

beforeEach(() => {
  useOnboardingStore.setState((s) => ({ data: { ...s.data, rooms: [] } }))
})

describe('addRoom', () => {
  it('legt den ersten Raum an und liefert dessen Instanz-Schlüssel', () => {
    const key = useOnboardingStore.getState().addRoom('bedroom')
    expect(key).toBe('bedroom#0')
    expect(useOnboardingStore.getState().data.rooms).toEqual([{ type: 'bedroom', count: 1 }])
  })

  it('erhöht die Anzahl und zeigt auf die NEUE Instanz', () => {
    useOnboardingStore.getState().addRoom('bedroom')
    const second = useOnboardingStore.getState().addRoom('bedroom')
    expect(second).toBe('bedroom#1')
    const rooms = useOnboardingStore.getState().data.rooms
    expect(rooms).toEqual([{ type: 'bedroom', count: 2 }])
    // Der zurückgegebene Schlüssel muss eine echte Instanz sein.
    expect(roomInstances(rooms).map((r) => r.key)).toContain(second)
  })

  it('legt neue Räume ohne Wärmeübergabe an – "noch nicht beantwortet"', () => {
    useOnboardingStore.getState().addRoom('living_room')
    expect(useOnboardingStore.getState().data.rooms[0].heatTransfer).toBeUndefined()
  })

  it('schreibt die Wärmeübergabe aus dem Check zurück', () => {
    useOnboardingStore.getState().addRoom('living_room')
    useOnboardingStore.getState().setRoomHeatTransfer('living_room', 'underfloor')
    expect(useOnboardingStore.getState().data.rooms[0].heatTransfer).toBe('underfloor')
  })
})

describe('Fortschritt wächst mit dem im Check angelegten Raum', () => {
  it('nimmt Pro-Raum-Checks in den Nenner, sobald ein Raum da ist', () => {
    const perRoom = MEASUREMENT_CATALOG.filter((m) => m.available && m.perRoom).length
    const before = catalogProgress({}, [])
    const key = useOnboardingStore.getState().addRoom('bedroom')
    const rooms = useOnboardingStore.getState().data.rooms
    const after = catalogProgress({}, rooms)
    expect(after.total).toBe(before.total + perRoom)

    // Der Check in genau diesem Raum zählt anschließend als erledigt.
    const meta = MEASUREMENT_CATALOG.find((m) => m.available && m.perRoom)!
    const results = {
      [instanceKey(meta.id, key)]: {
        id: meta.id, rating: 'good' as const, primaryValue: 1, unit: '°C',
        completedAt: '2026-08-24T00:00:00.000Z', roomKey: key,
      },
    }
    expect(catalogProgress(results, rooms).done).toBe(1)
  })
})
