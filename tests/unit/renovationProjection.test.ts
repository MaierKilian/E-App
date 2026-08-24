// Sanierungen: Ereignis-Log als Eingabe, Bauteil-Zustand als Ableitung.
//
// Vorher gab es ein globales Sanierungsjahr plus eine flache Häkchenliste –
// real werden Fenster 2005 und die Heizung 2021 saniert, und ein Jahr für alles
// kann das nicht abbilden. Diese Tests halten fest, dass die Ableitung dieselbe
// Rechnung füttert wie vorher und dass Altprofile verlustfrei ankommen.

import { describe, expect, it } from 'vitest'
import {
  addRenovationYear,
  boilerAgeYears,
  derivedLegacyFields,
  latestRenovationYear,
  migrateLegacyRenovations,
  projectRenovations,
  renovatedItems,
  sortRenovations,
} from '@/features/onboarding/renovationProjection'
import { estimateEnvelope } from '@/features/home/estimateEnergy'
import { migrateOnboardingData } from '@/store/onboardingStore'
import type { OnboardingData, RenovationEvent } from '@/types'

const EVENTS: RenovationEvent[] = [
  { id: 'a', year: 2005, items: ['windows'] },
  { id: 'b', year: 2018, items: ['roof_insulation', 'facade'] },
  { id: 'c', year: 2021, items: ['heating_system'] },
]

function profile(over: Partial<OnboardingData>): OnboardingData {
  return {
    buildingYear: 1985,
    heatGenerators: [],
    heatGeneratorYears: {},
    renovations: null,
    renovationItems: [],
    lastRenovationYear: 'unknown',
    ...over,
  } as OnboardingData
}

describe('Projektion', () => {
  it('nimmt je Bauteil das späteste Jahr', () => {
    expect(projectRenovations(EVENTS)).toEqual({
      windows: 2005,
      roof_insulation: 2018,
      facade: 2018,
      heating_system: 2021,
    })
  })

  it('lässt ein zweimal saniertes Bauteil beim jüngeren Jahr', () => {
    const twice: RenovationEvent[] = [
      { id: 'a', year: 1998, items: ['windows'] },
      { id: 'b', year: 2019, items: ['windows'] },
    ]
    expect(projectRenovations(twice).windows).toBe(2019)
  })

  it('ignoriert den Platzhalter „nichts“ aus dem alten Modell', () => {
    expect(projectRenovations([{ id: 'a', year: 2010, items: ['nothing'] }])).toEqual({})
  })

  it('kommt mit leerem und fehlendem Log klar', () => {
    expect(projectRenovations([])).toEqual({})
    expect(projectRenovations(null)).toEqual({})
    expect(latestRenovationYear(null)).toBeUndefined()
  })
})

describe('Altfelder bleiben ableitbar', () => {
  it('leitet Spanne und Bauteilliste aus dem Log ab', () => {
    expect(derivedLegacyFields(EVENTS)).toEqual({
      lastRenovationYear: 'after_2020',
      renovationItems: ['windows', 'roof_insulation', 'facade', 'heating_system'],
    })
  })

  it('unterscheidet „nie saniert“ von „noch nichts eingetragen“', () => {
    // Genau dafür gibt es die leere Liste neben `null` – sonst bliebe die Frage
    // für einen unsanierten Altbau dauerhaft offen.
    expect(derivedLegacyFields([]).lastRenovationYear).toBe('never')
    expect(derivedLegacyFields(null).lastRenovationYear).toBe('unknown')
  })
})

describe('Migration eines Altprofils', () => {
  it('erzeugt ein geschätztes Ereignis in der Mitte der Spanne', () => {
    const migrated = migrateLegacyRenovations('2000_2010', ['windows', 'facade'])
    expect(migrated).toEqual([
      { id: 'migrated-2005', year: 2005, items: ['windows', 'facade'], estimated: true },
    ])
  })

  it('verliert kein Bauteil', () => {
    const items = ['windows', 'roof_insulation', 'facade', 'basement_ceiling'] as const
    const migrated = migrateLegacyRenovations('2010_2020', [...items])
    expect(migrated?.[0].items).toEqual([...items])
  })

  it('übernimmt „nie saniert“ als leere Liste', () => {
    expect(migrateLegacyRenovations('never', [])).toEqual([])
  })

  it('lässt ein unbeantwortetes Altprofil unbeantwortet', () => {
    expect(migrateLegacyRenovations('unknown', [])).toBeNull()
    expect(migrateLegacyRenovations('2000_2010', ['nothing'])).toBeNull()
  })
})

describe('Effizienz-Einordnung rechnet unverändert', () => {
  /**
   * Der Kern der Kompatibilität: Für dieselben Bauteile muss dieselbe Zahl
   * herauskommen wie vor dem Umbau – die Rechnung wurde nicht angefasst, nur
   * ihre Eingabe.
   */
  it('liefert für dieselben Bauteile dieselbe Skala wie das alte Modell', () => {
    const items = ['windows', 'roof_insulation'] as const
    // Alt: Bauteile als flache Liste. Neu: dieselben Bauteile aus zwei Jahren.
    const neu = estimateEnvelope(
      profile({
        renovations: [
          { id: 'a', year: 2005, items: ['windows'] },
          { id: 'b', year: 2018, items: ['roof_insulation'] },
        ],
      }),
    )
    // Erwartung aus den unveränderten Faktoren: 0,88 × 0,88 ≈ −23 %.
    expect(neu.savingsPct).toBe(23)
    expect(renovatedItems(profile({ renovations: [
      { id: 'a', year: 2005, items: [...items] },
    ] }).renovations)).toEqual([...items])
    // Der größte offene Hebel bleibt die Fassade (Faktor 0,80).
    expect(neu.nextLever).toBe('facade')
  })

  it('ohne Sanierungen bleibt alles offen', () => {
    const est = estimateEnvelope(profile({ renovations: null }))
    expect(est.savingsPct).toBe(0)
    expect(est.nextLever).toBe('facade')
  })
})

describe('Jahr hinzufügen', () => {
  it('sortiert chronologisch ein statt anzuhängen', () => {
    const { events } = addRenovationYear(
      [
        { id: 'a', year: 2020, items: [] },
        { id: 'b', year: 2000, items: [] },
      ],
      2010,
    )
    expect(events.map((e) => e.year)).toEqual([2000, 2010, 2020])
  })

  it('erzeugt für ein vorhandenes Jahr kein Duplikat', () => {
    const before: RenovationEvent[] = [{ id: 'a', year: 2010, items: ['windows'] }]
    const { events, id } = addRenovationYear(before, 2010)
    expect(events).toHaveLength(1)
    // Der Aufrufer klappt genau diese Karte auf, statt eine zweite anzulegen.
    expect(id).toBe('a')
  })

  it('hält die Liste auch beim Sortieren stabil', () => {
    const list: RenovationEvent[] = [
      { id: 'a', year: 2021, items: [] },
      { id: 'b', year: 1999, items: [] },
    ]
    expect(sortRenovations(list).map((e) => e.id)).toEqual(['b', 'a'])
  })
})

describe('Alter des Wärmeerzeugers', () => {
  const now = new Date('2026-08-24T00:00:00Z')

  it('rechnet das Alter des ältesten Kessels', () => {
    const d = profile({
      heatGenerators: ['gas_boiler'],
      heatGeneratorYears: { gas_boiler: 2002 },
    })
    expect(boilerAgeYears(d, now)).toBe(24)
  })

  it('ignoriert Erzeuger, für die der Austausch kein Hebel ist', () => {
    // Ein Tipp „deine Wärmepumpe ist alt" hilft niemandem weiter.
    const d = profile({
      heatGenerators: ['heat_pump'],
      heatGeneratorYears: { heat_pump: 2002 },
    })
    expect(boilerAgeYears(d, now)).toBeUndefined()
  })

  it('schweigt ohne Jahresangabe', () => {
    expect(boilerAgeYears(profile({ heatGenerators: ['gas_boiler'] }), now)).toBeUndefined()
  })

  it('nimmt bei mehreren Kesseln den ältesten', () => {
    const d = profile({
      heatGenerators: ['gas_boiler', 'oil_boiler'],
      heatGeneratorYears: { gas_boiler: 2015, oil_boiler: 1998 },
    })
    expect(boilerAgeYears(d, now)).toBe(28)
  })
})

describe('Migration greift auf beiden Wegen', () => {
  /**
   * Der Cloud-Sync schreibt einen Profilzustand direkt in den Store und geht
   * damit am `persist`-Merge vorbei. Stünde die Migration nur dort, käme ein
   * Altprofil aus der Cloud ohne Ereignis-Log an – und die Sanierungsfrage
   * gälte als beantwortet, obwohl nichts dasteht.
   */
  it('macht aus einem Altprofil auch außerhalb von persist ein Ereignis', () => {
    const migrated = migrateOnboardingData({
      lastRenovationYear: '2010_2020',
      renovationItems: ['facade'],
    } as Partial<OnboardingData>)
    expect(migrated.renovations).toEqual([
      { id: 'migrated-2015', year: 2015, items: ['facade'], estimated: true },
    ])
  })

  it('ergänzt fehlende Felder mit den Vorgaben', () => {
    const migrated = migrateOnboardingData({} as Partial<OnboardingData>)
    // `null` heißt „noch nichts eingetragen" – die Frage bleibt offen, statt
    // als beantwortet durchzugehen.
    expect(migrated.renovations).toBeNull()
    expect(migrated.heatGeneratorYears).toEqual({})
  })
})
