// Die Fläche gilt seit dem Instanz-Umbau je Raum, nicht je Raumart.
import { describe, expect, it } from 'vitest'
import { resolveRoomArea, TYPICAL_AREA_SQM } from '@/features/measurements/room_temperature/roomAreas'
import { room } from '../roomFixture'
import type { RoomEntry } from '@/types'

describe('resolveRoomArea', () => {
  it('gibt zwei Räumen gleicher Art unterschiedliche Flächen, wenn sie eingetragen sind', () => {
    const rooms: RoomEntry[] = [
      { type: 'children_room', instances: [
        { id: 'children_room#0', areaSqm: 9 },
        { id: 'children_room#1', areaSqm: 18 },
      ] },
    ]
    // Vorher war das nicht ausdrückbar: Beide bekamen denselben Wert – und
    // damit dieselbe Einsparung in €/Jahr, obwohl einer um Faktor zwei
    // danebenlag.
    expect(resolveRoomArea(rooms, 80, 'children_room#0').areaSqm).toBe(9)
    expect(resolveRoomArea(rooms, 80, 'children_room#1').areaSqm).toBe(18)
  })

  it('verteilt die Wohnfläche gewichtet auf Räume ohne eigene Angabe', () => {
    const rooms = [room('dining_room', 2)]
    // 70 m² auf zwei gleich gewichtete Esszimmer – genau der Platzhalter, der
    // in der Oberfläche steht.
    expect(resolveRoomArea(rooms, 70, 'dining_room#0').areaSqm).toBe(35)
    expect(resolveRoomArea(rooms, 70, 'dining_room#1').estimated).toBe(true)
  })

  it('zieht eingetragene Flächen ab und verteilt nur den Rest', () => {
    const rooms: RoomEntry[] = [
      { type: 'living_room', instances: [{ id: 'living_room#0', areaSqm: 30 }] },
      { type: 'bedroom', instances: [{ id: 'bedroom#0' }, { id: 'bedroom#1' }] },
    ]
    // 80 − 30 = 50 auf zwei gleich gewichtete Schlafzimmer.
    expect(resolveRoomArea(rooms, 80, 'bedroom#0').areaSqm).toBe(25)
  })

  it('summiert sich auf die angegebene Wohnfläche', () => {
    const rooms = [room('living_room'), room('bedroom', 2), room('kitchen')]
    const sum = rooms
      .flatMap((r) => r.instances)
      .reduce((acc, inst) => acc + resolveRoomArea(rooms, 90, inst.id).areaSqm, 0)
    expect(sum).toBeCloseTo(90, 6)
  })

  it('fällt ohne Wohnfläche auf den typischen Wert der Raumart zurück', () => {
    expect(resolveRoomArea([room('bathroom')], 0, 'bathroom#0').areaSqm).toBe(
      TYPICAL_AREA_SQM.bathroom,
    )
  })

  it('kennt die Raumart auch bei einem verwaisten Schlüssel', () => {
    // Der Raum wurde gelöscht, sein Messergebnis blieb – die Rechnung darf
    // deshalb nicht bei 0 m² landen.
    expect(resolveRoomArea([], 0, 'attic#0').areaSqm).toBe(TYPICAL_AREA_SQM.attic)
  })
})
