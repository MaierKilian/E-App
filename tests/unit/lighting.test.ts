// Prüfungen am Beleuchtungs-Check.
//
// Der Check hatte zwei Schwächen, die diese Tests festhalten sollen:
// Er zeigte einen Euro-Punktwert an der App-eigenen Anzeigeregel vorbei
// (savingsDisplay.ts) und er nannte nur den Ertrag, nie den Einsatz – womit er
// seine eigene Leitfrage („lohnt sich das?") gar nicht beantwortete.

import { describe, expect, it } from 'vitest'
import {
  BULB_COST_EUR,
  BULB_SAVE_W,
  BULB_TYPES,
  USAGE_FACTOR,
  USAGE_LEVELS,
  calcLighting,
  rateLighting,
  usageHours,
  type BulbType,
} from '@/features/measurements/lighting/lighting'
import {
  baseHoursFor,
  lampHintFor,
  HOURS_BASE,
  ROOM_LAMP_HINT,
} from '@/features/measurements/lighting/roomLampDefaults'
import { displaySavingEur, isMeasuredSaving } from '@/features/measurements/savingsDisplay'
import type { RoomType } from '@/types'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

const NONE: Record<BulbType, number> = { incandescent: 0, halogen: 0, spot: 0 }

describe('calcLighting', () => {
  it('liefert bei nichts zu tauschen einen sauberen Null-Zustand', () => {
    const r = calcLighting({ counts: NONE, hoursPerDay: 3, workPriceCt: 34 })
    expect(r.totalBulbs).toBe(0)
    expect(r.yearlySaving).toBe(0)
    expect(r.investEur).toBe(0)
    // Ohne Ersparnis gibt es keine Amortisation – und keine erfundene Zahl.
    expect(r.paybackMonths).toBeUndefined()
    expect(r.rating).toBe('good')
  })

  it('rechnet Ersparnis und Investition aus denselben Zählern', () => {
    const counts = { incandescent: 2, halogen: 0, spot: 4 }
    const r = calcLighting({ counts, hoursPerDay: 3, workPriceCt: 34 })
    expect(r.totalBulbs).toBe(6)
    expect(r.investEur).toBe(2 * BULB_COST_EUR.incandescent + 4 * BULB_COST_EUR.spot)
    const savedW = 2 * BULB_SAVE_W.incandescent + 4 * BULB_SAVE_W.spot
    expect(r.annualKwh).toBe(Math.round((savedW * 3 * 365) / 1000))
  })

  it('nennt die Amortisation in Monaten und rundet auf', () => {
    // 4 Spots, viel Licht: Investition 16 €, Ersparnis deutlich darüber.
    const r = calcLighting({
      counts: { incandescent: 0, halogen: 0, spot: 4 },
      hoursPerDay: 4,
      workPriceCt: 34,
    })
    expect(r.investEur).toBe(16)
    expect(r.paybackMonths).toBeDefined()
    expect(r.paybackMonths).toBe(Math.ceil(r.investEur / (r.yearlySaving / 12)))
    // Der Kernbefund des Checks: der Tausch trägt sich in unter einem Jahr.
    expect(r.paybackMonths!).toBeLessThan(12)
  })

  it('ignoriert unsinnige Eingaben statt sie durchzurechnen', () => {
    const r = calcLighting({
      counts: { incandescent: -3, halogen: 1.7, spot: 500 },
      hoursPerDay: -1,
      workPriceCt: 34,
    })
    expect(r.totalBulbs).toBe(0 + 1 + 99)
    expect(r.annualKwh).toBe(0)
    expect(r.yearlySaving).toBe(0)
  })
})

describe('Nutzungsstufen', () => {
  it('skalieren den typischen Raumwert', () => {
    expect(usageHours(2, 'low')).toBe(1)
    expect(usageHours(2, 'normal')).toBe(2)
    expect(usageHours(2, 'high')).toBe(4)
  })

  it('bleiben in einem plausiblen Rahmen', () => {
    expect(usageHours(0.5, 'low')).toBeGreaterThan(0)
    expect(usageHours(12, 'high')).toBeLessThanOrEqual(16)
  })

  it('sind streng geordnet – wenig < normal < viel', () => {
    const [low, normal, high] = USAGE_LEVELS.map((l) => USAGE_FACTOR[l])
    expect(low).toBeLessThan(normal)
    expect(normal).toBeLessThan(high)
  })
})

describe('Anzeige-Regel der App', () => {
  it('markiert eine nicht bestätigte Nutzung als Schätzung', () => {
    // So schreibt LightingRun die Details, wenn keine Stufe gewählt wurde.
    expect(isMeasuredSaving({ savingEstimated: 1 })).toBe(false)
    expect(isMeasuredSaving({ savingEstimated: 0 })).toBe(true)
  })

  it('nennt kleine Beträge nicht in Euro', () => {
    // Ein Schlafzimmer mit einer Birne: real, aber unter der Schwelle.
    const r = calcLighting({
      counts: { incandescent: 1, halogen: 0, spot: 0 },
      hoursPerDay: 1.5,
      workPriceCt: 34,
    })
    expect(r.yearlySaving).toBeGreaterThan(0)
    expect(displaySavingEur(r.yearlySaving)).toBeUndefined()
    // Statt Euro bleibt die gezählte Größe – die muss es also geben.
    expect(r.annualKwh).toBeGreaterThan(0)
  })

  it('zeigt Euro erst, wo der Betrag trägt', () => {
    const r = calcLighting({
      counts: { incandescent: 3, halogen: 2, spot: 4 },
      hoursPerDay: 4,
      workPriceCt: 34,
    })
    expect(displaySavingEur(r.yearlySaving)).toBeDefined()
  })
})

describe('rateLighting', () => {
  it('steigt monoton mit der Ersparnis', () => {
    expect(rateLighting(0)).toBe('good')
    expect(rateLighting(5)).toBe('medium')
    expect(rateLighting(15)).toBe('elevated')
    expect(rateLighting(60)).toBe('high')
  })
})

describe('Raum-Vorbelegung', () => {
  const ROOM_TYPES = Object.keys(HOURS_BASE) as RoomType[]

  it('kennt jeden Raumtyp mit Brenndauer und Lampen-Vorschlag', () => {
    for (const type of ROOM_TYPES) {
      expect(baseHoursFor(type)).toBeGreaterThan(0)
      expect(ROOM_LAMP_HINT[type]).toBeDefined()
    }
  })

  it('schlägt nie eine leere Maske vor', () => {
    for (const type of ROOM_TYPES) {
      const hint = lampHintFor(type)
      const total = BULB_TYPES.reduce((sum, b) => sum + hint[b], 0)
      expect(total).toBeGreaterThan(0)
    }
  })

  it('bleibt konservativ – der Vorschlag darf keine Ersparnis erfinden', () => {
    for (const type of ROOM_TYPES) {
      const hint = lampHintFor(type)
      const total = BULB_TYPES.reduce((sum, b) => sum + hint[b], 0)
      expect(total).toBeLessThanOrEqual(3)
    }
  })

  it('fällt bei unbekanntem Raum auf sichere Werte zurück', () => {
    expect(baseHoursFor(undefined)).toBeGreaterThan(0)
    expect(lampHintFor(undefined)).toEqual(NONE)
  })
})

describe('Texte', () => {
  const RUN_KEYS = [
    'bulbsTitle',
    'bulbsHint',
    'allLed',
    'usageTitle',
    'usageHint',
    'usageChosen',
    'usageOpen',
    'savingLabel',
    'savingRange',
    'savingKwh',
    'savingSmall',
    'payback',
    'paybackSlow',
    'stateDone',
    'stateNeedsUsage_one',
    'stateNeedsUsage_other',
    'assumptions',
    'assumptionsTitle',
  ]
  const RESULT_KEYS = [
    'perYear',
    'rangeValue',
    'payback',
    'paybackSlow',
    'paybackHint_one',
    'paybackHint_other',
    'noticeSmall',
    'noticeEstimated',
    'doneBadge',
    'doneSummary',
    'doneTip',
    'assumptions',
  ]

  for (const [name, dict] of [
    ['de', de],
    ['en', en],
  ] as const) {
    it(`hat alle Schlüssel in ${name}`, () => {
      const run = dict.measurements.lighting.run as Record<string, unknown>
      const result = dict.measurements.lighting.result as Record<string, unknown>
      for (const key of RUN_KEYS) expect(run[key], `run.${key}`).toBeTruthy()
      for (const key of RESULT_KEYS) expect(result[key], `result.${key}`).toBeTruthy()
      for (const level of USAGE_LEVELS) {
        expect((run.usageLevels as Record<string, string>)[level]).toBeTruthy()
      }
      for (const type of BULB_TYPES) {
        expect((run.bulbTypes as Record<string, string>)[type]).toBeTruthy()
        expect((run.bulbExamples as Record<string, string>)[type]).toBeTruthy()
      }
      expect(Array.isArray(run.assumptionsItems)).toBe(true)
    })
  }
})
