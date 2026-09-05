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
import { room } from '../roomFixture'

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
  rooms: [room('living_room', 1, { heatTransfer: 'radiator' })],
  heatGenerators: ['gas_boiler'],
  hotWaterType: 'same_as_heating',
  ventilationType: 'natural',
  insulationState: 'good',
  instruments: [{ type: 'none' }],
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
      'home', 'goals', 'rooms', 'heating', 'prices',
      'appliances', 'equipment', 'review',
    ]
    expect(ONBOARDING_SECTIONS.map((s) => s.id).sort()).toEqual([...ids].sort())
  })

  it('stellt die Geräte-Frage vor der Messgeräte-Übersicht, auf eigener Seite', () => {
    // Beide standen bis zum 05.09.2026 auf derselben Seite: die Frage unter der
    // Auskunft, wo man sie erst freiscrollen musste. Seither hat sie einen
    // eigenen Schritt – und der steht davor, nicht dahinter.
    const ids = ONBOARDING_SECTIONS.map((s) => s.id)
    expect(ids.indexOf('appliances')).toBeLessThan(ids.indexOf('equipment'))

    const appliances = ONBOARDING_SECTIONS.find((s) => s.id === 'appliances')!
    expect(appliances.fields.map((f) => f.id)).toEqual(['appliances'])

    // „Ausstattung" ist seither reine Auskunft: keine Frage, kein Ausfüllstand.
    // Sonst hinge der Fortschritt an einer Seite, auf der es nichts zu
    // beantworten gibt.
    expect(ONBOARDING_SECTIONS.find((s) => s.id === 'equipment')!.fields).toEqual([])
  })

  it('stellt die Ziel-Frage in beiden Wegen, auf eigener Seite', () => {
    // Sie stand bis zum 05.09.2026 am Fuß von „Dein Zuhause" und nur im
    // vollständigen Fragebogen – als Pflichtangabe zählte sie trotzdem in
    // beiden. Ein Schnellstart-Profil konnte 100 % deshalb nie erreichen.
    const goals = ONBOARDING_SECTIONS.find((s) => s.id === 'goals')!
    expect(goals.quick).toBe(true)
    expect(goals.fields.map((f) => f.id)).toEqual(['goals'])
    expect(sectionsFor('quick').map((s) => s.id)).toContain('goals')

    // „Dein Zuhause" trägt sie nicht mehr.
    const home = ONBOARDING_SECTIONS.find((s) => s.id === 'home')!
    expect(home.fields.map((f) => f.id)).not.toContain('goals')
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
  // `energyCostRange` (geschätzte monatliche Energiekosten) steht bewusst nicht
  // mehr in dieser Liste: Die Angabe ist im August 2026 entfallen, weil sie
  // erhoben, aber nie verrechnet wurde. Sie ist nicht verlorengegangen,
  // sondern abgeschafft.
  //
  // Aus demselben Grund fehlen seit dem 04.09.2026 `windowAge`,
  // `insulationState`, `ventilationType` und `renovations`: Mit dem Schritt
  // „Gebäudehülle & Modernisierung" ist die letzte Frage entfallen, die sie
  // gestellt hat. Ihre gesamte Wirkung waren Zeilen im PDF-Steckbrief, und dort
  // stehen sie weiterhin – für Profile, die noch einen Wert tragen.
  //
  // Ebenfalls seit dem 04.09.2026 fehlt `instruments`: Die Abfrage der
  // vorhandenen Messgeräte ist der Übersicht „Was du zum Messen brauchst"
  // gewichen. Sie hatte eine einzige Wirkung – einen vorangehakten Schalter im
  // Möbelabstand-Check – und stellte 24 Bauarten zur Wahl, die keine Zeile Code
  // je gelesen hat.
  //
  // Seit dem 05.09.2026 fehlt `occupancyStatus`: Mieter oder Eigentümer wurde
  // als Pflichtangabe erhoben und nur angezeigt. Nachgezählt hätte die Angabe
  // genau einen Tipp gefiltert – das Alter des Kessels –, und der ist für
  // Mieter das Argument gegenüber der Vermietung, also nicht einmal sicher zu
  // unterdrücken. Auch sie ist nicht verlorengegangen, sondern abgeschafft.
  //
  // Ebenfalls seit dem 05.09.2026 fehlt `postalCode`: Nachdem Mieter/Eigentümer
  // gestrichen war, blieb im Standort-Schritt nur diese eine freiwillige Angabe
  // – mit einer einzigen Lesestelle, zwei Ziffern im PDF-Steckbrief. Ein
  // eigener Schritt dafür trug sich nicht. Auch sie ist nicht verlorengegangen,
  // sondern abgeschafft.
  //
  // Und seit dem 05.09.2026 fehlen `buildingType` und `floors`: Wohnung oder
  // Haus und die Etagenzahl waren Pflichtangaben mit je einer Lesestelle, einer
  // Zeile im PDF-Steckbrief. Keine Messung, kein Tipp und keine Rechnung hat je
  // danach unterschieden. Auch sie sind nicht verlorengegangen, sondern
  // abgeschafft.
  //
  // `roomsCount` stand hier nie: Sie ist die Schnellstart-Näherung für die
  // Raumliste, kein eigener Abschnitts-Eintrag.
  const ERHOBEN = [
    'profileName', 'profileImage', 'personsCount', 'goals',
    'buildingYear', 'livingArea',
    'rooms', 'heatTransfer', 'roomAreas',
    'heatGenerators', 'hotWaterType',
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
