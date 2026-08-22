// Prüfungen am Warmwasser-Wartezeit-Check.
//
// Die empfohlenen Entnahmestellen tragen kein Badge mehr, sondern stehen vorn.
// Damit hängt die Empfehlung an der Reihenfolge – das sichert dieser Test ab,
// weil eine falsch sortierte Liste sonst unbemerkt bliebe.

import { describe, expect, it } from 'vitest'
import {
  CALIBRATION_PERSONS,
  FIXTURES,
  FIXTURE_ORDER,
  calcHotWaterWait,
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

describe('Warmwasser – Hochrechnung', () => {
  const base = { fixture: 'shower' as const, seconds: 20, waterPriceEurPerM3: 4.5 }

  it('skaliert die Jahresmenge mit der Haushaltsgröße', () => {
    // Vorher war die Zapfhäufigkeit eine Konstante: Ein Single und eine
    // vierköpfige Familie bekamen dieselbe Zahl.
    const single = calcHotWaterWait({ ...base, persons: 1 })
    const family = calcHotWaterWait({ ...base, persons: 4 })
    // Toleranz nur fuer das Runden der Jahresmenge auf ganze Liter.
    expect(Math.abs(family.litersPerYear - single.litersPerYear * 4)).toBeLessThanOrEqual(4)
  })

  it('reproduziert bei der Kalibrierungsgröße die bisherigen Haushaltswerte', () => {
    // Kalibrierung: 2 Personen → Dusche 1,5 Zapfungen/Tag (wie zuvor pauschal).
    const { litersPerYear } = calcHotWaterWait({ ...base, persons: CALIBRATION_PERSONS })
    const litersPerDraw = (base.seconds / 60) * FIXTURES.shower.flowLpm
    expect(litersPerYear).toBe(Math.round(litersPerDraw * 1.5 * 365))
  })

  it('rechnet ein Profil ohne Personenangabe wie einen Ein-Personen-Haushalt', () => {
    const fallback = calcHotWaterWait({ ...base, persons: 0 })
    expect(fallback.litersPerYear).toBe(calcHotWaterWait({ ...base, persons: 1 }).litersPerYear)
  })

  it('bleibt ohne Wasserpreis bei einer Menge ohne Euro-Behauptung', () => {
    const free = calcHotWaterWait({ ...base, waterPriceEurPerM3: 0, persons: 2 })
    expect(free.litersPerYear).toBeGreaterThan(0)
    expect(free.yearlySaving).toBe(0)
  })
})
