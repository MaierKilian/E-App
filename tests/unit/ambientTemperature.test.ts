// Die erste Verbindung zwischen zwei Checks: Der Geräte-Check benutzt die
// Temperatur, die der Raumklima-Check im selben Raum gemessen hat.
//
// Der Standort eines Geräts wurde bis September 2026 erfasst und ausschließlich
// zur Vorauswahl im Check gelesen. Er bewertete nichts und benannte nichts.

import { describe, expect, it } from 'vitest'
import {
  AMBIENT_COLD_MIN_C,
  AMBIENT_WARM_MIN_C,
  ambientFor,
  ambientNote,
} from '@/features/measurements/ambientTemperature'
import { COMFORT_BANDS, DEFAULT_COMFORT_BAND } from '@/features/measurements/room_temperature/roomClimate'
import type { MeasurementResult } from '@/features/measurements/types'

const klima = (celsius: number, at = '2026-09-01T10:00:00.000Z'): MeasurementResult => ({
  id: 'room_temperature',
  rating: 'good',
  primaryValue: celsius,
  unit: '°C',
  completedAt: at,
})

const mitte = (min: number, max: number) => (min + max) / 2

describe('Umgebungstemperatur eines Geräts', () => {
  it('nimmt die gemessene Kellertemperatur, wenn es eine gibt', () => {
    const ambient = ambientFor({ 'room_temperature@basement#0': klima(14) }, { room: 'basement' })
    expect(ambient).toEqual({ celsius: 14, measured: true, room: 'basement' })
  })

  it('fällt ohne Messung auf das Komfortband des Raums zurück', () => {
    const ambient = ambientFor({}, { room: 'basement' })
    expect(ambient.measured).toBe(false)
    expect(ambient.celsius).toBe(mitte(COMFORT_BANDS.basement.min, COMFORT_BANDS.basement.max))
  })

  it('macht keinen Check zur Voraussetzung eines anderen', () => {
    // Eine Raumklima-Messung in einem *anderen* Raum zählt nicht.
    const ambient = ambientFor({ 'room_temperature@kitchen#0': klima(21) }, { room: 'basement' })
    expect(ambient.measured).toBe(false)
  })

  it('funktioniert für ein Gerät ohne Raumangabe vollständig', () => {
    const ambient = ambientFor({}, { room: undefined })
    expect(ambient.measured).toBe(false)
    expect(ambient.room).toBeUndefined()
    expect(ambient.celsius).toBe(mitte(DEFAULT_COMFORT_BAND.min, DEFAULT_COMFORT_BAND.max))
    expect(ambientFor({}, undefined).celsius).toBe(ambient.celsius)
  })

  it('nimmt bei mehreren gleichartigen Räumen die jüngste Messung', () => {
    const ambient = ambientFor(
      {
        'room_temperature@basement#0': klima(14, '2026-01-01T10:00:00.000Z'),
        'room_temperature@basement#1': klima(18, '2026-08-01T10:00:00.000Z'),
      },
      { room: 'basement' },
    )
    expect(ambient.celsius).toBe(18)
  })

  it('ignoriert unbrauchbare Messwerte', () => {
    const kaputt = { ...klima(0), primaryValue: NaN }
    const ambient = ambientFor({ 'room_temperature@basement#0': kaputt }, { room: 'basement' })
    expect(ambient.measured).toBe(false)
  })
})

describe('Was der Standort bedeutet', () => {
  it('nennt einen kalten Keller als eigenen Fall', () => {
    // Unter der Klimaklassen-Grenze schaltet der Thermostat älterer Geräte
    // womöglich nicht mehr richtig – die Truhe taut im Winter an.
    expect(ambientNote(AMBIENT_COLD_MIN_C - 1)).toBe('cold')
    expect(ambientNote(AMBIENT_COLD_MIN_C)).toBe('moderate')
  })

  it('nennt eine warme Umgebung als eigenen Fall', () => {
    expect(ambientNote(AMBIENT_WARM_MIN_C)).toBe('warm')
    expect(ambientNote(AMBIENT_WARM_MIN_C - 1)).toBe('moderate')
  })

  it('lässt dazwischen alles unbeanstandet', () => {
    expect(ambientNote(16)).toBe('moderate')
  })
})
