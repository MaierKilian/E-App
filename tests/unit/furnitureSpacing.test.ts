// Prüfungen am Möbel-Abstands-Check.
//
// Der Check lebt davon, dass die Ausgabe von der Eingabe abhängt: Früher stand
// eine feste Empfehlungsliste im Ergebnis, die auch Punkte nannte, die gar nicht
// zutrafen. Die Tests sichern, dass nur zutreffende Befunde entstehen – und dass
// zu jedem Befund die Texte tatsächlich hinterlegt sind.

import { describe, expect, it } from 'vitest'
import {
  questionKeys,
  rateFurniture,
  RADIATOR_KEYS,
  UNDERFLOOR_KEYS,
  type FindingKey,
  type FurnitureAnswers,
} from '@/features/measurements/furniture_spacing/furnitureSpacing'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

const ALL_KEYS: FindingKey[] = [...RADIATOR_KEYS, ...UNDERFLOOR_KEYS]

/** Alle Fragen mit derselben Antwort belegen. */
function allAnswers(keys: FindingKey[], value: 0 | 1 | 2): FurnitureAnswers {
  return Object.fromEntries(keys.map((k) => [k, value])) as FurnitureAnswers
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
    expect(rateFurniture({ cover: 1 }).findings[0].level).toBe('partly')
    expect(rateFurniture({ cover: 2 }).findings[0].level).toBe('yes')
  })

  it('sortiert den wichtigsten Befund nach oben', () => {
    const calc = rateFurniture({ furniture: 2, cover: 1, valve: 2 })
    expect(calc.findings[0].key).toBe('valve')
  })
})

describe('Möbel-Abstand – Gewichtung', () => {
  it('wiegt den gestörten Temperaturfühler schwerer als ein Möbel davor', () => {
    const valve = rateFurniture({ valve: 2 }).score
    const furniture = rateFurniture({ furniture: 2 }).score
    expect(valve).toBeGreaterThan(furniture)
    expect(rateFurniture({ thermostat: 2 }).score).toBeGreaterThan(
      rateFurniture({ footless: 2 }).score,
    )
  })

  it('stuft einen einzelnen vollen Befund mindestens als elevated ein', () => {
    for (const key of ALL_KEYS) {
      expect(rateFurniture({ [key]: 2 } as FurnitureAnswers).rating, key).toBe('elevated')
    }
  })

  it('erreicht high erst bei mehreren oder schweren Befunden', () => {
    expect(rateFurniture({ valve: 1 }).rating).toBe('medium')
    expect(rateFurniture({ valve: 2, furniture: 2 }).rating).toBe('high')
    expect(rateFurniture(allAnswers(RADIATOR_KEYS, 2)).rating).toBe('high')
    expect(rateFurniture(allAnswers(UNDERFLOOR_KEYS, 2)).rating).toBe('high')
  })

  it('bewertet beide Wärmeübergaben mit derselben Spannweite', () => {
    expect(rateFurniture(allAnswers(RADIATOR_KEYS, 2)).score).toBe(
      rateFurniture(allAnswers(UNDERFLOOR_KEYS, 2)).score,
    )
  })
})

describe('Möbel-Abstand – Fragenauswahl', () => {
  it('stellt je Wärmeübergabe den passenden Satz', () => {
    expect(questionKeys(false)).toEqual(RADIATOR_KEYS)
    expect(questionKeys(true)).toEqual(UNDERFLOOR_KEYS)
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
