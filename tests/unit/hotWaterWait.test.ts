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

// Der Wartezeit-Check setzte für die Dusche pauschal 9 l/min an – auch dann,
// wenn der Duschkopf-Check längst 14 gemessen hatte. Die App hatte den besseren
// Wert und benutzte ihn nicht.
describe('Warmwasser – gemessener Durchfluss schlägt den Richtwert', () => {
  const basis = { fixture: 'shower' as const, seconds: 30, waterPriceEurPerM3: 5, persons: 2 }

  it('verändert das Ergebnis nachweislich', () => {
    const ohne = calcHotWaterWait(basis)
    const mit = calcHotWaterWait({ ...basis, measuredShowerFlowLpm: 14 })

    expect(ohne.flowLpm).toBe(FIXTURES.shower.flowLpm)
    expect(ohne.flowMeasured).toBe(false)
    expect(mit.flowLpm).toBe(14)
    expect(mit.flowMeasured).toBe(true)
    // 14 statt 9 l/min – rund 56 % mehr ungenutztes Wasser.
    expect(mit.litersPerDraw).toBeGreaterThan(ohne.litersPerDraw)
    expect(mit.litersPerDraw / ohne.litersPerDraw).toBeCloseTo(14 / 9, 2)
  })

  it('rechnet ohne Duschkopf-Messung wie bisher', () => {
    // Keine stille Verschlechterung für Nutzer, die den einen Check nicht
    // gemacht haben.
    const ohne = calcHotWaterWait(basis)
    expect(ohne.litersPerDraw).toBeCloseTo((30 / 60) * FIXTURES.shower.flowLpm, 5)
  })

  it('überträgt den Duschwert nicht auf andere Entnahmestellen', () => {
    // Gemessen wurde an der Dusche. Ein Waschbecken mit dem Duschkopf-Wert zu
    // rechnen wäre schlechter als der Richtwert, nicht besser.
    for (const fixture of ['bath', 'kitchen', 'washbasin'] as const) {
      const calc = calcHotWaterWait({ ...basis, fixture, measuredShowerFlowLpm: 14 })
      expect(calc.flowLpm, fixture).toBe(FIXTURES[fixture].flowLpm)
      expect(calc.flowMeasured, fixture).toBe(false)
    }
  })

  it('ignoriert unbrauchbare Messwerte, statt mit ihnen zu rechnen', () => {
    for (const wert of [0, -3, NaN, undefined]) {
      const calc = calcHotWaterWait({ ...basis, measuredShowerFlowLpm: wert })
      expect(calc.flowLpm).toBe(FIXTURES.shower.flowLpm)
      expect(calc.flowMeasured).toBe(false)
    }
  })
})
