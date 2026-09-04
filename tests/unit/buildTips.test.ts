// Empfehlungen: Woher ein Tipp kommt, und in welcher Reihenfolge er erscheint.
//
// Der Kern ist die Reihenfolge: Maßnahmen, die nichts kosten und sofort gehen,
// stehen vor allem anderen – auch vor größeren Ersparnissen. Eine reine
// €-Sortierung schob früher „Sofa vom Heizkörper wegrücken" hinter „smarte
// Thermostate für 120 €".

import { describe, expect, it } from 'vitest'
import { buildTips, sortingGoals } from '@/features/tips/buildTips'
import type { MeasurementResult } from '@/features/measurements/types'
import type { OnboardingData } from '@/types'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

const NOW = '2026-08-19T08:00:00.000Z'

/** Profil mit Heizkörpern in Wohnzimmer und zwei Schlafzimmern. */
const PROFILE = {
  rooms: [
    { type: 'living_room', count: 1, heatTransfer: 'radiator' },
    { type: 'bedroom', count: 2, heatTransfer: 'radiator' },
  ],
  smartHomeDevices: [],
  occupancyStatus: 'tenant',
  heatGenerators: [],
  heatGeneratorYears: {},
} as unknown as OnboardingData

function result(partial: Partial<MeasurementResult> & { id: string }): MeasurementResult {
  return { rating: 'elevated', primaryValue: 0, unit: '', completedAt: NOW, ...partial }
}

describe('Alter des Wärmeerzeugers', () => {
  const withBoiler = (year: number) =>
    ({
      ...PROFILE,
      heatGenerators: ['gas_boiler'],
      heatGeneratorYears: { gas_boiler: year },
    }) as unknown as OnboardingData

  it('empfiehlt den Heizungstausch ab 20 Jahren – ohne jede Messung', () => {
    const tips = buildTips(withBoiler(new Date().getFullYear() - 24), {})
    const boiler = tips.find((t) => t.id === 'old_boiler')
    expect(boiler?.params?.years).toBe(24)
  })

  it('steht hinter den Sofortmaßnahmen', () => {
    // Der größte Hebel ist nicht der erste Schritt: Wer die Liste aufschlägt,
    // soll oben etwas finden, das er heute ohne Einkauf und Termin abhaken
    // kann – der Heizungstausch kostet Geld und einen Handwerkertermin.
    const tips = buildTips(withBoiler(new Date().getFullYear() - 24), {
      furniture_spacing: result({ id: 'furniture_spacing' }),
    })
    const ids = tips.map((t) => t.id)
    expect(ids).toContain('old_boiler')
    expect(ids.indexOf('old_boiler')).toBeGreaterThan(ids.indexOf('furniture_spacing'))
  })

  it('schweigt bei einer jungen Heizung', () => {
    const tips = buildTips(withBoiler(new Date().getFullYear() - 5), {})
    expect(tips.some((t) => t.id === 'old_boiler')).toBe(false)
  })
})

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

  it('sortiert bei gleichem Aufwand nach Ersparnis', () => {
    // Standby (42 €) und Abtauen (40 €) sind beide keine Sofortmaßnahmen –
    // Standby kostet 15 €, Abtauen dauert eine Stunde. Innerhalb dieser Gruppe
    // entscheidet der Betrag.
    //
    // Vorher stand hier Kühlschrank gegen Warmwasser-Wartezeit. Beide führen
    // heute gar keinen Euro-Betrag mehr (der Kühlschrank rechnet keinen, die
    // Wartezeit markiert ihren als geschätzt), womit der Test die
    // €-Sortierung nicht mehr prüfte, sondern nur noch Kosten und Aufwand.
    const ids = buildTips(PROFILE, {
      standby: result({ id: 'standby', details: { avoidableCost: 42, dev0_tv: 12 } }),
      freezer: result({ id: 'freezer', details: { iced: 1, avoidableCost: 40 } }),
    }).map((t) => t.id)
    expect(ids.indexOf('standby')).toBeLessThan(ids.indexOf('freezer'))
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

  it('nennt beim Kühlschrank keinen Euro-Betrag – auch nicht aus einem Altergebnis', () => {
    // Der Check rechnet keinen Euro-Betrag (nur `savingPct`). Ein Ergebnis aus
    // einer früheren Version trägt aber noch `yearlySaving`, und Ergebnisse
    // werden nie migriert. Ohne den Katalog-Riegel stand der Betrag wieder im
    // Tipp – auch dann, wenn er als „gemessen" markiert war.
    const tips = buildTips(PROFILE, {
      fridge: result({ id: 'fridge', details: { temperature: 3, yearlySaving: 40, savingEstimated: 0 } }),
    })
    const fridge = tips.find((t) => t.id === 'fridge')
    expect(fridge).toBeDefined()
    expect(fridge?.savingEur).toBeUndefined()
  })


  it('behält den Euro-Betrag bei gemessener Dauerleistung', () => {
    // Standby und Beleuchtung rechnen Watt mal Zeit mal Preis – ohne
    // Nutzungsannahme, deshalb bleibt der Betrag.
    const tips = buildTips(PROFILE, {
      standby: result({ id: 'standby', details: { avoidableCost: 42, dev0_tv: 12 } }),
    })
    expect(tips.find((t) => t.id === 'standby')?.savingEur).toBe(42)
  })

  it('benennt den größten Standby-Posten mit der eingegebenen Bezeichnung', () => {
    const tips = buildTips(PROFILE, {
      standby: result({
        id: 'standby',
        details: { avoidableCost: 42, dev0: 3, dev1: 12 },
        labels: { dev0: 'Router', dev1: 'Fernseher Wohnzimmer' },
      }),
    })
    const tip = tips.find((t) => t.id === 'standby')
    // Eigener Textschlüssel, weil der Standardtext den Gerätetyp übersetzt –
    // ein freier Name ist kein i18n-Schlüssel.
    expect(tip?.textId).toBe('standby_named')
    expect(tip?.params).toMatchObject({ deviceName: 'Fernseher Wohnzimmer', watts: 12 })
  })

  it('bleibt bei Altergebnissen ohne Bezeichnung beim Gerätetyp', () => {
    const tips = buildTips(PROFILE, {
      standby: result({ id: 'standby', details: { avoidableCost: 42, dev0_tv: 12 } }),
    })
    const tip = tips.find((t) => t.id === 'standby')
    expect(tip?.textId).toBeUndefined()
    expect(tip?.params).toMatchObject({ deviceType: 'tv', watts: 12 })
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

describe('buildTips – Herkunft der Empfehlung', () => {
  it('nennt Messung und Zeitpunkt, damit der Weg zurück begehbar ist', () => {
    const tips = buildTips(PROFILE, {
      standby: result({ id: 'standby', completedAt: '2026-08-20T10:00:00.000Z', details: { avoidableCost: 42 } }),
    })
    expect(tips[0].source).toEqual({
      measurementId: 'standby',
      measuredAt: '2026-08-20T10:00:00.000Z',
    })
  })

  it('nimmt bei Pro-Raum-Messungen die jüngste Ablesung', () => {
    // Das älteste Raum-Ergebnis liesse den Befund veralteter aussehen als er ist.
    const tips = buildTips(PROFILE, {
      'room_temperature@living_room#0': result({
        id: 'room_temperature',
        roomKey: 'living_room#0',
        completedAt: '2026-08-10T10:00:00.000Z',
        details: { temperature: 24, bandMin: 20, bandMax: 22 },
      }),
      'room_temperature@bedroom#0': result({
        id: 'room_temperature',
        roomKey: 'bedroom#0',
        completedAt: '2026-08-21T10:00:00.000Z',
        details: { temperature: 24, bandMin: 16, bandMax: 18 },
      }),
    })
    const warm = tips.find((t) => t.id === 'room_temperature')
    expect(warm?.source?.measuredAt).toBe('2026-08-21T10:00:00.000Z')
  })

  it('zeigt alle Raumklima-Befunde auf dieselbe Messung', () => {
    const tips = buildTips(PROFILE, {
      'room_temperature@living_room#0': result({
        id: 'room_temperature',
        roomKey: 'living_room#0',
        details: { temperature: 24, bandMin: 20, bandMax: 22, humidity: 70, draft: 1 },
      }),
    })
    const climate = tips.filter((t) => ['room_temperature', 'humidity_high', 'draft'].includes(t.id))
    expect(climate.length).toBe(3)
    for (const tip of climate) {
      expect(tip.source?.measurementId).toBe('room_temperature')
    }
  })

  it('lässt den Verbrauchstrend ohne Messbezug', () => {
    // Er stammt aus Zählerständen, nicht aus einer Messung – und taucht
    // deshalb auch im Bericht nicht unter einer Messung auf.
    const tips = buildTips(
      PROFILE,
      {},
      {
        readings: {
          electricity: [
            { id: 'a', date: '2024-08-01', value: 1000 },
            { id: 'b', date: '2025-08-01', value: 3000 },
            { id: 'c', date: '2026-08-01', value: 5600 },
          ],
        },
      },
    )
    const trend = tips.find((t) => t.id === 'consumption_up_electricity')
    expect(trend).toBeDefined()
    expect(trend?.source).toBeUndefined()
  })
})

describe('Ziele bestimmen die Reihenfolge – innerhalb der Gruppen', () => {
  /**
   * `goals` wurde seit jeher erhoben und nirgends gelesen. Jetzt wirkt die
   * Angabe – aber nur dort, wo sie etwas zu entscheiden hat: Der Vorrang der
   * Sofortmaßnahmen gilt unabhängig vom Ziel.
   */
  const withGoals = (goals: string[]) => ({ ...PROFILE, goals }) as unknown as OnboardingData

  /**
   * Zwei Sofortmaßnahmen – beide kostenlos, beide in Minuten erledigt. Genau
   * hier entscheidet das Ziel: Der Kühlschrank-Tipp trägt einen gemessenen
   * Euro-Betrag, der zu kalte Raum trägt keinen.
   */
  const MIXED: Record<string, MeasurementResult> = {
    fridge: result({
      id: 'fridge',
      details: { temperature: 3, yearlySaving: 40, savingEstimated: 0 },
    }),
    room_temperature: result({
      id: 'room_temperature',
      roomKey: 'bedroom#0',
      primaryValue: 15,
      unit: '°C',
      details: { temperature: 15 },
    }),
  }

  it('lässt die Reihenfolge ohne Ziel exakt wie bisher', () => {
    // Die eingeübte Anzeige darf sich nicht ändern, nur weil es die Ziel-Stufe
    // jetzt gibt.
    const ohne = buildTips(PROFILE, MIXED).map((t) => t.id)
    const kosten = buildTips(withGoals(['save_costs']), MIXED).map((t) => t.id)
    expect(kosten).toEqual(ohne)
    expect(ohne.indexOf('fridge')).toBeLessThan(ohne.indexOf('room_cold'))
  })

  it('stellt bei „Komfort" den Wärme-Tipp ohne €-Betrag nach vorn', () => {
    // Ein zu kalter Raum hat gar kein `savingEur` und stand in reiner
    // €-Sortierung hinten – ausgerechnet bei dem Nutzer, der die App wegen des
    // Komforts geöffnet hat.
    const ids = buildTips(withGoals(['improve_comfort']), MIXED).map((t) => t.id)
    expect(ids.indexOf('room_cold')).toBeLessThan(ids.indexOf('fridge'))
  })

  it('entscheidet zwischen zwei aufwendigen Tipps allein über das Ziel', () => {
    // Der bisherige Beleg vergleicht zwei Sofortmaßnahmen. Dort greift die
    // Ziel-Stufe zwar, aber nur innerhalb der vordersten Gruppe – ob sie auch
    // *hinter* den Sofortmaßnahmen wirkt, war unbelegt.
    //
    // Hier liegen beide Tipps in derselben Aufwandsklasse (keine
    // Sofortmaßnahme: Standby kostet 15 €, der Kessel 8.000 €), und der
    // Euro-Betrag spricht für Standby. Nur das CO₂-Ziel dreht die Reihenfolge,
    // weil Wärme dort schwerer wiegt (2) als Strom (1).
    const profile = {
      heatGenerators: ['gas_boiler'],
      heatGeneratorYears: { gas_boiler: new Date().getFullYear() - 30 },
    }
    const results: Record<string, MeasurementResult> = {
      standby: result({ id: 'standby', details: { avoidableCost: 90, dev0_tv: 12 } }),
    }

    const ohne = buildTips({ ...PROFILE, ...profile } as unknown as OnboardingData, results).map(
      (t) => t.id,
    )
    expect(ohne.indexOf('standby')).toBeLessThan(ohne.indexOf('old_boiler'))

    const mitZiel = buildTips(
      { ...withGoals(['reduce_co2']), ...profile } as unknown as OnboardingData,
      results,
    ).map((t) => t.id)
    expect(mitZiel.indexOf('old_boiler')).toBeLessThan(mitZiel.indexOf('standby'))
  })

  it('lässt Sofortmaßnahmen auch bei einem Ziel vorn', () => {
    // Der alte Kessel ist der größte Hebel und trägt beim CO₂-Ziel das höchste
    // Gewicht – und steht trotzdem hinter dem kostenlosen Zwei-Minuten-Tipp.
    const tips = buildTips(
      {
        ...withGoals(['reduce_co2']),
        heatGenerators: ['gas_boiler'],
        heatGeneratorYears: { gas_boiler: new Date().getFullYear() - 30 },
      } as unknown as OnboardingData,
      MIXED,
    )
    const ids = tips.map((t) => t.id)
    expect(ids).toContain('old_boiler')
    expect(ids.indexOf('fridge')).toBeLessThan(ids.indexOf('old_boiler'))
  })

  it('nennt nur Ziele, die wirklich etwas verändern', () => {
    // „Sortiert nach deinem Ziel: Kosten sparen" wäre eine Behauptung ohne
    // Deckung – für dieses Ziel ist die €-Sortierung die Voreinstellung.
    expect(sortingGoals(['save_costs', 'curiosity'])).toEqual([])
    expect(sortingGoals(['save_costs', 'improve_comfort'])).toEqual(['improve_comfort'])
  })
})

describe('Photovoltaik-Angabe', () => {
  // Die Frage „Gibt es eine PV-Anlage?" legte bisher nur den Erzeugungszähler
  // aufs Monitoring-Board. Sie beantwortete damit, wie viel erzeugt wird – nicht,
  // was man damit tun soll. „Geplant" hatte gar keine Folge.
  const withPv = (hasPV: 'yes' | 'no' | 'planned') =>
    ({ ...PROFILE, hasPV }) as unknown as OnboardingData

  it('rät bei vorhandener Anlage, große Verbraucher zu verschieben', () => {
    const tip = buildTips(withPv('yes'), {}).find((t) => t.id === 'pv_self_consumption')
    // Nichts zu kaufen, in Minuten getan: Der Tipp gehört zu den
    // Sofortmaßnahmen, nicht hinter eine Anschaffung.
    expect(tip?.costEur).toBe(0)
    expect(tip?.effortMinutes).toBeLessThanOrEqual(15)
  })

  it('führt bei geplanter Anlage in den Grundlast-Check', () => {
    const tip = buildTips(withPv('planned'), {}).find((t) => t.id === 'pv_planned_base_load')
    expect(tip?.linkTo).toBe('/measurements/base_load')
  })

  it('lässt den Grundlast-Rat weg, sobald die Grundlast gemessen ist', () => {
    // Sonst empfiehlt die App eine Messung, die schon im Profil steht.
    const tips = buildTips(withPv('planned'), {
      base_load: result({ id: 'base_load', rating: 'good', primaryValue: 90, unit: 'W' }),
    })
    expect(tips.map((t) => t.id)).not.toContain('pv_planned_base_load')
  })

  it('schweigt ohne Anlage – die Angabe „nein" ist keine Empfehlung', () => {
    const ids = buildTips(withPv('no'), {}).map((t) => t.id)
    expect(ids).not.toContain('pv_self_consumption')
    expect(ids).not.toContain('pv_planned_base_load')
  })

  it('verwechselt die beiden Fälle nicht', () => {
    // „Ja" bekommt den Verschiebe-Rat, „geplant" den Mess-Rat – nie umgekehrt.
    expect(buildTips(withPv('yes'), {}).map((t) => t.id)).not.toContain('pv_planned_base_load')
    expect(buildTips(withPv('planned'), {}).map((t) => t.id)).not.toContain(
      'pv_self_consumption',
    )
  })
})

describe('Kamin/Ofen', () => {
  it('ist keine Frage mehr – die Angabe trägt keinen Tipp', () => {
    // Festgehalten, damit die Angabe nicht unbemerkt wieder erhoben wird: Sie
    // verschob keine Rechnung, ihre gesamte Wirkung war eine Zeile im Bericht.
    const withFireplace = { ...PROFILE, hasExtraFireplace: true } as unknown as OnboardingData
    expect(buildTips(withFireplace, {})).toEqual([])
  })
})

describe('Jeder Tipp ist beschriftet', () => {
  // Der Anlass: Ein neuer Tipp mit `linkTo` ging ohne `action`-Text live und
  // zeigte dem Nutzer den rohen i18n-Schlüssel als Knopfbeschriftung. Titel und
  // Begründung fallen beim Testen auf – die Beschriftung eines Links erst, wenn
  // jemand genau diesen Tipp vor sich hat.
  const LOCALES = { de, en } as unknown as Record<string, Record<string, unknown>>

  function text(locale: Record<string, unknown>, textId: string, part: string): unknown {
    const items = (locale.tips as Record<string, Record<string, Record<string, unknown>>>).items
    return items?.[textId]?.[part]
  }

  /** Ein Profil und Ergebnisse, die möglichst viele Tipps auf einmal auslösen. */
  const RICH = {
    ...PROFILE,
    hasPV: 'yes',
    heatGenerators: ['gas_boiler'],
    heatGeneratorYears: { gas_boiler: new Date().getFullYear() - 30 },
  } as unknown as OnboardingData

  const CASES: OnboardingData[] = [
    RICH,
    { ...RICH, hasPV: 'planned' } as unknown as OnboardingData,
    { ...RICH, hotWaterType: 'separate_system' } as unknown as OnboardingData,
  ]

  it('hat zu jedem Tipp Titel und Begründung in beiden Sprachen', () => {
    const fehlend: string[] = []
    for (const profile of CASES) {
      for (const tip of buildTips(profile, {})) {
        const textId = tip.textId ?? tip.id
        for (const [name, locale] of Object.entries(LOCALES)) {
          for (const part of ['title', 'reason']) {
            if (typeof text(locale, textId, part) !== 'string') {
              fehlend.push(`${name}: tips.items.${textId}.${part}`)
            }
          }
        }
      }
    }
    expect([...new Set(fehlend)]).toEqual([])
  })

  it('beschriftet jeden Tipp, der irgendwohin führt', () => {
    const fehlend: string[] = []
    let geprueft = 0
    for (const profile of CASES) {
      for (const tip of buildTips(profile, {})) {
        if (!tip.linkTo) continue
        geprueft++
        const textId = tip.textId ?? tip.id
        for (const [name, locale] of Object.entries(LOCALES)) {
          if (typeof text(locale, textId, 'action') !== 'string') {
            fehlend.push(`${name}: tips.items.${textId}.action`)
          }
        }
      }
    }
    expect([...new Set(fehlend)]).toEqual([])
    // Ohne diese Zeile wäre der Test still grün, sobald kein Fall mehr einen
    // verlinkten Tipp erzeugt – und würde genau den Fehler durchlassen, für den
    // er geschrieben wurde.
    expect(geprueft).toBeGreaterThan(0)
  })
})

describe('Warmwasser-Quelle', () => {
  // Die Frage nach der Warmwasserbereitung war nie folgenlos – sie setzt den
  // €/kWh-Preis des Duschkopf-Checks. Sichtbar war das nur nicht: ein
  // vorausgewähltes Chip mitten im Check. Der Tipp zieht die Folgerung, die
  // vorher niemand zog.
  const withHotWater = (hotWaterType: string) =>
    ({ ...PROFILE, hotWaterType }) as unknown as OnboardingData

  it('führt bei eigenem Warmwassergerät in den Duschkopf-Test', () => {
    const tip = buildTips(withHotWater('separate_system'), {}).find(
      (t) => t.id === 'hot_water_electric',
    )
    expect(tip?.linkTo).toBe('/measurements/showerhead')
    expect(tip?.costEur).toBe(0)
  })

  it('tritt ab, sobald der Duschkopf gemessen ist', () => {
    // Sonst stünde neben dem gemessenen Ergebnis noch die Empfehlung, es zu
    // messen.
    const tips = buildTips(withHotWater('separate_system'), {
      showerhead: result({ id: 'showerhead', rating: 'good', primaryValue: 7, unit: 'L/min' }),
    })
    expect(tips.map((t) => t.id)).not.toContain('hot_water_electric')
  })

  it('schweigt bei Warmwasser über die Heizung', () => {
    for (const type of ['same_as_heating', 'partially_combined', 'unknown']) {
      expect(buildTips(withHotWater(type), {}).map((t) => t.id)).not.toContain(
        'hot_water_electric',
      )
    }
  })
})
