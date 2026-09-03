// Ein Ergebnis je Gerät.
//
// `measurementProgress` gab für alles ohne `perRoom` stumpf { done: 1, total: 1 }
// zurück, sobald irgendein Ergebnis existierte. Vier Geräte, eine Messung – und
// der Fortschritt meldete „fertig". Das zweite Gerät überschrieb das erste,
// ohne Warnung.
//
// `progress.ts` ist die eine Stelle, an der „wie viele Checks sind erledigt?"
// beantwortet wird; Ring, Zuhause-Karte und Gewerke-Kacheln hängen alle daran.
// Deshalb sind die Fälle hier einzeln festgehalten.

import { describe, expect, it } from 'vitest'
import {
  applianceResult,
  catalogProgress,
  isMeasurementDone,
  measurementProgress,
  type Results,
} from '@/features/measurements/progress'
import { getMeasurementMeta } from '@/features/measurements/catalog'
import { applianceLabel } from '@/features/measurements/applianceLabel'
import type { ApplianceEntry, RoomEntry } from '@/types'
import type { MeasurementResult } from '@/features/measurements/types'
import type { TFunction } from 'i18next'

const FRIDGE = getMeasurementMeta('fridge')!
const FREEZER = getMeasurementMeta('freezer')!

const ergebnis = (id: string): MeasurementResult => ({
  id,
  rating: 'good',
  primaryValue: 6,
  unit: '°C',
  completedAt: '2026-09-03T10:00:00.000Z',
})

const geraet = (id: string, kind: ApplianceEntry['kind'] = 'fridge', room?: ApplianceEntry['room']) =>
  ({ id, kind, room }) as ApplianceEntry

describe('Fortschritt je Gerät', () => {
  const zwei = [geraet('fridge-a'), geraet('fridge-b')]

  it('zählt zwei Geräte als zwei, nicht als eins', () => {
    expect(measurementProgress({}, FRIDGE, [], zwei)).toEqual({ done: 0, total: 2 })
  })

  it('zeigt nach einer von zwei Messungen einen echten Zwischenstand', () => {
    const results: Results = { 'fridge@fridge-a': ergebnis('fridge') }
    expect(measurementProgress(results, FRIDGE, [], zwei)).toEqual({ done: 1, total: 2 })
    expect(isMeasurementDone(results, FRIDGE, [], zwei)).toBe(false)
  })

  it('gilt erst mit dem letzten Gerät als erledigt', () => {
    const results: Results = {
      'fridge@fridge-a': ergebnis('fridge'),
      'fridge@fridge-b': ergebnis('fridge'),
    }
    expect(isMeasurementDone(results, FRIDGE, [], zwei)).toBe(true)
  })

  it('verhält sich bei genau einem Gerät wie vorher', () => {
    const eins = [geraet('fridge-a')]
    expect(measurementProgress({}, FRIDGE, [], eins)).toEqual({ done: 0, total: 1 })
    expect(
      measurementProgress({ 'fridge@fridge-a': ergebnis('fridge') }, FRIDGE, [], eins),
    ).toEqual({ done: 1, total: 1 })
  })

  it('verhält sich ohne Geräteangabe wie vorher', () => {
    // Die Gerätefrage ist noch offen: ein Ergebnis, ein Nenner.
    expect(measurementProgress({}, FRIDGE, [], [])).toEqual({ done: 0, total: 1 })
    expect(measurementProgress({ fridge: ergebnis('fridge') }, FRIDGE, [], [])).toEqual({
      done: 1,
      total: 1,
    })
  })

  it('zählt ein Kombigerät in beiden Checks', () => {
    const kombi = [geraet('kombi', 'fridge_freezer')]
    expect(measurementProgress({}, FRIDGE, [], kombi).total).toBe(1)
    expect(measurementProgress({}, FREEZER, [], kombi).total).toBe(1)
  })
})

// Gespeicherte Ergebnisse werden nicht umgeschrieben, sondern gefunden.
describe('Altergebnisse', () => {
  it('zählen für das erste Gerät ihrer Art', () => {
    const results: Results = { fridge: ergebnis('fridge') }
    const zwei = [geraet('fridge-a'), geraet('fridge-b')]
    expect(applianceResult(results, 'fridge', 'fridge-a', true)).toBeDefined()
    expect(measurementProgress(results, FRIDGE, [], zwei)).toEqual({ done: 1, total: 2 })
  })

  it('zählen nicht doppelt', () => {
    // Sonst erbten zwei Kühlschränke dasselbe Altergebnis und der Fortschritt
    // meldete eine Messung, die es nur einmal gab.
    const results: Results = { fridge: ergebnis('fridge') }
    expect(applianceResult(results, 'fridge', 'fridge-b', false)).toBeUndefined()
  })

  it('weichen dem neuen Schlüssel, sobald neu gemessen wurde', () => {
    const alt = ergebnis('fridge')
    const neu = { ...ergebnis('fridge'), primaryValue: 4 }
    const results: Results = { fridge: alt, 'fridge@fridge-a': neu }
    expect(applianceResult(results, 'fridge', 'fridge-a', true)?.primaryValue).toBe(4)
  })

  it('lassen einen Bestandsnutzer sein Ergebnis behalten', () => {
    // Ein Gerät, ein Altergebnis: unverändert „gemessen", nicht „noch offen".
    const results: Results = { freezer: ergebnis('freezer') }
    const eins = [geraet('freezer', 'freezer')]
    expect(isMeasurementDone(results, FREEZER, [], eins)).toBe(true)
  })
})

describe('Katalog-Fortschritt', () => {
  const rooms: RoomEntry[] = []

  it('meldet den Geräte-Check erst als fertig, wenn alle Geräte gemessen sind', () => {
    const zwei = [geraet('fridge-a'), geraet('fridge-b'), geraet('gefrier', 'freezer')]
    const halb: Results = { 'fridge@fridge-a': ergebnis('fridge') }
    const ohne = catalogProgress({}, rooms, [], zwei)
    const mit = catalogProgress(halb, rooms, [], zwei)
    // Eine von zwei Kühlschrank-Messungen macht den Check nicht fertig.
    expect(mit.done).toBe(ohne.done)
    expect(mit.total).toBe(ohne.total)
  })
})

describe('Beschriftung der Geräte', () => {
  const t = ((key: string) => key) as unknown as TFunction

  it('nimmt den eigenen Namen, wenn es einen gibt', () => {
    const mit = { ...geraet('a'), name: 'Getränke' }
    expect(applianceLabel(t, mit, [mit])).toBe('Getränke')
  })

  it('benennt sonst über den Raum', () => {
    const mit = geraet('a', 'fridge', 'basement')
    expect(applianceLabel(t, mit, [mit])).toContain('basement')
  })

  it('nummeriert erst, wenn zwei gleichartige ohne Raum dastehen', () => {
    const eins = geraet('a')
    expect(applianceLabel(t, eins, [eins])).not.toMatch(/1$/)
    const zwei = [geraet('a'), geraet('b')]
    expect(applianceLabel(t, zwei[1], zwei)).toMatch(/2$/)
  })
})
