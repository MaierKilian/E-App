import type {
  OnboardingData,
  RenovationEvent,
  RenovationItem,
  RenovationYear,
} from '@/types'

/**
 * Das Ereignis-Log ist die Eingabe, der Bauteil-Zustand die Ableitung.
 *
 * Der Nutzer trägt ein, was er weiß: „2005 Fenster, 2018 Dach und Fassade".
 * Gerechnet wird mit dem, was daraus folgt – für jedes Bauteil das **späteste**
 * Jahr, in dem es genannt wird. So gibt es einen Ort zum Eintragen und zwei
 * Sichten darauf, statt zweier Erfassungswege, die sich widersprechen können.
 *
 * Die Altfelder `lastRenovationYear` und `renovationItems` bleiben im Typ und
 * werden hier abgeleitet befüllt: Demo-Profil, Firestore-Sync und die
 * Übersichtsseite lesen sie weiter.
 */

/** Bauteile der Gebäudehülle plus Heizung – ohne den Platzhalter `nothing`. */
export const RENOVATION_PARTS: RenovationItem[] = [
  'roof_insulation',
  'facade',
  'windows',
  'basement_ceiling',
  'heating_system',
]

/** Sanierungsjahr je Bauteil; fehlt der Eintrag, ist das Bauteil unsaniert. */
export type RenovationProjection = Partial<Record<RenovationItem, number>>

/** Für jedes Bauteil das späteste Jahr, in dem es saniert wurde. */
export function projectRenovations(
  events: readonly RenovationEvent[] | null | undefined,
): RenovationProjection {
  const out: RenovationProjection = {}
  for (const event of events ?? []) {
    for (const item of event.items) {
      if (item === 'nothing') continue
      const known = out[item]
      if (known === undefined || event.year > known) out[item] = event.year
    }
  }
  return out
}

/** Alle sanierten Bauteile – die Menge, mit der `estimateEnvelope` rechnet. */
export function renovatedItems(
  events: readonly RenovationEvent[] | null | undefined,
): RenovationItem[] {
  return Object.keys(projectRenovations(events)) as RenovationItem[]
}

/** Spätestes Sanierungsjahr über alle Ereignisse. */
export function latestRenovationYear(
  events: readonly RenovationEvent[] | null | undefined,
): number | undefined {
  const years = (events ?? []).map((e) => e.year)
  return years.length > 0 ? Math.max(...years) : undefined
}

/** Jahr → grobe Spanne des alten Modells. */
export function yearToRange(year: number): RenovationYear {
  if (year < 2000) return 'before_2000'
  if (year < 2010) return '2000_2010'
  if (year < 2020) return '2010_2020'
  return 'after_2020'
}

/** Mitte einer Spanne – für die Migration eines Altprofils. */
export function rangeToYear(range: RenovationYear): number | undefined {
  switch (range) {
    case 'before_2000':
      return 1990
    case '2000_2010':
      return 2005
    case '2010_2020':
      return 2015
    case 'after_2020':
      return 2022
    default:
      return undefined
  }
}

/**
 * Altfelder aus dem Ereignis-Log ableiten.
 *
 * `renovations: []` bedeutet ausdrücklich „nie saniert", `null` heißt „noch
 * nichts eingetragen" – das alte Modell kennt für beides eigene Werte.
 */
export function derivedLegacyFields(
  events: readonly RenovationEvent[] | null | undefined,
): { lastRenovationYear: RenovationYear; renovationItems: RenovationItem[] } {
  if (events === null || events === undefined) {
    return { lastRenovationYear: 'unknown', renovationItems: [] }
  }
  if (events.length === 0) {
    return { lastRenovationYear: 'never', renovationItems: [] }
  }
  const latest = latestRenovationYear(events)
  return {
    lastRenovationYear: latest === undefined ? 'unknown' : yearToRange(latest),
    renovationItems: renovatedItems(events),
  }
}

/**
 * Ereignis-Log aus einem Altprofil.
 *
 * Ein Ereignis mit dem mittleren Jahr der gespeicherten Spanne, als geschätzt
 * gekennzeichnet – die Karte weist das aus und lädt zur Präzisierung ein.
 * Verlustfrei: Die genannten Bauteile bleiben vollständig erhalten.
 */
export function migrateLegacyRenovations(
  lastRenovationYear: RenovationYear | undefined,
  renovationItems: readonly RenovationItem[] | undefined,
): RenovationEvent[] | null {
  if (lastRenovationYear === 'never') return []
  const year = lastRenovationYear ? rangeToYear(lastRenovationYear) : undefined
  const items = (renovationItems ?? []).filter((i) => i !== 'nothing')
  if (year === undefined || items.length === 0) return null
  return [{ id: `migrated-${year}`, year, items: [...items], estimated: true }]
}

/**
 * Fügt ein Sanierungsjahr ein und hält die Liste chronologisch.
 *
 * Ein bereits erfasstes Jahr ergibt kein Duplikat: Der Nutzer landet in der
 * vorhandenen Karte. Deshalb liefert die Funktion auch die id des betroffenen
 * Eintrags zurück – die Ansicht klappt genau diese Karte auf.
 */
export function addRenovationYear(
  events: readonly RenovationEvent[] | null | undefined,
  year: number,
): { events: RenovationEvent[]; id: string } {
  const list = [...(events ?? [])]
  const existing = list.find((e) => e.year === year)
  if (existing) return { events: list, id: existing.id }
  const created: RenovationEvent = { id: `${year}-${Date.now()}`, year, items: [] }
  return { events: sortRenovations([...list, created]), id: created.id }
}

/** Chronologisch aufsteigend – die Liste liest sich als Zeitstrahl. */
export function sortRenovations(events: readonly RenovationEvent[]): RenovationEvent[] {
  return [...events].sort((a, b) => a.year - b.year)
}

/**
 * Alter des ältesten Verbrenner-Kessels in Jahren, falls erfasst.
 *
 * Wärmepumpe, Pellets und Solarthermie bleiben außen vor: Bei ihnen ist der
 * Austausch kein vergleichbarer Hebel, und ein Tipp „deine Wärmepumpe ist alt"
 * hilft niemandem weiter.
 */
export function boilerAgeYears(data: OnboardingData, now = new Date()): number | undefined {
  const currentYear = now.getFullYear()
  const years = (['gas_boiler', 'oil_boiler'] as const)
    .filter((gen) => (data.heatGenerators ?? []).includes(gen))
    .map((gen) => data.heatGeneratorYears?.[gen])
    .filter((year): year is number => typeof year === 'number' && year > 0)
  if (years.length === 0) return undefined
  return currentYear - Math.min(...years)
}
