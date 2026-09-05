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
  it('legt den ersten Raum an und liefert dessen Schlüssel', () => {
    const key = useOnboardingStore.getState().addRoom('bedroom')
    const rooms = useOnboardingStore.getState().data.rooms
    expect(rooms).toEqual([{ type: 'bedroom', instances: [{ id: key }] }])
    // Die Raumart steht vorn, damit ein verwaister Schlüssel noch lesbar ist.
    expect(key.startsWith('bedroom#')).toBe(true)
  })

  it('legt einen zweiten Raum an und zeigt auf den NEUEN', () => {
    const first = useOnboardingStore.getState().addRoom('bedroom')
    const second = useOnboardingStore.getState().addRoom('bedroom')
    expect(second).not.toBe(first)
    const rooms = useOnboardingStore.getState().data.rooms
    expect(rooms[0].instances).toHaveLength(2)
    expect(roomInstances(rooms).map((r) => r.key)).toEqual([first, second])
  })

  it('legt neue Räume ohne Wärmeübergabe an – "noch nicht beantwortet"', () => {
    useOnboardingStore.getState().addRoom('living_room')
    expect(useOnboardingStore.getState().data.rooms[0].instances[0].heatTransfer).toBeUndefined()
  })

  it('schreibt die Wärmeübergabe aus dem Check zurück – nur in DIESEN Raum', () => {
    const first = useOnboardingStore.getState().addRoom('children_room')
    useOnboardingStore.getState().addRoom('children_room')
    useOnboardingStore.getState().setRoomHeatTransfer(first, 'underfloor')

    const [a, b] = useOnboardingStore.getState().data.rooms[0].instances
    expect(a.heatTransfer).toBe('underfloor')
    // Der zweite Raum bleibt unbeantwortet. Vorher schrieb der Check auf die
    // Raumart und stellte im Nachbarzimmer fortan die falschen Fragen.
    expect(b.heatTransfer).toBeUndefined()
  })

  it('gibt eine gelöschte Kennung nicht wieder aus', () => {
    const store = useOnboardingStore.getState()
    const first = store.addRoom('bedroom')
    store.addRoom('bedroom')
    // Den ersten Raum entfernen, wie es der Fragebogen tut.
    useOnboardingStore.setState((s) => ({
      data: {
        ...s.data,
        rooms: s.data.rooms.map((r) => ({
          ...r,
          instances: r.instances.filter((i) => i.id !== first),
        })),
      },
    }))
    const third = useOnboardingStore.getState().addRoom('bedroom')
    // Wäre die Kennung eine laufende Nummer, hiesse der neue Raum jetzt wieder
    // wie der geloeschte – und erbte dessen Messergebnisse.
    expect(third).not.toBe(first)
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
