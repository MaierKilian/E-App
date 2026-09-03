// Kühl- und Gefriergeräte: die letzte Angabe, die kein Zuhause hatte.
//
// Beide Checks unterstellten, dass es das Gerät gibt. Diese Tests halten fest,
// dass „wir haben keines" eine Antwort ist (und nicht mit „noch nicht gefragt"
// verwechselt wird), dass die Kombination beide Checks bedient und dass die
// Zählung der Profilangabe folgt statt einer zweiten Liste.

import { describe, expect, it } from 'vitest'
import {
  addAppliance,
  applianceInstances,
  applianceRoom,
  hasAppliance,
  newApplianceId,
  removeAppliance,
  skippedMeasurements,
  updateAppliance,
} from '@/features/onboarding/appliances'
import { migrateOnboardingData, useOnboardingStore } from '@/store/onboardingStore'
import { hydrate } from '@/features/sync/stores'
import type { ApplianceEntry, OnboardingData } from '@/types'

const KOMBI: ApplianceEntry[] = [{ id: 'fridge_freezer', kind: 'fridge_freezer', room: 'kitchen' }]

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

describe('Auswahl ändern', () => {
  it('fügt hinzu und entfernt wieder', () => {
    const eins = addAppliance([], 'freezer')
    expect(eins).toHaveLength(1)
    expect(eins[0].kind).toBe('freezer')
    expect(removeAppliance(eins, eins[0].id)).toEqual([])
  })

  it('lässt die übrigen Geräte unberührt', () => {
    const beide = addAppliance(KOMBI, 'freezer')
    expect(beide).toHaveLength(2)
    expect(removeAppliance(beide, beide[1].id)).toEqual(KOMBI)
  })
})

// Der Kern von Etappe 12a: `appliances` war eine Menge, keine Liste. Ein
// zweiter Eintrag derselben Art *entfernte* den ersten – zwei Kühlschränke
// waren nicht darstellbar.
describe('Zwei Geräte derselben Art', () => {
  it('lassen sich beide eintragen', () => {
    const zwei = addAppliance(addAppliance([], 'fridge'), 'fridge')
    expect(zwei).toHaveLength(2)
    expect(zwei.map((a) => a.kind)).toEqual(['fridge', 'fridge'])
  })

  it('bekommen verschiedene Kennungen', () => {
    const zwei = addAppliance(addAppliance([], 'fridge'), 'fridge')
    expect(zwei[0].id).not.toBe(zwei[1].id)
  })

  it('behalten ihre Kennung, wenn eines gelöscht wird', () => {
    // Der Grund für die Kennung: Bei `type#index` rutschte `fridge#1` nach
    // dem Löschen auf `fridge#0` und erbte das Ergebnis des gelöschten Geräts.
    const zwei = addAppliance(addAppliance([], 'fridge'), 'fridge')
    const zweite = zwei[1]
    const rest = removeAppliance(zwei, zwei[0].id)
    expect(rest).toHaveLength(1)
    expect(rest[0].id).toBe(zweite.id)
  })

  it('vergibt eine gelöschte Kennung nicht neu', () => {
    // Sonst erbte das nächste Gerät das Ergebnis des gelöschten.
    const eins = addAppliance([], 'fridge')
    const geloescht = eins[0].id
    const neu = addAppliance(removeAppliance(eins, geloescht), 'fridge')
    expect(neu[0].id).not.toBe(geloescht)
  })

  it('lassen sich einzeln benennen und verorten', () => {
    const zwei = addAppliance(addAppliance([], 'fridge'), 'fridge')
    const benannt = updateAppliance(zwei, zwei[1].id, { name: 'Getränke', room: 'basement' })
    expect(benannt[0].name).toBeUndefined()
    expect(benannt[1].name).toBe('Getränke')
    expect(benannt[1].room).toBe('basement')
    expect(benannt[1].id).toBe(zwei[1].id)
    expect(benannt[1].kind).toBe('fridge')
  })
})

describe('applianceInstances', () => {
  it('liefert die Geräte, die einen Check bedienen', () => {
    const liste = [
      { id: 'a', kind: 'fridge' as const },
      { id: 'b', kind: 'freezer' as const },
      { id: 'c', kind: 'fridge' as const },
    ]
    expect(applianceInstances(liste, 'fridge').map((a) => a.id)).toEqual(['a', 'c'])
    expect(applianceInstances(liste, 'freezer').map((a) => a.id)).toEqual(['b'])
  })

  it('zählt ein Kombigerät für beide Checks', () => {
    // An ihm werden zwei verschiedene Fächer gemessen.
    expect(applianceInstances(KOMBI, 'fridge')).toEqual(KOMBI)
    expect(applianceInstances(KOMBI, 'freezer')).toEqual(KOMBI)
  })

  it('behält die Reihenfolge der Liste', () => {
    const liste = [
      { id: 'keller', kind: 'freezer' as const, room: 'basement' as const },
      { id: 'kueche', kind: 'fridge_freezer' as const, room: 'kitchen' as const },
    ]
    expect(applianceInstances(liste, 'freezer').map((a) => a.id)).toEqual(['keller', 'kueche'])
  })

  it('kommt mit einer leeren oder fehlenden Liste zurecht', () => {
    expect(applianceInstances([], 'fridge')).toEqual([])
    expect(applianceInstances(undefined, 'fridge')).toEqual([])
  })

  it('vergibt lesbare, eindeutige Kennungen', () => {
    const id = newApplianceId('fridge')
    expect(id.startsWith('fridge-')).toBe(true)
    expect(newApplianceId('fridge')).not.toBe(id)
  })
})

// Altprofile kennen kein `id`. Sie bekommen `id = kind` – eindeutig, weil bis
// dahin je Art höchstens ein Eintrag möglich war, und damit derselbe Schlüssel
// wie der ihres Altergebnisses.
describe('Migration der Bestandsgeräte', () => {
  const alt = { appliances: [{ kind: 'fridge' }, { kind: 'freezer' }] } as unknown as Partial<OnboardingData>

  it('vergibt id = kind', () => {
    const data = migrateOnboardingData(alt)
    expect(data.appliances.map((a) => a.id)).toEqual(['fridge', 'freezer'])
  })

  it('lässt vorhandene Kennungen unangetastet', () => {
    const data = migrateOnboardingData({ appliances: [{ id: 'fridge-abc', kind: 'fridge' }] })
    expect(data.appliances[0].id).toBe('fridge-abc')
  })

  it('behält Raum und Art bei', () => {
    const data = migrateOnboardingData({
      appliances: [{ kind: 'fridge_freezer', room: 'kitchen' }] as ApplianceEntry[],
    })
    expect(data.appliances[0]).toEqual({ id: 'fridge_freezer', kind: 'fridge_freezer', room: 'kitchen' })
  })

  it('verdrängt nichts, falls doch zwei derselben Art gespeichert wären', () => {
    const data = migrateOnboardingData({
      appliances: [{ kind: 'fridge' }, { kind: 'fridge' }] as ApplianceEntry[],
    })
    expect(data.appliances).toHaveLength(2)
    expect(data.appliances[0].id).toBe('fridge')
    expect(data.appliances[1].id).not.toBe('fridge')
  })

  it('lässt einen Haushalt ohne Geräte unverändert', () => {
    const data = migrateOnboardingData({ appliances: [], appliancesAnswered: true })
    expect(data.appliances).toEqual([])
    expect(skippedMeasurements(data)).toEqual(['fridge', 'freezer'])
  })
})

// Zwei Wege laden ein Profil: der `persist`-Merge beim Start und der
// Cloud-Sync, der per `setState` schreibt und am Merge vorbeigeht. Die Abnahme
// verlangt beide einzeln – hier der zweite.
describe('Migration auf dem Cloud-Weg', () => {
  it('vergibt die Kennungen auch beim Sync', () => {
    hydrate({
      onboarding: { data: { appliances: [{ kind: 'fridge' }, { kind: 'freezer' }] } },
    })
    const geladen = useOnboardingStore.getState().data.appliances
    expect(geladen.map((a) => a.id)).toEqual(['fridge', 'freezer'])
  })

  it('überlebt einen zweiten Sync ohne die Kennungen zu ändern', () => {
    // Der Sync läuft wiederholt; eine Kennung, die sich dabei änderte, träfe
    // ihr Ergebnis beim nächsten Mal nicht mehr.
    hydrate({ onboarding: { data: { appliances: [{ id: 'fridge-xyz', kind: 'fridge' }] } } })
    const erst = useOnboardingStore.getState().data.appliances
    hydrate({ onboarding: { data: { appliances: erst } } })
    expect(useOnboardingStore.getState().data.appliances[0].id).toBe('fridge-xyz')
  })
})
