// Plausibilität der Wohnfläche: Vertipper fangen, Lebensentwürfe in Ruhe lassen.
//
// Die Wohnfläche ist die eine Zahl, bei der ein Vertipper alles Nachfolgende
// entwertet – Verbrauchsschätzung, Raumflächen, spezifische Kennwerte. Die
// Schwellen liegen deshalb weit außerhalb des Üblichen.

import { describe, expect, it } from 'vitest'
import {
  checkPlausibility,
  effectiveRoomCount,
  plausibilityKey,
} from '@/features/onboarding/plausibility'
import type { OnboardingData } from '@/types'

function profile(over: Partial<OnboardingData>): OnboardingData {
  return { livingArea: 70, personsCount: 2, roomsCount: 3, rooms: [], ...over } as OnboardingData
}

const ids = (d: OnboardingData) => checkPlausibility(d).map((h) => h.id)

describe('Üblicher Wohnraum bleibt unkommentiert', () => {
  it('70 m² für 2 Personen in 3 Zimmern', () => {
    expect(ids(profile({}))).toEqual([])
  })

  it('140 m² Haus für 4 Personen in 5 Zimmern', () => {
    expect(ids(profile({ livingArea: 140, personsCount: 4, roomsCount: 5 }))).toEqual([])
  })

  it('30 m² Single-Wohnung, ein Zimmer', () => {
    expect(ids(profile({ livingArea: 30, personsCount: 1, roomsCount: 1 }))).toEqual([])
  })
})

describe('Vertipper werden erkannt', () => {
  it('700 m² für 2 Personen – die Null zu viel', () => {
    const hints = ids(profile({ livingArea: 700 }))
    expect(hints).toContain('area_per_person_high')
    expect(hints).toContain('area_per_room_high')
  })

  it('7 m² für 2 Personen – die Null zu wenig', () => {
    expect(ids(profile({ livingArea: 7 }))).toContain('area_per_person_low')
  })

  it('nennt die geprüften Werte im Hinweis', () => {
    const hint = checkPlausibility(profile({ livingArea: 700 }))[0]
    expect(hint.params).toMatchObject({ area: 700, persons: 2, perPerson: 350 })
  })
})

describe('Randfälle bleiben in Ruhe', () => {
  it('WG mit 9 m² je Person meldet sich, lässt sich aber bestätigen', () => {
    // 108 m² auf 12 Personen: knapp unter der Schwelle, also ein Hinweis –
    // genau dafür gibt es „Passt so".
    const wg = profile({ livingArea: 108, personsCount: 12, roomsCount: 12 })
    expect(ids(wg)).toContain('area_per_person_low')
    // Der Bestätigungs-Schlüssel hängt an genau diesen Werten.
    expect(plausibilityKey(wg)).toBe('108|12|12')
    expect(plausibilityKey({ ...wg, livingArea: 700 } as OnboardingData)).not.toBe('108|12|12')
  })

  it('Erbhaus mit 200 m² für eine Person meldet sich, blockiert aber nicht', () => {
    // Über der Schwelle von 150 m² je Person – ein Vertipper sieht genauso aus.
    // Der Hinweis ist deshalb richtig; entschieden wird per „Passt so".
    const haus = profile({ livingArea: 200, personsCount: 1, roomsCount: 6 })
    expect(ids(haus)).toEqual(['area_per_person_high'])
  })

  it('120 m² für eine Person bleiben unkommentiert', () => {
    expect(ids(profile({ livingArea: 120, personsCount: 1, roomsCount: 4 }))).toEqual([])
  })

  it('schweigt ohne Wohnfläche', () => {
    expect(ids(profile({ livingArea: 0 }))).toEqual([])
  })

  it('schweigt ohne Personen und ohne Zimmer', () => {
    expect(ids(profile({ personsCount: 0, roomsCount: 0 }))).toEqual([])
  })
})

describe('Zimmerzahl', () => {
  it('nimmt die angelegten Räume, sobald es welche gibt', () => {
    const d = profile({
      roomsCount: 3,
      rooms: [
        { type: 'bedroom', count: 2 },
        { type: 'living_room', count: 1 },
      ],
    } as Partial<OnboardingData>)
    expect(effectiveRoomCount(d)).toBe(3)
  })

  it('fällt ohne Räume auf die Schnellstart-Angabe zurück', () => {
    expect(effectiveRoomCount(profile({ roomsCount: 4 }))).toBe(4)
  })
})
