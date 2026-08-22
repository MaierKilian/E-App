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

  it('empfiehlt keine Anschaffung, deren Nutzen die App nicht beziffern kann', () => {
    // Die frühere Thermostat-Empfehlung riet zu 120 € Ausgabe, ohne sagen zu
    // können, was sie einbringt. Sie ist ersatzlos entfallen.
    const withHeating = buildTips(PROFILE, {
      'furniture_spacing@living_room#0': result({
        id: 'furniture_spacing',
        roomKey: 'living_room#0',
      }),
    })
    expect(withHeating.map((t) => t.id)).not.toContain('smart_thermostat')
    expect(withHeating.every((tip) => tip.costEur <= 25)).toBe(true)
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
    // Abtauen kostet nichts, dauert aber ~1 Std – es steht deshalb nicht vorne
    // bei den Ein-Minuten-Tipps, sondern hinter ihnen.
    expect(ids.indexOf('hot_water_wait')).toBeLessThan(ids.indexOf('freezer'))
  })

  it('sortiert innerhalb der Sofortmaßnahmen nach Ersparnis', () => {
    const ids = buildTips(PROFILE, {
      hot_water_wait: RESULTS.hot_water_wait,
      fridge: result({ id: 'fridge', details: { temperature: 3, yearlySaving: 40 } }),
    }).map((t) => t.id)
    expect(ids).toEqual(['fridge', 'hot_water_wait'])
  })

  it('nimmt Wartezeit und Menge des Warmwasser-Tipps aus derselben Entnahmestelle', () => {
    // Zwei getrennte Maxima ueber alle Entnahmestellen ergaben frueher einen
    // Satz, dessen Sekunden vom einen und dessen Liter vom anderen Hahn kamen.
    const tips = buildTips(PROFILE, {
      'hot_water_wait@kitchen': result({
        id: 'hot_water_wait',
        roomKey: 'kitchen',
        primaryValue: 45,
        details: { yearlySaving: 4, litersPerDraw: 4.5, litersPerYear: 900 },
      }),
      'hot_water_wait@shower': result({
        id: 'hot_water_wait',
        roomKey: 'shower',
        primaryValue: 12,
        details: { yearlySaving: 30, litersPerDraw: 1.8, litersPerYear: 6000 },
      }),
    })
    const hw = tips.find((t) => t.id === 'hot_water_wait')
    // Die Dusche traegt am meisten bei – ihre Sekunden UND ihre Liter.
    expect(hw?.params).toMatchObject({ seconds: 12, liters: 1.8 })
    // Die Jahresmenge deckt dagegen alle gemessenen Stellen ab.
    expect(hw?.params?.litersPerYear).toBe(6900)
  })

  it('behaelt den Warmwasser-Tipp ohne belastbaren Euro-Betrag', () => {
    // Ohne Wasserpreis gibt es keine Ersparnis in Euro – die gemessene Menge
    // bleibt trotzdem ein gueltiger Grund, den Vorlauf aufzufangen.
    const tips = buildTips(PROFILE, {
      hot_water_wait: result({
        id: 'hot_water_wait',
        primaryValue: 40,
        details: { yearlySaving: 0, litersPerDraw: 6, litersPerYear: 3200 },
      }),
    })
    const hw = tips.find((t) => t.id === 'hot_water_wait')
    expect(hw).toBeDefined()
    expect(hw?.savingEur).toBeUndefined()
    expect(hw?.params?.litersPerYear).toBe(3200)
  })

  it('gibt jedem Tipp Aufwand und Kosten mit', () => {
    for (const tip of buildTips(PROFILE, RESULTS)) {
      expect(Number.isFinite(tip.effortMinutes)).toBe(true)
      expect(Number.isFinite(tip.costEur)).toBe(true)
    }
  })
})

describe('buildTips – Euro nur, wo die Rechnung ihn hergibt', () => {
  it('nennt beim Duschkopf Wasser statt Euro', () => {
    // Der Euro-Betrag laeuft ueber angenommene Duschdauer, Warmwasseranteil und
    // Temperaturhub. Die Wassermenge folgt direkt aus dem gemessenen Durchfluss.
    const [tip] = buildTips(PROFILE, {
      showerhead: result({
        id: 'showerhead',
        primaryValue: 14,
        details: { yearlySaving: 95, litersSavedPerYear: 5500, savingEstimated: 1 },
      }),
    })
    expect(tip.savingEur).toBeUndefined()
    expect(tip.quantity).toEqual({
      key: 'tips.quantity.waterSaved',
      params: { liters: 5500 },
    })
  })

  it('nennt bei der Raumtemperatur die Prozent-Aussage des Modells', () => {
    const tips = buildTips(PROFILE, {
      'room_temperature@living_room#0': result({
        id: 'room_temperature',
        roomKey: 'living_room#0',
        details: { temperature: 24, bandMin: 20, bandMax: 22, savingPercent: 12, yearlySaving: 40 },
      }),
    })
    const warm = tips.find((t) => t.id === 'room_temperature')
    expect(warm?.savingEur).toBeUndefined()
    expect(warm?.quantity?.key).toBe('tips.quantity.heatingPercent')
    expect(warm?.quantity?.params.percent).toBe(12)
  })

  it('zeigt den Kühlschrank-Betrag nur bei einer echten Strommessung', () => {
    const estimated = buildTips(PROFILE, {
      fridge: result({ id: 'fridge', details: { temperature: 3, yearlySaving: 40, savingEstimated: 1 } }),
    })
    expect(estimated.find((t) => t.id === 'fridge')?.savingEur).toBeUndefined()

    const measured = buildTips(PROFILE, {
      fridge: result({ id: 'fridge', details: { temperature: 3, yearlySaving: 40, savingEstimated: 0 } }),
    })
    expect(measured.find((t) => t.id === 'fridge')?.savingEur).toBe(40)
  })

  it('behält den Euro-Betrag bei gemessener Dauerleistung', () => {
    // Standby und Beleuchtung rechnen Watt mal Zeit mal Preis – ohne
    // Nutzungsannahme, deshalb bleibt der Betrag.
    const tips = buildTips(PROFILE, {
      standby: result({ id: 'standby', details: { avoidableCost: 42, dev0_tv: 12 } }),
    })
    expect(tips.find((t) => t.id === 'standby')?.savingEur).toBe(42)
  })
})

describe('buildTips – Zählerstände', () => {
  /** Zwei Jahre Ablesungen; das zweite Jahr liegt um `factor` höher. */
  function twoYears(startValue: number, firstYear: number, factor: number) {
    return [
      { id: 'a', date: '2024-08-01', value: startValue },
      { id: 'b', date: '2025-08-01', value: startValue + firstYear },
      { id: 'c', date: '2026-08-01', value: startValue + firstYear + firstYear * factor },
    ]
  }

  it('macht aus einem deutlich steigenden Verbrauch eine Empfehlung', () => {
    const tips = buildTips(
      PROFILE,
      {},
      {
        readings: { electricity: twoYears(1000, 2000, 1.3) },
        eurPerUnit: { electricity: 0.35 },
      },
    )
    const trend = tips.find((t) => t.id === 'consumption_up_electricity')
    expect(trend, 'Trend-Tipp erwartet').toBeDefined()
    expect(trend?.textId).toBe('consumption_up')
    expect(trend?.params?.percent).toBe(30)
    expect(trend?.linkTo).toBe('/monitoring/electricity')
    // Mehrmenge und Mehrkosten stammen aus Ablesung mal Preis.
    expect(trend?.quantity?.key).toBe('tips.quantity.moreWithCost')
    expect(trend?.quantity?.params.amount).toBe(600)
    expect(trend?.quantity?.params.cost).toBe(210)
  })

  it('schweigt bei einem Verbrauch, der kaum steigt', () => {
    const tips = buildTips(PROFILE, {}, { readings: { electricity: twoYears(1000, 2000, 1.04) } })
    expect(tips.map((t) => t.id)).not.toContain('consumption_up_electricity')
  })

  it('nennt ohne Preis nur die Menge', () => {
    const tips = buildTips(PROFILE, {}, { readings: { electricity: twoYears(1000, 2000, 1.3) } })
    const trend = tips.find((t) => t.id === 'consumption_up_electricity')
    expect(trend?.quantity?.key).toBe('tips.quantity.more')
  })

  it('kommt ohne Zählerstände wie bisher aus', () => {
    expect(buildTips(PROFILE, {})).toEqual([])
  })
})
