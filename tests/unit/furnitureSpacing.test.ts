// Prüfungen am Möbel-Abstands-Check.
//
// Der Check lebt davon, dass die Ausgabe von der Eingabe abhängt: Früher stand
// eine feste Empfehlungsliste im Ergebnis, die auch Punkte nannte, die gar nicht
// zutrafen. Die Tests sichern, dass nur zutreffende Befunde entstehen – und dass
// zu jedem Befund die Texte tatsächlich hinterlegt sind.

import { describe, expect, it } from 'vitest'
import {
  answerFromDistance,
  questionKeys,
  rateFurniture,
  supportsDistance,
  ALL_FINDING_KEYS,
  DISTANCE_BLOCKED_CM,
  DISTANCE_DEFAULT_CM,
  DISTANCE_MAX_CM,
  DISTANCE_MIN_CM,
  DISTANCE_TARGET_CM,
  RADIATOR_KEYS,
  UNDERFLOOR_KEYS,
  type FindingKey,
  type FurnitureAnswers,
} from '@/features/measurements/furniture_spacing/furnitureSpacing'
import type { RoomType } from '@/types'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

const ALL_KEYS: FindingKey[] = ALL_FINDING_KEYS

/** Raumtypen, für die es einen abweichenden Fragensatz gibt. */
const ROOM_SETS: { room: RoomType | undefined; expected: FindingKey }[] = [
  { room: undefined, expected: 'furniture' },
  { room: 'living_room', expected: 'furniture' },
  { room: 'bedroom', expected: 'furniture' },
  { room: 'kitchen', expected: 'builtin' },
  { room: 'bathroom', expected: 'towels' },
]

/** Alle Fragen mit derselben Antwort belegen. */
function allAnswers(keys: FindingKey[], value: 0 | 1 | 2): FurnitureAnswers {
  return Object.fromEntries(keys.map((k) => [k, value])) as FurnitureAnswers
}

/** Vollständiger Fragensatz, in dem genau ein Befund gesetzt ist. */
function onlyAnswer(keys: FindingKey[], key: FindingKey, value: 1 | 2): FurnitureAnswers {
  return { ...allAnswers(keys, 0), [key]: value }
}

describe('Möbel-Abstand – Befunde', () => {
  it('erzeugt ohne Beanstandung keine Befunde', () => {
    const calc = rateFurniture(allAnswers(RADIATOR_KEYS, 0))
    expect(calc.rating).toBe('good')
    expect(calc.findings).toEqual([])
    expect(calc.issues).toBe(0)
    expect(calc.score).toBe(0)
  })

  it('nennt nur die Befunde, die tatsächlich zutreffen', () => {
    const calc = rateFurniture({ furniture: 1, cover: 0, valve: 0 })
    expect(calc.findings.map((f) => f.key)).toEqual(['furniture'])
    expect(calc.findings[0].level).toBe('partly')
  })

  it('unterscheidet teilweise und ja', () => {
    expect(rateFurniture(onlyAnswer(RADIATOR_KEYS, 'cover', 1)).findings[0].level).toBe('partly')
    expect(rateFurniture(onlyAnswer(RADIATOR_KEYS, 'cover', 2)).findings[0].level).toBe('yes')
  })

  it('sortiert den wichtigsten Befund nach oben', () => {
    const calc = rateFurniture({ furniture: 2, cover: 1, valve: 2 })
    expect(calc.findings[0].key).toBe('valve')
  })
})

describe('Möbel-Abstand – Gewichtung', () => {
  it('wiegt den gestörten Temperaturfühler schwerer als ein Möbel davor', () => {
    const valve = rateFurniture(onlyAnswer(RADIATOR_KEYS, 'valve', 2)).score
    const furniture = rateFurniture(onlyAnswer(RADIATOR_KEYS, 'furniture', 2)).score
    expect(valve).toBeGreaterThan(furniture)
    expect(rateFurniture(onlyAnswer(UNDERFLOOR_KEYS, 'thermostat', 2)).score).toBeGreaterThan(
      rateFurniture(onlyAnswer(UNDERFLOOR_KEYS, 'footless', 2)).score,
    )
  })

  it('stuft einen einzelnen vollen Befund in jedem Fragensatz als elevated ein', () => {
    const sets = [
      UNDERFLOOR_KEYS,
      ...ROOM_SETS.map((r) => questionKeys(false, r.room)),
    ]
    for (const keys of sets) {
      for (const key of keys) {
        expect(rateFurniture(onlyAnswer(keys, key, 2)).rating, `${keys.join('/')}:${key}`).toBe(
          'elevated',
        )
      }
    }
  })

  it('erreicht high erst bei mehreren oder schweren Befunden', () => {
    expect(rateFurniture(onlyAnswer(RADIATOR_KEYS, 'valve', 1)).rating).toBe('medium')
    expect(rateFurniture({ furniture: 2, cover: 0, valve: 2 }).rating).toBe('high')
    expect(rateFurniture(allAnswers(RADIATOR_KEYS, 2)).rating).toBe('high')
    expect(rateFurniture(allAnswers(UNDERFLOOR_KEYS, 2)).rating).toBe('high')
  })

  it('bewertet alle Fragensätze gleich streng – volle Blockade ist immer high', () => {
    const sets = [UNDERFLOOR_KEYS, ...ROOM_SETS.map((r) => questionKeys(false, r.room))]
    for (const keys of sets) {
      expect(rateFurniture(allAnswers(keys, 2)).rating, keys.join('/')).toBe('high')
      expect(rateFurniture(allAnswers(keys, 0)).rating, keys.join('/')).toBe('good')
    }
  })
})

describe('Möbel-Abstand – Fragenauswahl', () => {
  it('stellt je Wärmeübergabe den passenden Satz', () => {
    expect(questionKeys(false)).toEqual(RADIATOR_KEYS)
    expect(questionKeys(true)).toEqual(UNDERFLOOR_KEYS)
  })

  it('ersetzt die erste Frage passend zum Raumtyp', () => {
    for (const { room, expected } of ROOM_SETS) {
      expect(questionKeys(false, room)[0], String(room)).toBe(expected)
    }
  })

  it('stellt in jedem Fragensatz genau drei Fragen ohne Dopplung', () => {
    const sets = [UNDERFLOOR_KEYS, ...ROOM_SETS.map((r) => questionKeys(false, r.room))]
    for (const keys of sets) {
      expect(keys, keys.join('/')).toHaveLength(3)
      expect(new Set(keys).size, keys.join('/')).toBe(3)
    }
  })

  it('behält den Raumtyp bei Fußbodenheizung ohne Wirkung auf die Fragen', () => {
    expect(questionKeys(true, 'kitchen')).toEqual(UNDERFLOOR_KEYS)
    expect(questionKeys(true, 'bathroom')).toEqual(UNDERFLOOR_KEYS)
  })

  it('fragt in beiden Fällen den Temperaturfühler ab', () => {
    expect(questionKeys(false)).toContain('valve')
    expect(questionKeys(true)).toContain('thermostat')
  })
})

describe('Möbel-Abstand – Texte', () => {
  for (const [locale, dict] of [
    ['de', de],
    ['en', en],
  ] as const) {
    const fs = (dict as Record<string, never>)['measurements']['furniture_spacing']

    it(`hat in ${locale} zu jeder Frage einen Text`, () => {
      for (const key of ALL_KEYS) {
        expect(fs.run.questions[key], `${locale}/${key}`).toBeTruthy()
      }
    })

    it(`hat in ${locale} zu jedem Befund Titel, Begründung und Handlung`, () => {
      for (const key of ALL_KEYS) {
        const f = fs.result.findings[key]
        expect(f, `${locale}/${key}`).toBeTruthy()
        for (const field of ['partly', 'yes', 'why', 'action']) {
          expect(typeof f[field], `${locale}/${key}/${field}`).toBe('string')
          expect((f[field] as string).length, `${locale}/${key}/${field}`).toBeGreaterThan(0)
        }
      }
    })

    it(`verweist in ${locale} nur auf echte Befund-Schlüssel je Raum`, () => {
      // Ein Tippfehler hier fiele sonst nicht auf: Die UI fällt still auf die
      // allgemeine Formulierung zurück.
      for (const [room, questions] of Object.entries(fs.run.questionsByRoom)) {
        for (const key of Object.keys(questions as object)) {
          expect(ALL_KEYS, `${locale}/${room}/${key}`).toContain(key as FindingKey)
        }
      }
    })

    it(`hat in ${locale} die Texte der Abstandsmessung`, () => {
      for (const key of ['measureToggle', 'distanceUnit', 'distanceHint']) {
        expect(typeof fs.run[key], `${locale}/run/${key}`).toBe('string')
      }
      for (const key of ['distanceTitle', 'distanceContext']) {
        expect(typeof fs.result[key], `${locale}/result/${key}`).toBe('string')
      }
      // Die Empfehlung darf nicht doppelt gepflegt werden.
      expect(fs.run.distanceHint, locale).toContain('{{target}}')
      expect(fs.result.distanceContext, locale).toContain('{{target}}')
    })

    it(`behauptet in ${locale} keinen Wärmeverlust mehr im Ergebnistext`, () => {
      // Fachlich falsch: Der Heizkörper steht innerhalb der Hülle, die Wärme
      // kommt im Raum an – gestört wird die Verteilung und die Regelung.
      const summaries = Object.values(fs.result.summary) as string[]
      for (const text of summaries) {
        expect(text.toLowerCase(), locale).not.toContain('kommt nicht im raum an')
        expect(text.toLowerCase(), locale).not.toContain('wärme verloren')
      }
      expect(fs.result.mechanism.length, locale).toBeGreaterThan(0)
    })
  }
})

describe('Möbel-Abstand – gemessener Abstand', () => {
  it('wertet ab der Empfehlung als frei', () => {
    expect(answerFromDistance(DISTANCE_TARGET_CM)).toBe(0)
    expect(answerFromDistance(DISTANCE_TARGET_CM + 5)).toBe(0)
    expect(answerFromDistance(DISTANCE_MAX_CM)).toBe(0)
  })

  it('wertet knapp darunter als teilweise', () => {
    expect(answerFromDistance(DISTANCE_TARGET_CM - 1)).toBe(1)
    expect(answerFromDistance(DISTANCE_BLOCKED_CM)).toBe(1)
  })

  it('wertet unterhalb der Blockadegrenze als blockiert', () => {
    expect(answerFromDistance(DISTANCE_BLOCKED_CM - 1)).toBe(2)
    expect(answerFromDistance(DISTANCE_MIN_CM)).toBe(2)
  })

  it('bleibt über den ganzen Eingabebereich monoton', () => {
    let previous = answerFromDistance(DISTANCE_MIN_CM)
    for (let cm = DISTANCE_MIN_CM; cm <= DISTANCE_MAX_CM; cm++) {
      const current = answerFromDistance(cm)
      expect(current, `${cm} cm`).toBeLessThanOrEqual(previous)
      previous = current
    }
  })

  it('fällt bei unbrauchbarer Eingabe auf „frei" zurück, statt zu beanstanden', () => {
    expect(answerFromDistance(Number.NaN)).toBe(0)
  })

  it('hat einen Default innerhalb der Grenzen', () => {
    expect(DISTANCE_DEFAULT_CM).toBeGreaterThanOrEqual(DISTANCE_MIN_CM)
    expect(DISTANCE_DEFAULT_CM).toBeLessThanOrEqual(DISTANCE_MAX_CM)
    expect(DISTANCE_BLOCKED_CM).toBeLessThan(DISTANCE_TARGET_CM)
  })

  it('bietet die Messung nur an, wo ein Abstand messbar ist', () => {
    expect(supportsDistance('furniture')).toBe(true)
    // Überbaute Einbaumöbel und Handtücher haben keinen sinnvollen Abstand;
    // bei Fußbodenheizung ebenso wenig.
    for (const key of ALL_KEYS.filter((k) => k !== 'furniture')) {
      expect(supportsDistance(key), key).toBe(false)
    }
  })

  it('liefert in jedem Fragensatz höchstens eine Abstandsfrage', () => {
    const sets = [UNDERFLOOR_KEYS, ...ROOM_SETS.map((r) => questionKeys(false, r.room))]
    for (const keys of sets) {
      expect(keys.filter(supportsDistance).length, keys.join('/')).toBeLessThanOrEqual(1)
    }
  })

  it('schlägt sich in der Gesamtbewertung nieder', () => {
    const keys = questionKeys(false)
    const rate = (cm: number) =>
      rateFurniture({ ...allAnswers(keys, 0), furniture: answerFromDistance(cm) }).rating

    expect(rate(DISTANCE_TARGET_CM)).toBe('good')
    expect(rate(DISTANCE_TARGET_CM - 1)).toBe('medium')
    expect(rate(DISTANCE_BLOCKED_CM - 1)).toBe('elevated')
    expect(rate(0)).toBe('elevated')
  })

  it('ergibt dasselbe wie die gleichbedeutende Antwort per Button', () => {
    const keys = questionKeys(false)
    // 2 cm entspricht "Ja", 7 cm entspricht "Teilweise".
    expect(rateFurniture({ ...allAnswers(keys, 0), furniture: answerFromDistance(2) })).toEqual(
      rateFurniture({ ...allAnswers(keys, 0), furniture: 2 }),
    )
    expect(rateFurniture({ ...allAnswers(keys, 0), furniture: answerFromDistance(7) })).toEqual(
      rateFurniture({ ...allAnswers(keys, 0), furniture: 1 }),
    )
  })

})
