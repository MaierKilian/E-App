// Die Schritt-Registry ist die einzige Quelle für Reihenfolge, Titel,
// Abschnitts-Status und Profil-Fortschritt.
//
// Der Anlass: Die Reihenfolge war an fünf Stellen unabhängig kodiert, und zwei
// davon zählten unterschiedlich – `profileChecks` prüfte 16 Felder,
// `sectionStatus` 19. Der Prozentbalken im Profil-Hub konnte deshalb 100 %
// zeigen, während die Kacheln darunter offene Angaben meldeten.

import { describe, expect, it } from 'vitest'
import {
  ONBOARDING_SECTIONS,
  hubSections,
  profileCompleteness,
  profileMissingCount,
  sectionsFor,
  stateOf,
  statusOf,
  type SectionId,
} from '@/features/onboarding/sections'
import type { OnboardingData } from '@/types'

/** Profil, in dem nichts beantwortet ist. */
const EMPTY = {
  profileName: '',
  profileImage: '',
  personsCount: 0,
  buildingYear: 0,
  buildingType: undefined,
  livingArea: 0,
  floors: 0,
  rooms: [],
  heatGenerators: [],
  hotWaterType: 'unknown',
  instruments: [],
  postalCode: '',
  goals: [],
  occupancyStatus: null,
  windowAge: 'unknown',
  ventilationType: 'unknown',
  insulationState: 'unknown',
  energyCostRange: 'unknown',
  lastRenovationYear: 'unknown',
  renovations: null,
  heatGeneratorYears: {},
} as unknown as OnboardingData

/** Profil, in dem jede Pflichtangabe beantwortet ist. */
const FULL = {
  ...EMPTY,
  profileName: 'Zuhause',
  personsCount: 2,
  goals: ['save_costs'],
  occupancyStatus: 'tenant',
  buildingYear: 1990,
  buildingType: 'apartment',
  livingArea: 70,
  floors: 1,
  windowAge: '2000_2015',
  rooms: [{ type: 'living_room', count: 1, heatTransfer: 'radiator' }],
  heatGenerators: ['gas_boiler'],
  hotWaterType: 'same_as_heating',
  ventilationType: 'natural',
  insulationState: 'good',
  instruments: [{ type: 'none' }],
  energyCostRange: '100_200',
  lastRenovationYear: 'never',
  renovations: [],
  // „Wir haben keines" ist eine vollwertige Antwort – ein Haushalt ohne
  // Gefriergerät muss 100 % erreichen können.
  appliances: [],
  appliancesAnswered: true,
} as unknown as OnboardingData

describe('Registry ist widerspruchsfrei', () => {
  it('vergibt jede id nur einmal', () => {
    const ids = ONBOARDING_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('führt jede Feld-id nur einmal, über alle Abschnitte hinweg', () => {
    const fields = ONBOARDING_SECTIONS.flatMap((s) => s.fields.map((f) => f.id))
    expect(new Set(fields).size).toBe(fields.length)
  })

  it('kennt zu jeder id genau einen Abschnitt', () => {
    // Der Compiler erzwingt über `SectionId`, dass jeder Abschnitt einen Inhalt
    // hat; hier die Gegenrichtung – eine id ohne Registry-Eintrag.
    const ids: SectionId[] = [
      'home', 'rooms', 'heating', 'prices',
      'building', 'equipment', 'location', 'review',
    ]
    expect(ONBOARDING_SECTIONS.map((s) => s.id).sort()).toEqual([...ids].sort())
  })

  it('hat genau einen Abschluss-Schritt, und zwar als letzten', () => {
    const reviews = ONBOARDING_SECTIONS.filter((s) => s.review)
    expect(reviews).toHaveLength(1)
    expect(ONBOARDING_SECTIONS.at(-1)?.review).toBe(true)
  })

  it('zeigt im Hub alles außer dem Abschluss-Schritt', () => {
    expect(hubSections()).toHaveLength(ONBOARDING_SECTIONS.length - 1)
    expect(hubSections().some((s) => s.review)).toBe(false)
  })

  it('führt den Schnellstart durch eine Teilmenge in derselben Reihenfolge', () => {
    const quick = sectionsFor('quick')
    const detailed = sectionsFor('detailed')
    expect(detailed).toEqual(ONBOARDING_SECTIONS)
    expect(quick.length).toBeLessThan(detailed.length)
    // Teilmenge und Reihenfolge erhalten – sonst führten die beiden Wege durch
    // dieselben Schritte in verschiedener Folge.
    expect(quick).toEqual(detailed.filter((s) => quick.includes(s)))
  })

  it('endet auch im Schnellstart mit dem Abschluss-Schritt', () => {
    expect(sectionsFor('quick').at(-1)?.review).toBe(true)
  })
})

describe('Fortschritt und Abschnitts-Status stimmen überein', () => {
  /**
   * Der eigentliche Punkt: Was der Prozentbalken zählt, ist exakt die Summe
   * dessen, was die Kacheln zählen. Zwei Zahlen auf einem Bildschirm dürfen
   * sich nicht widersprechen.
   */
  const CASES: { name: string; data: OnboardingData }[] = [
    { name: 'nichts beantwortet', data: EMPTY },
    { name: 'alles beantwortet', data: FULL },
    { name: 'halb beantwortet', data: { ...FULL, ventilationType: 'unknown', rooms: [] } },
  ]

  for (const c of CASES) {
    it(`Balken und Kacheln passen zusammen – ${c.name}`, () => {
      const open = hubSections().reduce((sum, s) => sum + statusOf(s, c.data).open, 0)
      expect(profileMissingCount(c.data)).toBe(open)
      // 100 % genau dann, wenn keine Kachel mehr etwas offen hat.
      expect(profileCompleteness(c.data) === 100).toBe(open === 0)
    })
  }

  it('erreicht 100 %, ohne dass eine freiwillige Angabe nötig wäre', () => {
    // Weder Profilbild noch Postleitzahl sind gesetzt.
    expect(FULL.profileImage).toBe('')
    expect(FULL.postalCode).toBe('')
    expect(profileCompleteness(FULL)).toBe(100)
  })

  it('zählt freiwillige Angaben nicht in den Nenner', () => {
    const withOptional = { ...EMPTY, profileImage: 'data:x', postalCode: '10405' }
    expect(profileCompleteness(withOptional)).toBe(profileCompleteness(EMPTY))
  })
})

describe('Drei Zustände', () => {
  const home = ONBOARDING_SECTIONS.find((s) => s.id === 'home')!

  it('nie besucht und unvollständig = offen', () => {
    expect(stateOf(home, EMPTY, [])).toBe('open')
  })

  it('besucht und unvollständig = angefangen', () => {
    expect(stateOf(home, EMPTY, ['home'])).toBe('started')
  })

  it('vollständig bleibt vollständig, ob besucht oder nicht', () => {
    expect(stateOf(home, FULL, [])).toBe('complete')
    expect(stateOf(home, FULL, ['home'])).toBe('complete')
  })

  it('nennt einen Abschnitt ohne Pflichtangaben erst nach dem Besuch fertig', () => {
    // Sonst stünde die Übersicht im Schrittbalken von Anfang an voll – der
    // Nutzer war dort nie.
    const review = ONBOARDING_SECTIONS.find((s) => s.review)!
    expect(statusOf(review, EMPTY).total).toBe(0)
    expect(stateOf(review, EMPTY, [])).toBe('open')
    expect(stateOf(review, EMPTY, ['review'])).toBe('complete')
  })
})

describe('Kein Feld ist verlorengegangen', () => {
  /**
   * Der Zuschnitt der Abschnitte hat sich geändert – die Angaben nicht. Jede
   * Angabe, die die App vor dem Umbau erhoben hat, muss im vollständigen
   * Fragebogen weiterhin zählbar sein.
   */
  const ERHOBEN = [
    'profileName', 'profileImage', 'personsCount', 'goals', 'occupancyStatus',
    'buildingYear', 'buildingType', 'livingArea', 'floors', 'windowAge',
    'rooms', 'heatTransfer', 'roomAreas',
    'heatGenerators', 'hotWaterType',
    'ventilationType', 'insulationState',
    'instruments', 'energyCostRange',
    'renovations', 'postalCode',
  ]

  it('führt jede vorher erhobene Angabe weiter', () => {
    const known = new Set(ONBOARDING_SECTIONS.flatMap((s) => s.fields.map((f) => f.id)))
    expect([...ERHOBEN].filter((id) => !known.has(id))).toEqual([])
  })

  it('zeigt jede davon in einem Abschnitt des vollständigen Fragebogens', () => {
    const inFlow = new Set(
      sectionsFor('detailed').flatMap((s) => s.fields.map((f) => f.id)),
    )
    expect([...ERHOBEN].filter((id) => !inFlow.has(id))).toEqual([])
  })
})
