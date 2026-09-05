// Der Instanz-Umbau darf keinem Bestandsprofil seine Messungen nehmen.
import { describe, expect, it } from 'vitest'
import { migrateOnboardingData } from '@/store/onboardingStore'
import { roomInstances, findRoomInstance } from '@/features/measurements/rooms'
import type { OnboardingData } from '@/types'

/** Ein Profil, wie es vor dem Umbau gespeichert wurde: Raumart plus Anzahl. */
function legacy(rooms: unknown): OnboardingData {
  return migrateOnboardingData({ rooms } as Partial<OnboardingData>)
}

describe('Instanz-Umbau eines Altprofils', () => {
  it('erbt genau die Schlüssel, unter denen die Messergebnisse liegen', () => {
    const data = legacy([
      { type: 'living_room', count: 1, areaSqm: 26, heatTransfer: 'radiator' },
      { type: 'children_room', count: 2, areaSqm: 12, heatTransfer: 'underfloor' },
    ])

    // Genau die Form, die `roomInstances` vor dem Umbau erzeugt hat.
    expect(roomInstances(data.rooms).map((r) => r.key)).toEqual([
      'living_room#0',
      'children_room#0',
      'children_room#1',
    ])

    // Ein gespeichertes Ergebnis findet seinen Raum weiterhin.
    expect(findRoomInstance(data.rooms, 'children_room#1')?.type).toBe('children_room')
  })

  it('vererbt Fläche und Wärmeübergabe an jede Instanz', () => {
    const data = legacy([{ type: 'children_room', count: 2, areaSqm: 12, heatTransfer: 'underfloor' }])
    // Dass beide Kinderzimmer dieselbe Fläche haben, war im Altprofil keine
    // Angabe, sondern die einzig mögliche Darstellung – sie bleibt erhalten
    // und ist ab jetzt einzeln änderbar.
    for (const inst of data.rooms[0].instances) {
      expect(inst.areaSqm).toBe(12)
      expect(inst.heatTransfer).toBe('underfloor')
    }
  })

  it('lässt ein bereits migriertes Profil unangetastet', () => {
    const rooms = [
      { type: 'bedroom', instances: [{ id: 'bedroom#0' }, { id: 'bedroom#a1b2c3d4', name: 'Gästezimmer' }] },
    ]
    expect(legacy(rooms).rooms).toEqual(rooms)
  })

  it('vergibt keine Kennung zweimal, wenn Raumarten zusammengeführt werden', () => {
    // 'guest_toilet' wird zu 'toilet' – beide Einträge landen in einem.
    const data = legacy([
      { type: 'toilet', count: 1 },
      { type: 'guest_toilet', count: 1 },
    ])
    const keys = roomInstances(data.rooms).map((r) => r.key)
    expect(keys).toHaveLength(2)
    expect(new Set(keys).size).toBe(2)
  })

  it('wirft einen Raumtyp ohne Instanzen weg', () => {
    expect(legacy([{ type: 'bedroom', instances: [] }]).rooms).toEqual([])
  })
})
