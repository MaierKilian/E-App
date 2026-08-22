// Prüfungen am LED-Check.
//
// Der Check hatte zuvor Lampen je Typ gezählt, die Brenndauer abgefragt und
// daraus einen Euro-Betrag gerechnet – aus lauter Konstanten und zwei
// geschätzten Eingaben. Heute erhebt er nur, was der Nutzer wirklich weiß: in
// welchen Räumen noch alte Lampen hängen. Diese Tests sichern, dass die
// Reihenfolge des Tauschs aus dem Raumtyp folgt, dass Altdaten der früheren
// Fassung erkannt werden – und dass zu jedem Zustand die Texte existieren.

import { describe, expect, it } from 'vitest'
import {
  ROOM_PRIORITY,
  isCurrentLightingResult,
  lightingDetails,
  openRoomKeys,
  rankOpenRooms,
  rateLighting,
  roomPriority,
  type RoomLampState,
} from '@/features/measurements/lighting/lighting'
import { roomInstances } from '@/features/measurements/rooms'
import {
  formatResultValue,
  hasWordUnit,
  resultUnitLabel,
} from '@/features/measurements/resultValue'
import { localizeParams } from '@/features/tips/tipsForReport'
import type { RoomEntry, RoomType } from '@/types'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'

const ROOMS: RoomEntry[] = [
  { type: 'living_room', count: 1, heatTransfer: 'radiator' },
  { type: 'kitchen', count: 1, heatTransfer: 'radiator' },
  { type: 'bedroom', count: 2, heatTransfer: 'radiator' },
  { type: 'basement', count: 1, heatTransfer: 'radiator' },
]
const INSTANCES = roomInstances(ROOMS)

describe('lightingDetails / openRoomKeys', () => {
  it('haelt die Antworten je Raum fest und zaehlt sie zusammen', () => {
    const answers: Partial<Record<string, RoomLampState>> = {
      'living_room#0': 'old',
      'kitchen#0': 'old',
      'bedroom#0': 'led',
    }
    const details = lightingDetails(answers)
    expect(details.checkedRooms).toBe(3)
    expect(details.openRooms).toBe(2)
    expect(openRoomKeys(details).sort()).toEqual(['kitchen#0', 'living_room#0'])
  })

  it('ignoriert unbeantwortete Raeume, statt sie als erledigt zu zaehlen', () => {
    const details = lightingDetails({ 'living_room#0': 'old', 'basement#0': undefined })
    expect(details.checkedRooms).toBe(1)
    expect(details.openRooms).toBe(1)
  })

  it('kommt mit leeren Antworten klar', () => {
    const details = lightingDetails({})
    expect(details.checkedRooms).toBe(0)
    expect(details.openRooms).toBe(0)
    expect(openRoomKeys(details)).toEqual([])
    expect(openRoomKeys(undefined)).toEqual([])
  })
})

describe('Reihenfolge des Tauschs', () => {
  it('folgt dem Raumtyp – ganz ohne Eingabe des Nutzers', () => {
    const ranked = rankOpenRooms(INSTANCES, ['basement#0', 'bedroom#1', 'kitchen#0'])
    expect(ranked.map((r) => r.key)).toEqual(['kitchen#0', 'bedroom#1', 'basement#0'])
  })

  it('nennt nur Raeume, die auch als offen gemeldet wurden', () => {
    const ranked = rankOpenRooms(INSTANCES, ['kitchen#0'])
    expect(ranked).toHaveLength(1)
    expect(ranked[0].type).toBe('kitchen')
  })

  it('ignoriert Schluessel, die es im Profil nicht gibt', () => {
    expect(rankOpenRooms(INSTANCES, ['attic#3'])).toEqual([])
  })

  it('kennt jeden Raumtyp mit einer Prioritaet', () => {
    for (const type of Object.keys(ROOM_PRIORITY) as RoomType[]) {
      expect(roomPriority(type)).toBeGreaterThanOrEqual(1)
      expect(roomPriority(type)).toBeLessThanOrEqual(3)
    }
  })

  it('gewichtet Wohnraeume hoeher als Nebenraeume', () => {
    expect(roomPriority('living_room')).toBeGreaterThan(roomPriority('basement'))
    expect(roomPriority('kitchen')).toBeGreaterThan(roomPriority('staircase'))
  })
})

describe('rateLighting', () => {
  it('meldet einen fertigen Zustand, wenn nichts offen ist', () => {
    expect(rateLighting(INSTANCES, [])).toBe('good')
  })

  it('waegt nach Gewicht, nicht nach blosser Anzahl', () => {
    expect(rateLighting(INSTANCES, ['basement#0'])).toBe('medium')
    expect(rateLighting(INSTANCES, ['living_room#0', 'kitchen#0'])).toBe('high')
  })

  it('steigt monoton, wenn Raeume hinzukommen', () => {
    const order = ['good', 'medium', 'elevated', 'high']
    const steps = [
      rateLighting(INSTANCES, []),
      rateLighting(INSTANCES, ['basement#0']),
      rateLighting(INSTANCES, ['basement#0', 'bedroom#0']),
      rateLighting(INSTANCES, ['basement#0', 'bedroom#0', 'kitchen#0', 'living_room#0']),
    ]
    for (let i = 1; i < steps.length; i++) {
      expect(order.indexOf(steps[i])).toBeGreaterThanOrEqual(order.indexOf(steps[i - 1]))
    }
  })
})

describe('Altdaten der frueheren Zaehl-Fassung', () => {
  it('werden als nicht mehr gueltig erkannt', () => {
    // So sahen die Details damals aus – kein checkedRooms.
    expect(isCurrentLightingResult({ totalBulbs: 3, yearlySaving: 61 })).toBe(false)
    expect(isCurrentLightingResult(undefined)).toBe(false)
  })

  it('lassen ein aktuelles Ergebnis unangetastet', () => {
    expect(isCurrentLightingResult(lightingDetails({ 'kitchen#0': 'led' }))).toBe(true)
  })
})

describe('Plural-Interpolation der Empfehlung', () => {
  it('laesst count eine Zahl – sonst waehlt i18next keine Pluralform', () => {
    // localizeParams lokalisiert Zahlen fuer die Anzeige. Als String faellt die
    // Pluralwahl aus und i18next gibt statt des Satzes den rohen Schluessel aus.
    const params = localizeParams({ count: 3, watts: 1234.5 }, 'de')
    expect(params.count).toBe(3)
    expect(typeof params.count).toBe('number')
    // Andere Zahlen werden weiterhin lokalisiert.
    expect(params.watts).toBe('1.234,5')
  })
})

describe('Texte', () => {
  const RUN_KEYS = [
    'leadTitle',
    'lead',
    'helpButton',
    'helpTitle',
    'roomsTitle',
    'roomsHint',
    'progress',
  ]
  const RESULT_KEYS = [
    'badge',
    'summary_one',
    'summary_other',
    'worthButton',
    'worthTitle',
    'worth',
    'doneBadge',
    'doneSummary_one',
    'doneSummary_other',
    'doneTip',
  ]

  for (const [name, dict] of [
    ['de', de],
    ['en', en],
  ] as const) {
    it(`hat alle Schluessel in ${name}`, () => {
      const lighting = dict.measurements.lighting as Record<string, unknown>
      expect(lighting.unit_one).toBeTruthy()
      expect(lighting.unit_other).toBeTruthy()

      const run = lighting.run as Record<string, unknown>
      const result = lighting.result as Record<string, unknown>
      for (const key of RUN_KEYS) expect(run[key], `run.${key}`).toBeTruthy()
      for (const key of RESULT_KEYS) expect(result[key], `result.${key}`).toBeTruthy()

      const answers = run.answers as Record<string, string>
      for (const state of ['old', 'led']) expect(answers[state]).toBeTruthy()

      // Zu jeder Prioritaetsstufe gehoert eine Beschriftung im Ergebnis.
      const priority = result.priority as Record<string, string>
      for (const level of new Set(Object.values(ROOM_PRIORITY))) {
        expect(priority[String(level)], `priority.${level}`).toBeTruthy()
      }

      expect(Array.isArray(run.helpItems)).toBe(true)

      // Die Empfehlung nennt Raeume statt eines Euro-Betrags.
      // Der Satz nennt den Raum als Ortsangabe („in der Küche"), nicht als
      // blossen Namen – sonst entsteht „Fang im Küche an".
      expect(result.summary_other).toContain('{{room}}')
      const locative = dict.onboarding.step3.roomTypesIn as Record<string, string>
      for (const type of Object.keys(ROOM_PRIORITY)) {
        expect(locative[type], `roomTypesIn.${type}`).toBeTruthy()
      }

      const tip = dict.tips.items.lighting as Record<string, string>
      expect(tip.title).toBeTruthy()
      expect(tip.reason_one).toBeTruthy()
      expect(tip.reason_other).toContain('{{count}}')
    })
  }
})

describe('Anzeige des Hauptwerts', () => {
  const result = {
    id: 'lighting' as const,
    rating: 'high' as const,
    primaryValue: 5,
    unit: '',
    completedAt: '2026-01-01T00:00:00.000Z',
  }

  it('haengt an ganze Zahlen kein „,0"', () => {
    // „5,0 Räume" behauptet eine Genauigkeit, die eine Anzahl nicht hat.
    expect(formatResultValue(5, 'de')).toBe('5')
    expect(formatResultValue(132, 'de')).toBe('132')
  })

  it('laesst gebrochene Werte ihre Stelle behalten', () => {
    expect(formatResultValue(11.4, 'de')).toBe('11,4')
  })

  it('loest die Wort-Einheit mit Anzahl auf, statt den Schluessel zu zeigen', () => {
    // Ohne count kann i18next keine Pluralform waehlen und gibt den rohen
    // Schluessel aus – genau das stand vorher in der Kachel.
    expect(hasWordUnit('lighting')).toBe(true)
    expect(hasWordUnit('base_load')).toBe(false)
    const t = ((key: string, opts?: { count?: number }) =>
      opts?.count === 1 ? 'Raum' : 'Räume') as unknown as Parameters<typeof resultUnitLabel>[0]
    expect(resultUnitLabel(t, result)).toBe('Räume')
    expect(resultUnitLabel(t, { ...result, primaryValue: 1 })).toBe('Raum')
  })

  it('ignoriert eine gespeicherte Wort-Einheit aus aelteren Daten', () => {
    const t = (() => 'Räume') as unknown as Parameters<typeof resultUnitLabel>[0]
    const legacy = { ...result, unit: 'measurements.lighting.unit' }
    expect(resultUnitLabel(t, legacy)).toBe('Räume')
  })
})
