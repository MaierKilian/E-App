// Die fünf Wärmeübergaben: eigene Fragensätze, Texte, und "unbeheizt" nimmt
// den Möbelabstand-Check aus dem Raum.
import { describe, expect, it } from 'vitest'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'
import {
  questionKeys,
  decodeTransfer,
  TRANSFER_CODES,
  INFRARED_KEYS,
  STOVE_KEYS,
  RADIATOR_KEYS,
  UNDERFLOOR_KEYS,
  ALL_FINDING_KEYS,
} from '@/features/measurements/furniture_spacing/furnitureSpacing'
import { appliesToRoom, roomsForMeasurement, getMeasurementMeta } from '@/features/measurements/catalog'
import { measurementProgress, countableMeasurements } from '@/features/measurements/progress'
import { roomInstances } from '@/features/measurements/rooms'
import { room } from '../roomFixture'
import type { HeatTransferType, RoomEntry } from '@/types'

const ALL: HeatTransferType[] = ['radiator', 'underfloor', 'infrared', 'stove', 'none']
const furniture = getMeasurementMeta('furniture_spacing')!
const roomTemp = getMeasurementMeta('room_temperature')!

describe('Fragensätze je Wärmeübergabe', () => {
  it('gibt jeder Bauart einen eigenen Satz', () => {
    expect(questionKeys('radiator')).toEqual(RADIATOR_KEYS)
    expect(questionKeys('underfloor')).toEqual(UNDERFLOOR_KEYS)
    expect(questionKeys('infrared')).toEqual(INFRARED_KEYS)
    expect(questionKeys('stove')).toEqual(STOVE_KEYS)
  })

  it('fragt in einem unbeheizten Raum gar nichts', () => {
    // Wo nichts heizt, gibt es nichts freizuhalten.
    expect(questionKeys('none')).toEqual([])
    expect(questionKeys('none', 'basement')).toEqual([])
  })

  it('überschneidet die Sätze nicht – jeder Befund gehört zu genau einer Bauart', () => {
    const sets = [RADIATOR_KEYS, UNDERFLOOR_KEYS, INFRARED_KEYS, STOVE_KEYS]
    const all = sets.flat()
    expect(new Set(all).size).toBe(all.length)
  })

  it('führt jeden neuen Befund in ALL_FINDING_KEYS', () => {
    // Sonst liest die Ergebnis-Ansicht ihn nicht aus den Details zurück.
    for (const key of [...INFRARED_KEYS, ...STOVE_KEYS]) {
      expect(ALL_FINDING_KEYS, key).toContain(key)
    }
  })
})

describe('Wärmeübergabe im gespeicherten Ergebnis', () => {
  it('liest das neue Format', () => {
    for (const transfer of ALL) {
      expect(decodeTransfer({ transfer: TRANSFER_CODES[transfer] })).toBe(transfer)
    }
  })

  it('liest Altergebnisse, die nur underfloor kannten', () => {
    // Gespeicherte Ergebnisse werden nie migriert (CLAUDE.md).
    expect(decodeTransfer({ underfloor: 1 })).toBe('underfloor')
    expect(decodeTransfer({ underfloor: 0 })).toBe('radiator')
    expect(decodeTransfer(undefined)).toBe('radiator')
  })

  it('vergibt jeden Code genau einmal', () => {
    const codes = Object.values(TRANSFER_CODES)
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('Unbeheizte Räume', () => {
  const heated = { type: 'basement' as const, heatTransfer: 'radiator' as const }
  const unheated = { type: 'basement' as const, heatTransfer: 'none' as const }

  it('nimmt den Möbelabstand-Check aus dem Raum', () => {
    expect(appliesToRoom(furniture, heated)).toBe(true)
    expect(appliesToRoom(furniture, unheated)).toBe(false)
  })

  it('lässt das Raumklima dort weiter messen', () => {
    // Die Temperatur eines unbeheizten Kellers ist gerade die interessante –
    // sie trägt die Taupunkt-Rechnung.
    expect(appliesToRoom(roomTemp, unheated)).toBe(true)
  })

  it('nimmt ihn aus Zähler und Nenner des Fortschritts', () => {
    const rooms: RoomEntry[] = [
      { type: 'living_room', instances: [{ id: 'living_room#0', heatTransfer: 'radiator' }] },
      { type: 'basement', instances: [{ id: 'basement#0', heatTransfer: 'none' }] },
    ]
    const instances = roomInstances(rooms)
    // Ohne den Riegel stünde der Check im Keller als offene Aufgabe, die
    // niemand erledigen kann – der Ring käme nie auf 100 %.
    expect(measurementProgress({}, furniture, instances).total).toBe(1)
    expect(measurementProgress({}, roomTemp, instances).total).toBe(2)
  })

  it('lässt den Check ganz weg, wenn ALLE Räume unbeheizt sind', () => {
    const rooms: RoomEntry[] = [
      { type: 'basement', instances: [{ id: 'basement#0', heatTransfer: 'none' }] },
    ]
    const ids = countableMeasurements(roomInstances(rooms)).map((m) => m.id)
    expect(ids).not.toContain('furniture_spacing')
    expect(ids).toContain('room_temperature')
  })

  it('zählt einen Raum ohne Antwort weiter mit', () => {
    // „Noch nicht beantwortet" ist nicht „unbeheizt" – der Check fragt dann
    // selbst nach.
    expect(roomsForMeasurement(furniture, roomInstances([room('bedroom')]))).toHaveLength(1)
  })
})

describe('Texte für alle fünf Bauarten', () => {
  for (const [locale, dict] of [['de', de], ['en', en]] as const) {
    const step5 = dict.onboarding.step5 as Record<string, string>
    const fs = dict.measurements.furniture_spacing as unknown as {
      run: { headings: Record<string, string>; questions: Record<string, string> }
      result: { mechanisms: Record<string, string>; findings: Record<string, Record<string, string>> }
    }

    it(`benennt in ${locale} jede Bauart lang und kurz`, () => {
      for (const transfer of ALL) {
        expect(step5[transfer], `${locale}/${transfer}`).toBeTruthy()
        expect(step5[`${transfer}Short`], `${locale}/${transfer}Short`).toBeTruthy()
      }
    })

    it(`hat in ${locale} Überschrift und Erklärtext je Bauart`, () => {
      for (const transfer of ALL) {
        expect(fs.run.headings[transfer], `${locale}/${transfer}`).toBeTruthy()
        expect(fs.result.mechanisms[transfer], `${locale}/${transfer}`).toBeTruthy()
      }
    })

    it(`hat in ${locale} Frage und Befundtexte zu jedem neuen Befund`, () => {
      for (const key of [...INFRARED_KEYS, ...STOVE_KEYS]) {
        expect(fs.run.questions[key], `${locale}/${key}`).toBeTruthy()
        const finding = fs.result.findings[key]
        expect(finding, `${locale}/${key}`).toBeTruthy()
        for (const field of ['partly', 'yes', 'why', 'action']) {
          expect(finding[field], `${locale}/${key}/${field}`).toBeTruthy()
        }
      }
    })

    it(`kennt in ${locale} den Direktstrom-Erzeuger`, () => {
      const generators = dict.onboarding.step4.generators as Record<string, string>
      expect(generators.electric_direct, locale).toBeTruthy()
    })
  }
})
