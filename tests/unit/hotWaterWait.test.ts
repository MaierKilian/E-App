// Prüfungen am Warmwasser-Wartezeit-Check.
//
// Die empfohlenen Entnahmestellen tragen kein Badge mehr, sondern stehen vorn.
// Damit hängt die Empfehlung an der Reihenfolge – das sichert dieser Test ab,
// weil eine falsch sortierte Liste sonst unbemerkt bliebe.

import { describe, expect, it } from 'vitest'
import {
  FIXTURES,
  FIXTURE_ORDER,
  type FixtureType,
} from '@/features/measurements/hot_water_wait/hotWaterWait'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

describe('Warmwasser – Entnahmestellen', () => {
  it('listet jede Entnahmestelle genau einmal', () => {
    const keys = Object.keys(FIXTURES) as FixtureType[]
    expect([...FIXTURE_ORDER].sort()).toEqual([...keys].sort())
  })

  it('stellt die empfohlenen Stellen voran', () => {
    const flags = FIXTURE_ORDER.map((k) => FIXTURES[k].recommended)
    const firstUnrecommended = flags.indexOf(false)
    expect(firstUnrecommended, 'mindestens eine Empfehlung erwartet').toBeGreaterThan(0)
    expect(flags.slice(firstUnrecommended), 'Empfehlung nach einer Nicht-Empfehlung').not.toContain(
      true,
    )
  })

  for (const [locale, dict] of [
    ['de', de],
    ['en', en],
  ] as const) {
    it(`hat in ${locale} zu jeder Stelle Name und Kurzhinweis`, () => {
      const hw = (dict as Record<string, never>)['measurements']['hot_water_wait']
      for (const key of FIXTURE_ORDER) {
        expect(typeof hw.fixtures[key], `${locale}/${key}`).toBe('string')
        expect(typeof hw.run.fixtureHints[key], `${locale}/${key}`).toBe('string')
      }
    })

    it(`hat in ${locale} die Hinweise statt des toten Buttons`, () => {
      const run = (dict as Record<string, never>)['measurements']['hot_water_wait']['run']
      for (const key of ['hintFixture', 'hintStopwatch', 'stagnationHint', 'manualLabel']) {
        expect(typeof run[key], `${locale}/${key}`).toBe('string')
      }
    })
  }
})
