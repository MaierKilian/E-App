// Beschriftung eines Raums: eigener Name schlägt Raumart plus Nummer.
import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { roomLabel, roomLabelForKey, parseRoomKey } from '@/features/measurements/rooms'
import { room } from '../roomFixture'
import type { RoomEntry } from '@/types'

// Gibt den Schlüssel zurück – ein freier Name ist kein i18n-Schlüssel und muss
// deshalb unverändert durchkommen.
const t = ((key: string) => key) as unknown as TFunction

describe('roomLabel', () => {
  it('nennt bei einem Raum nur die Raumart, ohne Nummer', () => {
    expect(roomLabel(t, { type: 'kitchen', index: 0, total: 1 })).toBe(
      'onboarding.step3.roomTypes.kitchen',
    )
  })

  it('nummeriert erst ab dem zweiten Raum gleicher Art', () => {
    expect(roomLabel(t, { type: 'bedroom', index: 1, total: 2 })).toBe(
      'onboarding.step3.roomTypes.bedroom 2',
    )
  })

  it('lässt den eigenen Namen alles schlagen', () => {
    expect(roomLabel(t, { type: 'children_room', index: 1, total: 2, name: 'Zimmer Lena' })).toBe(
      'Zimmer Lena',
    )
  })

  it('behandelt einen Namen aus Leerzeichen wie keinen', () => {
    expect(roomLabel(t, { type: 'kitchen', index: 0, total: 1, name: '  ' })).toBe(
      'onboarding.step3.roomTypes.kitchen',
    )
  })
})

describe('roomLabelForKey', () => {
  const rooms: RoomEntry[] = [
    { type: 'children_room', instances: [
      { id: 'children_room#0', name: 'Zimmer Lena' },
      { id: 'children_room#1' },
    ] },
  ]

  it('findet den Raum zu einem Ergebnis-Schlüssel', () => {
    expect(roomLabelForKey(t, rooms, 'children_room#0')).toBe('Zimmer Lena')
    expect(roomLabelForKey(t, rooms, 'children_room#1')).toBe(
      'onboarding.step3.roomTypes.children_room 2',
    )
  })

  it('nennt die Raumart, wenn es den Raum nicht mehr gibt', () => {
    // Ein gelöschter Raum lässt sein Ergebnis zurück – „Schlafzimmer" ist dort
    // eine bessere Auskunft als eine leere Zeile.
    expect(roomLabelForKey(t, rooms, 'bedroom#0')).toBe('onboarding.step3.roomTypes.bedroom')
  })

  it('lässt einen Schlüssel ohne Raumbezug in Ruhe', () => {
    // Der Warmwasser-Check legt dort die Entnahmestelle ab.
    expect(roomLabelForKey(t, rooms, 'washbasin')).toBeUndefined()
  })
})

describe('parseRoomKey', () => {
  it('liest die Raumart aus alter und neuer Kennung', () => {
    expect(parseRoomKey('bedroom#0')?.type).toBe('bedroom')
    expect(parseRoomKey('bedroom#a1b2c3d4')?.type).toBe('bedroom')
  })

  it('greift nicht bei Schlüsseln ohne Raute', () => {
    expect(parseRoomKey('shower')).toBeNull()
  })
})

describe('roomFixture', () => {
  it('erzeugt die Kennungen in der Altprofil-Form', () => {
    expect(room('bedroom', 2).instances.map((i) => i.id)).toEqual(['bedroom#0', 'bedroom#1'])
  })
})
