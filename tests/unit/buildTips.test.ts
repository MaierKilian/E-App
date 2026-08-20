// Empfehlungen: Woher ein Tipp kommt, und in welcher Reihenfolge er erscheint.
//
// Der Kern ist die Reihenfolge: Maßnahmen, die nichts kosten und sofort gehen,
// stehen vor allem anderen – auch vor größeren Ersparnissen. Eine reine
// €-Sortierung schob früher „Sofa vom Heizkörper wegrücken" hinter „smarte
// Thermostate für 120 €".

import { describe, expect, it } from 'vitest'
import { buildTips } from '@/features/tips/buildTips'
import type { MeasurementResult } from '@/features/measurements/types'
import type { OnboardingData } from '@/types'

const NOW = '2026-08-19T08:00:00.000Z'

/** Profil mit Heizkörpern in Wohnzimmer und zwei Schlafzimmern. */
const PROFILE = {
  rooms: [
    { type: 'living_room', count: 1, heatTransfer: 'radiator' },
    { type: 'bedroom', count: 2, heatTransfer: 'radiator' },
  ],
  smartHomeDevices: [],
  occupancyStatus: 'tenant',
} as unknown as OnboardingData

function result(partial: Partial<MeasurementResult> & { id: string }): MeasurementResult {
  return { rating: 'elevated', primaryValue: 0, unit: '', completedAt: NOW, ...partial }
}

describe('buildTips – Herkunft', () => {
  it('liefert ohne Messergebnisse keine Tipps', () => {
    expect(buildTips(PROFILE, {})).toEqual([])
  })

  it('empfiehlt smarte Thermostate nur, wenn beim Heizen etwas auffällig war', () => {
    // Nur ein Strom-Befund: kein Anlass für eine Heizungs-Empfehlung.
    const electricityOnly = buildTips(PROFILE, {
      lighting: result({ id: 'lighting', details: { avoidableCost: 45, totalBulbs: 7 } }),
    })
    expect(electricityOnly.map((t) => t.id)).not.toContain('smart_thermostat')

    // Mit einem Heizungs-Befund wird sie begründbar.
    const withHeating = buildTips(PROFILE, {
      'furniture_spacing@living_room#0': result({
        id: 'furniture_spacing',
        roomKey: 'living_room#0',
      }),
    })
    expect(withHeating.map((t) => t.id)).toContain('smart_thermostat')
  })

  it('nennt den betroffenen Raum, damit gegensätzliche Befunde lesbar bleiben', () => {
    const tips = buildTips(PROFILE, {
      'room_temperature@living_room#0': result({
        id: 'room_temperature',
        roomKey: 'living_room#0',
        details: { temperature: 23.4, bandMin: 20, bandMax: 22 },
      }),
      'room_temperature@bedroom#1': result({
        id: 'room_temperature',
        roomKey: 'bedroom#1',
        details: { temperature: 14.2, bandMin: 17, bandMax: 19 },
      }),
    })

    const warm = tips.find((t) => t.id === 'room_temperature')
    const cold = tips.find((t) => t.id === 'room_cold')
    expect(warm?.room).toEqual({ type: 'living_room', index: 0, total: 1 })
    // Der zweite Schlafzimmer-Eintrag behält seinen Index für „Schlafzimmer 2".
    expect(cold?.room).toEqual({ type: 'bedroom', index: 1, total: 2 })
  })

  it('führt bei hoher Grundlast in den Standby-Check, statt ihn zu beschreiben', () => {
    const tips = buildTips(PROFILE, {
      base_load: result({ id: 'base_load', rating: 'high', primaryValue: 210, unit: 'W' }),
    })
    expect(tips.find((t) => t.id === 'base_load')?.linkTo).toBe('/measurements/standby')
  })

  it('lässt den Grundlast-Tipp weg, sobald der Standby-Check erledigt ist', () => {
    const tips = buildTips(PROFILE, {
      base_load: result({ id: 'base_load', rating: 'high', primaryValue: 210, unit: 'W' }),
      standby: result({ id: 'standby', details: { avoidableCost: 30 } }),
    })
    expect(tips.map((t) => t.id)).not.toContain('base_load')
    expect(tips.map((t) => t.id)).toContain('standby')
  })
})

describe('buildTips – Reihenfolge', () => {
  const RESULTS: Record<string, MeasurementResult> = {
    // Kostet 20 €, spart aber am meisten.
    showerhead: result({
      id: 'showerhead',
      primaryValue: 14,
      unit: 'L/min',
      details: { yearlySaving: 95 },
    }),
    // Kostet nichts, dauert eine Minute, spart weniger.
    hot_water_wait: result({
      id: 'hot_water_wait',
      primaryValue: 19,
      unit: 's',
      details: { yearlySaving: 18, litersPerDraw: 3.1 },
    }),
    // Kostet nichts, dauert aber einen Nachmittag.
    freezer: result({ id: 'freezer', details: { iced: 1, avoidableCost: 40 } }),
  }

  it('stellt kostenlose Sofortmaßnahmen vor teurere mit höherer Ersparnis', () => {
    const ids = buildTips(PROFILE, RESULTS).map((t) => t.id)
    expect(ids.indexOf('hot_water_wait')).toBeLessThan(ids.indexOf('showerhead'))
  })

  it('zählt eine kostenlose, aber langwierige Maßnahme nicht als Sofortmaßnahme', () => {
    const ids = buildTips(PROFILE, RESULTS).map((t) => t.id)
    // Abtauen kostet nichts, dauert aber ~1 Std – es steht deshalb hinter dem
    // Duschkopf, der mehr spart, und nicht vorne bei den Ein-Minuten-Tipps.
    expect(ids.indexOf('hot_water_wait')).toBeLessThan(ids.indexOf('freezer'))
    expect(ids.indexOf('showerhead')).toBeLessThan(ids.indexOf('freezer'))
  })

  it('sortiert innerhalb der Sofortmaßnahmen nach Ersparnis', () => {
    const ids = buildTips(PROFILE, {
      hot_water_wait: RESULTS.hot_water_wait,
      fridge: result({ id: 'fridge', details: { temperature: 3, yearlySaving: 40 } }),
    }).map((t) => t.id)
    expect(ids).toEqual(['fridge', 'hot_water_wait'])
  })

  it('gibt jedem Tipp Aufwand und Kosten mit', () => {
    for (const tip of buildTips(PROFILE, RESULTS)) {
      expect(Number.isFinite(tip.effortMinutes)).toBe(true)
      expect(Number.isFinite(tip.costEur)).toBe(true)
    }
  })
})
