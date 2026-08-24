// Kühl- und Gefriergeräte: die letzte Angabe, die kein Zuhause hatte.
//
// Beide Checks unterstellten, dass es das Gerät gibt. Diese Tests halten fest,
// dass „wir haben keines" eine Antwort ist (und nicht mit „noch nicht gefragt"
// verwechselt wird), dass die Kombination beide Checks bedient und dass die
// Zählung der Profilangabe folgt statt einer zweiten Liste.

import { describe, expect, it } from 'vitest'
import {
  applianceRoom,
  hasAppliance,
  skippedMeasurements,
  toggleAppliance,
} from '@/features/onboarding/appliances'
import type { ApplianceEntry } from '@/types'

const KOMBI: ApplianceEntry[] = [{ kind: 'fridge_freezer', room: 'kitchen' }]

describe('Welches Gerät bedient welchen Check', () => {
  it('lässt die Kombination für beide Checks gelten', () => {
    // Sonst müsste der Nutzer dasselbe Gerät zweimal eintragen.
    expect(hasAppliance(KOMBI, 'fridge')).toBe(true)
    expect(hasAppliance(KOMBI, 'freezer')).toBe(true)
  })

  it('unterscheidet Einzelgeräte', () => {
    const nurTruhe: ApplianceEntry[] = [{ kind: 'freezer' }]
    expect(hasAppliance(nurTruhe, 'freezer')).toBe(true)
    expect(hasAppliance(nurTruhe, 'fridge')).toBe(false)
  })

  it('gibt den Standort des passenden Geräts zurück', () => {
    const beide: ApplianceEntry[] = [
      { kind: 'fridge', room: 'kitchen' },
      { kind: 'freezer', room: 'basement' },
    ]
    expect(applianceRoom(beide, 'freezer')).toBe('basement')
  })
})

describe('„Keines" ist eine Antwort, kein fehlender Wert', () => {
  it('überspringt nichts, solange die Frage offen ist', () => {
    // Eine unbeantwortete Frage darf nie eine Funktion wegnehmen.
    expect(skippedMeasurements({ appliances: [], appliancesAnswered: false })).toEqual([])
  })

  it('nimmt beide Checks heraus, wenn es kein Gerät gibt', () => {
    expect(skippedMeasurements({ appliances: [], appliancesAnswered: true })).toEqual([
      'fridge',
      'freezer',
    ])
  })

  it('nimmt nur den Check heraus, für den das Gerät fehlt', () => {
    expect(
      skippedMeasurements({ appliances: [{ kind: 'fridge' }], appliancesAnswered: true }),
    ).toEqual(['freezer'])
  })

  it('nimmt bei der Kombination keinen der beiden heraus', () => {
    expect(skippedMeasurements({ appliances: KOMBI, appliancesAnswered: true })).toEqual([])
  })
})

describe('Auswahl umschalten', () => {
  it('fügt hinzu und entfernt wieder', () => {
    const eins = toggleAppliance([], 'freezer')
    expect(eins).toEqual([{ kind: 'freezer' }])
    expect(toggleAppliance(eins, 'freezer')).toEqual([])
  })

  it('lässt die übrigen Geräte unberührt', () => {
    const beide = toggleAppliance(KOMBI, 'freezer')
    expect(beide).toHaveLength(2)
    expect(toggleAppliance(beide, 'freezer')).toEqual(KOMBI)
  })
})
